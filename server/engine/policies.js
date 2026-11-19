export const actions = ['read', 'create', 'update', 'delete']

// Reviewed overlays are independent of the generated reference catalog.
export const policies = [
  { name: 'Quality Inspection Parameter Group', status: 'Verified', resource: 'inspection-group', fields: ['group_name'] },
  { name: 'Quality Inspection Parameter', status: 'Verified', resource: 'inspection-parameter',
    fields: ['parameter', 'description', 'parameter_group'], fieldResource: { description: 'inspection-description' } },
  { name: 'Quality Feedback Template', status: 'Verified', resource: 'feedback-template', reviewedController: 'Unique parameter per template', fields: ['template', 'parameters'],
    children: { parameters: { fields: ['parameter'], uniqueBy: 'parameter', maxRows: 100 } } },
].map(policy => ({ scope: 'company', ...policy }))

export async function seedDocumentGrants(models, role, session) {
  const grants = policies.flatMap(policy => actions.map(action => ({ resource: policy.resource, action })))
  grants.push(...['read', 'update'].map(action => ({ resource: 'inspection-description', action })))
  const ids = []
  for (const grant of grants) {
    const row = await models.Permission.findOneAndUpdate(grant, { $setOnInsert: grant },
      { upsert: true, returnDocument: 'after', session })
    ids.push(row._id)
  }
  await models.Role.updateOne({ _id: role._id }, { $addToSet: { permissions: { $each: ids } } }, { session })
}
