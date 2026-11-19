/**
 * Hierarchical Tree Engine (Phase 5 - Batch 5D)
 *
 * Implements parent-child tree hierarchy, circular reference prevention,
 * group vs leaf validation, child deletion guards, and tree query traversal
 * for tree DocTypes (e.g. Item Group, Customer Group, Supplier Group, Territory, Warehouse).
 */

import { HttpError } from '../utils/http.js'
import { validId } from './fields.js'

export function getTreeFields(spec) {
  if (!spec?.tree) return null
  const parentField = spec.treeParentField || `parent_${spec.name.toLowerCase().replace(/ /g, '_')}`
  const groupField = spec.treeGroupField || 'is_group'
  return { parentField, groupField }
}

/**
 * Validates tree hierarchy rules on document create or update.
 */
export async function validateTreeMutation(spec, inputFields, existingRecord, req) {
  const treeConfig = getTreeFields(spec)
  if (!treeConfig) return

  const { parentField, groupField } = treeConfig
  const newParent = inputFields[parentField]
  const isGroup = inputFields[groupField] !== undefined ? Boolean(inputFields[groupField]) : existingRecord?.fields?.[groupField]

  // A record cannot be its own parent
  if (existingRecord && newParent && String(newParent) === String(existingRecord._id)) {
    throw new HttpError(422, 'INVALID_TREE_PARENT', 'A tree node cannot be its own parent.')
  }

  // If a parent is specified, validate it exists, is in scope, is a group, and is not a descendant
  if (newParent && validId(String(newParent))) {
    const parentDoc = await req.model.findOne({
      _id: String(newParent),
      ...(spec.scope === 'company' ? { company: req.company._id } : {}),
    }).lean()

    if (!parentDoc) {
      throw new HttpError(422, 'INVALID_TREE_PARENT', 'The selected parent node does not exist or belongs to another company.')
    }

    // Parent must be a group
    if (!parentDoc.fields?.[groupField]) {
      throw new HttpError(422, 'INVALID_TREE_PARENT', 'The parent node must be a group node.')
    }

    // Circular ancestor check: traverse upwards from parentDoc to ensure existingRecord is not in ancestor chain
    if (existingRecord) {
      let currentParentId = parentDoc.fields?.[parentField]
      const visited = new Set([String(parentDoc._id)])

      while (currentParentId) {
        const idStr = String(currentParentId)
        if (!validId(idStr)) break

        if (idStr === String(existingRecord._id)) {
          throw new HttpError(422, 'CIRCULAR_TREE_RELATION', 'Circular parent relationship detected: a node cannot have its own descendant as a parent.')
        }
        if (visited.has(idStr)) {
          throw new HttpError(422, 'CIRCULAR_TREE_RELATION', 'Circular tree structure detected in database ancestors.')
        }
        visited.add(idStr)

        const ancestor = await req.model.findOne({
          _id: idStr,
          ...(spec.scope === 'company' ? { company: req.company._id } : {}),
        }).select(`fields.${parentField}`).lean()

        currentParentId = ancestor?.fields?.[parentField]
      }
    }
  }

  // If an existing group node is being changed to a leaf node, ensure it has no existing children
  if (existingRecord && existingRecord.fields?.[groupField] && isGroup === false) {
    const childCount = await req.model.countDocuments({
      [`fields.${parentField}`]: existingRecord._id,
      ...(spec.scope === 'company' ? { company: req.company._id } : {}),
    })
    if (childCount > 0) {
      throw new HttpError(422, 'GROUP_HAS_CHILDREN', 'Cannot convert a group node with children into a leaf node. Reparent or remove children first.')
    }
  }
}

/**
 * Validates deletion of a tree node: blocks deletion if node has children.
 */
export async function validateTreeDeletion(spec, recordId, req) {
  const treeConfig = getTreeFields(spec)
  if (!treeConfig) return

  const { parentField } = treeConfig
  const childCount = await req.model.countDocuments({
    [`fields.${parentField}`]: recordId,
    ...(spec.scope === 'company' ? { company: req.company._id } : {}),
  })

  if (childCount > 0) {
    throw new HttpError(409, 'NODE_HAS_CHILDREN', `Cannot delete this ${spec.name} because it has ${childCount} child node(s). Delete or reparent its children first.`)
  }
}

/**
 * Retrieves the complete tree hierarchy for a tree DocType.
 */
export async function getTreeNodes(spec, req) {
  const treeConfig = getTreeFields(spec)
  if (!treeConfig) {
    throw new HttpError(400, 'NOT_A_TREE', `${spec.name} is not configured as a tree structure.`)
  }

  const { parentField, groupField } = treeConfig
  const rows = await req.model.find(
    spec.scope === 'company' ? { company: req.company._id } : {}
  ).lean()

  const parentIdSet = new Set()
  for (const row of rows) {
    const p = row.fields?.[parentField]
    if (p) parentIdSet.add(String(p))
  }

  return rows.map(row => ({
    id: String(row._id),
    name: row.name,
    parent: row.fields?.[parentField] ? String(row.fields[parentField]) : null,
    isGroup: Boolean(row.fields?.[groupField]),
    hasChildren: parentIdSet.has(String(row._id)),
    lifecycle: row.lifecycle,
    version: row.version,
    fields: row.fields,
  }))
}
