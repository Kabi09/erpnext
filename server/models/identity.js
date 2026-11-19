import mongoose from 'mongoose'

const { Schema } = mongoose
const reference = ref => ({ type: Schema.Types.ObjectId, ref, required: true })
const options = { timestamps: true, autoIndex: false, autoCreate: false }

export const permissionActions = Object.freeze([
  'create', 'read', 'update', 'delete', 'submit', 'cancel', 'amend', 'print', 'export', 'import', 'report', 'share',
])

const permission = new Schema({
  resource: { type: String, required: true, match: /^[a-z][a-z0-9-]*$/ },
  action: { type: String, enum: permissionActions, required: true },
}, options)
permission.index({ resource: 1, action: 1 }, { unique: true })

const role = new Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  permissions: [reference('Permission')],
}, options)

const company = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true },
  active: { type: Boolean, default: true },
}, options)

const membership = new Schema({
  company: reference('Company'),
  roles: [reference('Role')],
}, { _id: false })

const user = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true, select: false },
  status: { type: String, enum: ['active', 'disabled'], default: 'active', index: true },
  memberships: {
    type: [membership],
    validate: entries => new Set(entries.map(entry => String(entry.company))).size === entries.length,
  },
}, options)
user.index({ 'memberships.company': 1 })

const refreshSession = new Schema({
  user: reference('User'),
  tokenDigest: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
}, options)
refreshSession.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
refreshSession.index({ user: 1, revokedAt: 1 })

const audit = new Schema({
  action: { type: String, required: true },
  actor: { type: Schema.Types.ObjectId, ref: 'User' },
  subject: { type: Schema.Types.ObjectId },
  company: { type: Schema.Types.ObjectId, ref: 'Company' },
  requestId: String,
  doctype: String,
  changedFields: { type: [String], default: undefined },
}, { ...options, timestamps: { createdAt: true, updatedAt: false } })
audit.index({ actor: 1, createdAt: -1 })
audit.index({ subject: 1, createdAt: -1 })
audit.index({ action: 1 }, { unique: true, partialFilterExpression: { action: 'bootstrap.admin' } })

export function createModels(connection) {
  return {
    User: connection.model('User', user),
    Role: connection.model('Role', role),
    Permission: connection.model('Permission', permission),
    Company: connection.model('Company', company),
    RefreshSession: connection.model('RefreshSession', refreshSession),
    AuditLog: connection.model('AuditLog', audit),
  }
}
