// src/models/index.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// ─────────────────────────────────────────────
// INSTITUTION (Tenant)
// ─────────────────────────────────────────────
const Institution = sequelize.define('Institution', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  acronym: { type: DataTypes.STRING(10), allowNull: false },
  license_number: DataTypes.STRING,
  color: { type: DataTypes.STRING(20), defaultValue: '#00704A' },
  logo_url: DataTypes.STRING,
  country: { type: DataTypes.STRING, defaultValue: 'Mozambique' },
  province: DataTypes.STRING,
  address: DataTypes.TEXT,
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  website: DataTypes.STRING,
  status: { type: DataTypes.ENUM('active', 'suspended', 'pending'), defaultValue: 'pending' },
  settings: { type: DataTypes.JSONB, defaultValue: {} },
  // Notification preferences
  notif_email_enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
  notif_sms_enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
  notif_whatsapp_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  notif_sender_name: DataTypes.STRING,
  notif_email_from: DataTypes.STRING,
  notif_sms_sender: DataTypes.STRING,
}, { tableName: 'institutions', timestamps: true, underscored: true });

// ─────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  institution_id: { type: DataTypes.UUID, allowNull: true }, // null = super admin
  full_name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  phone: DataTypes.STRING,
  password_hash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('super_admin', 'inst_admin', 'inst_agent', 'client'), allowNull: false },
  status: { type: DataTypes.ENUM('active', 'inactive', 'blocked'), defaultValue: 'active' },
  email_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  phone_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  verification_token: DataTypes.STRING,
  reset_token: DataTypes.STRING,
  reset_token_expires: DataTypes.DATE,
  last_login: DataTypes.DATE,
  avatar_url: DataTypes.STRING,
}, { tableName: 'users', timestamps: true, underscored: true });

// ─────────────────────────────────────────────
// CLIENT (KYC profile)
// ─────────────────────────────────────────────
const Client = sequelize.define('Client', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  bi_number: DataTypes.STRING,
  nuit: DataTypes.STRING,
  date_of_birth: DataTypes.DATEONLY,
  gender: DataTypes.ENUM('M', 'F', 'Other'),
  marital_status: DataTypes.ENUM('single', 'married', 'divorced', 'widowed'),
  nationality: { type: DataTypes.STRING, defaultValue: 'Mozambican' },
  province: DataTypes.STRING,
  district: DataTypes.STRING,
  address: DataTypes.TEXT,
  activity_type: DataTypes.STRING,
  business_name: DataTypes.STRING,
  monthly_income: DataTypes.DECIMAL(15, 2),
  kyc_status: { type: DataTypes.ENUM('incomplete', 'pending_review', 'approved', 'rejected'), defaultValue: 'incomplete' },
  kyc_reviewed_by: DataTypes.UUID,
  kyc_reviewed_at: DataTypes.DATE,
  kyc_notes: DataTypes.TEXT,
  credit_score: { type: DataTypes.INTEGER, defaultValue: 0 },
  crc_status: { type: DataTypes.ENUM('nao_consta', 'consta', 'em_verificacao'), defaultValue: 'em_verificacao' },
  crc_comment: DataTypes.TEXT,
}, { tableName: 'clients', timestamps: true, underscored: true });

// ─────────────────────────────────────────────
// DOCUMENT
// ─────────────────────────────────────────────
const Document = sequelize.define('Document', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  client_id: { type: DataTypes.UUID, allowNull: false },
  loan_id: { type: DataTypes.UUID },
  type: {
    type: DataTypes.ENUM(
      'bi', 'nuit', 'residence_certificate', 'bank_statement', 'income_proof',
      'business_photo', 'land_title', 'contract', 'payment_schedule', 'other'
    ),
    allowNull: false
  },
  original_name: DataTypes.STRING,
  file_name: DataTypes.STRING,
  file_path: DataTypes.STRING,
  file_size: DataTypes.INTEGER,
  mime_type: DataTypes.STRING,
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
  rejection_reason: DataTypes.TEXT,
  uploaded_by: DataTypes.UUID,
}, { tableName: 'documents', timestamps: true, underscored: true });

// ─────────────────────────────────────────────
// CREDIT PRODUCT
// ─────────────────────────────────────────────
const CreditProduct = sequelize.define('CreditProduct', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  institution_id: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  min_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  max_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  interest_rate: { type: DataTypes.DECIMAL(6, 4), allowNull: false, comment: 'Monthly rate e.g. 0.032 = 3.2%' },
  interest_type: { type: DataTypes.ENUM('flat', 'reducing_balance'), defaultValue: 'reducing_balance' },
  min_term_months: { type: DataTypes.INTEGER, allowNull: false },
  max_term_months: { type: DataTypes.INTEGER, allowNull: false },
  grace_period_days: { type: DataTypes.INTEGER, defaultValue: 0 },
  late_fee_rate: { type: DataTypes.DECIMAL(6, 4), defaultValue: 0.005, comment: 'Daily late fee rate. 0.005 = 0.5% per day over the overdue installment' },
  processing_fee_rate: { type: DataTypes.DECIMAL(6, 4), defaultValue: 0.02 },
  sectors: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  requirements: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  required_documents: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  is_visible: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'credit_products', timestamps: true, underscored: true });

// ─────────────────────────────────────────────
// LOAN APPLICATION
// ─────────────────────────────────────────────
const LoanApplication = sequelize.define('LoanApplication', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  reference: { type: DataTypes.STRING, unique: true },
  client_id: { type: DataTypes.UUID, allowNull: false },
  institution_id: { type: DataTypes.UUID, allowNull: false },
  product_id: { type: DataTypes.UUID, allowNull: false },
  requested_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  approved_amount: DataTypes.DECIMAL(15, 2),
  term_months: { type: DataTypes.INTEGER, allowNull: false },
  purpose: DataTypes.STRING,
  purpose_detail: DataTypes.TEXT,
  interest_rate: DataTypes.DECIMAL(6, 4),
  processing_fee: DataTypes.DECIMAL(15, 2),
  monthly_installment: DataTypes.DECIMAL(15, 2),
  total_repayable: DataTypes.DECIMAL(15, 2),
  status: {
    type: DataTypes.ENUM(
      'draft', 'submitted', 'under_review', 'docs_requested',
      'approved', 'rejected', 'disbursed', 'cancelled'
    ),
    defaultValue: 'draft'
  },
  rejection_reason: DataTypes.TEXT,
  reviewed_by: DataTypes.UUID,
  reviewed_at: DataTypes.DATE,
  disbursed_at: DataTypes.DATE,
  contract_url: DataTypes.STRING,
  notes: DataTypes.TEXT,
}, { tableName: 'loan_applications', timestamps: true, underscored: true });

// ─────────────────────────────────────────────
// LOAN (Active loan after disbursement)
// ─────────────────────────────────────────────
const Loan = sequelize.define('Loan', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  application_id: { type: DataTypes.UUID, allowNull: false },
  client_id: { type: DataTypes.UUID, allowNull: false },
  institution_id: { type: DataTypes.UUID, allowNull: false },
  principal: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  outstanding_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  total_paid: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  interest_rate: { type: DataTypes.DECIMAL(6, 4), allowNull: false },
  term_months: DataTypes.INTEGER,
  installments_total: DataTypes.INTEGER,
  installments_paid: { type: DataTypes.INTEGER, defaultValue: 0 },
  next_due_date: DataTypes.DATEONLY,
  disbursed_at: DataTypes.DATE,
  maturity_date: DataTypes.DATEONLY,
  status: { type: DataTypes.ENUM('active', 'overdue', 'completed', 'written_off'), defaultValue: 'active' },
  days_overdue: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'loans', timestamps: true, underscored: true });

// ─────────────────────────────────────────────
// PAYMENT SCHEDULE
// ─────────────────────────────────────────────
const PaymentSchedule = sequelize.define('PaymentSchedule', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  loan_id: { type: DataTypes.UUID, allowNull: false },
  installment_number: DataTypes.INTEGER,
  due_date: DataTypes.DATEONLY,
  principal_due: DataTypes.DECIMAL(15, 2),
  interest_due: DataTypes.DECIMAL(15, 2),
  total_due: DataTypes.DECIMAL(15, 2),
  principal_paid: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  interest_paid: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total_paid: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  late_fee: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('pending', 'partial', 'paid', 'overdue'), defaultValue: 'pending' },
  paid_at: DataTypes.DATE,
}, { tableName: 'payment_schedules', timestamps: true, underscored: true });

// ─────────────────────────────────────────────
// PAYMENT TRANSACTION
// ─────────────────────────────────────────────
const PaymentTransaction = sequelize.define('PaymentTransaction', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  reference: { type: DataTypes.STRING, unique: true },
  loan_id: { type: DataTypes.UUID, allowNull: false },
  client_id: { type: DataTypes.UUID, allowNull: false },
  institution_id: { type: DataTypes.UUID, allowNull: false },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  method: { type: DataTypes.ENUM('mpesa', 'emola', 'bank_transfer', 'reference', 'cash'), allowNull: false },
  external_reference: DataTypes.STRING, // M-Pesa/e-Mola transaction ID
  phone_number: DataTypes.STRING,
  status: { type: DataTypes.ENUM('pending', 'processing', 'confirmed', 'failed', 'reversed'), defaultValue: 'pending' },
  gateway_response: DataTypes.JSONB,
  callback_received_at: DataTypes.DATE,
  reconciled: { type: DataTypes.BOOLEAN, defaultValue: false },
  reconciled_at: DataTypes.DATE,
  failure_reason: DataTypes.TEXT,
  receipt_file_name: DataTypes.STRING,
  receipt_original_name: DataTypes.STRING,
  receipt_file_path: DataTypes.STRING,
  receipt_mime_type: DataTypes.STRING,
  applied_late_fee: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  payment_month: DataTypes.STRING,
  registered_by: DataTypes.UUID,
}, { tableName: 'payment_transactions', timestamps: true, underscored: true });

// ─────────────────────────────────────────────
// NOTIFICATION TEMPLATE
// ─────────────────────────────────────────────
const NotificationTemplate = sequelize.define('NotificationTemplate', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  institution_id: { type: DataTypes.UUID }, // null = global/platform
  key: { type: DataTypes.STRING, allowNull: false, comment: 'e.g. loan_approved, payment_received' },
  channel: { type: DataTypes.ENUM('email', 'sms', 'whatsapp'), allowNull: false },
  language: { type: DataTypes.STRING(5), defaultValue: 'pt' },
  subject: DataTypes.STRING, // email only
  body: { type: DataTypes.TEXT, allowNull: false, comment: 'Handlebars template' },
  variables: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [], comment: 'List of available variables' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'notification_templates', timestamps: true, underscored: true });

// ─────────────────────────────────────────────
// NOTIFICATION RULE
// ─────────────────────────────────────────────
const NotificationRule = sequelize.define('NotificationRule', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  institution_id: { type: DataTypes.UUID },
  event: {
    type: DataTypes.ENUM(
      'client_registered', 'kyc_submitted', 'kyc_approved', 'kyc_rejected',
      'loan_submitted', 'loan_under_review', 'loan_docs_requested',
      'loan_approved', 'loan_rejected', 'loan_disbursed',
      'payment_due_reminder', 'payment_received', 'payment_failed',
      'loan_overdue', 'loan_completed'
    ),
    allowNull: false
  },
  channels: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: ['email'] },
  notify_client: { type: DataTypes.BOOLEAN, defaultValue: true },
  notify_agent: { type: DataTypes.BOOLEAN, defaultValue: false },
  notify_admin: { type: DataTypes.BOOLEAN, defaultValue: false },
  delay_minutes: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'notification_rules', timestamps: true, underscored: true });

// ─────────────────────────────────────────────
// NOTIFICATION LOG
// ─────────────────────────────────────────────
const NotificationLog = sequelize.define('NotificationLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  institution_id: DataTypes.UUID,
  recipient_id: DataTypes.UUID,
  recipient_email: DataTypes.STRING,
  recipient_phone: DataTypes.STRING,
  channel: { type: DataTypes.ENUM('email', 'sms', 'whatsapp'), allowNull: false },
  event: DataTypes.STRING,
  template_key: DataTypes.STRING,
  subject: DataTypes.STRING,
  body: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('queued', 'sending', 'sent', 'delivered', 'failed', 'bounced'), defaultValue: 'queued' },
  provider: DataTypes.STRING,
  provider_message_id: DataTypes.STRING,
  error_message: DataTypes.TEXT,
  attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
  max_attempts: { type: DataTypes.INTEGER, defaultValue: 3 },
  next_retry_at: DataTypes.DATE,
  sent_at: DataTypes.DATE,
  delivered_at: DataTypes.DATE,
  read_at: DataTypes.DATE,
  read_by: DataTypes.UUID,
  link_path: DataTypes.STRING,
  metadata: DataTypes.JSONB,
}, { tableName: 'notification_logs', timestamps: true, underscored: true });

// ─────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────
const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  institution_id: DataTypes.UUID,
  user_id: DataTypes.UUID,
  user_name: DataTypes.STRING,
  user_role: DataTypes.STRING,
  action: DataTypes.STRING,
  entity: DataTypes.STRING,
  entity_id: DataTypes.UUID,
  old_values: DataTypes.JSONB,
  new_values: DataTypes.JSONB,
  ip_address: DataTypes.STRING,
  user_agent: DataTypes.STRING,
  description: DataTypes.TEXT,
}, { tableName: 'audit_logs', timestamps: true, underscored: true });

// ─────────────────────────────────────────────
// ASSOCIATIONS
// ─────────────────────────────────────────────
Institution.hasMany(User, { foreignKey: 'institution_id' });
User.belongsTo(Institution, { foreignKey: 'institution_id' });

User.hasOne(Client, { foreignKey: 'user_id' });
Client.belongsTo(User, { foreignKey: 'user_id' });

Client.hasMany(Document, { foreignKey: 'client_id' });
Document.belongsTo(Client, { foreignKey: 'client_id' });

LoanApplication.hasMany(Document, { foreignKey: 'loan_id' });
Document.belongsTo(LoanApplication, { foreignKey: 'loan_id' });

Institution.hasMany(CreditProduct, { foreignKey: 'institution_id' });
CreditProduct.belongsTo(Institution, { foreignKey: 'institution_id' });

Client.hasMany(LoanApplication, { foreignKey: 'client_id' });
LoanApplication.belongsTo(Client, { foreignKey: 'client_id' });
Institution.hasMany(LoanApplication, { foreignKey: 'institution_id' });
LoanApplication.belongsTo(Institution, { foreignKey: 'institution_id' });
CreditProduct.hasMany(LoanApplication, { foreignKey: 'product_id' });
LoanApplication.belongsTo(CreditProduct, { foreignKey: 'product_id' });

LoanApplication.hasOne(Loan, { foreignKey: 'application_id' });
Loan.belongsTo(LoanApplication, { foreignKey: 'application_id' });

Loan.hasMany(PaymentSchedule, { foreignKey: 'loan_id' });
PaymentSchedule.belongsTo(Loan, { foreignKey: 'loan_id' });

Loan.hasMany(PaymentTransaction, { foreignKey: 'loan_id' });
PaymentTransaction.belongsTo(Loan, { foreignKey: 'loan_id' });

Institution.hasMany(NotificationTemplate, { foreignKey: 'institution_id' });
Institution.hasMany(NotificationRule, { foreignKey: 'institution_id' });
Institution.hasMany(NotificationLog, { foreignKey: 'institution_id' });

module.exports = {
  sequelize,
  Institution, User, Client, Document,
  CreditProduct, LoanApplication, Loan,
  PaymentSchedule, PaymentTransaction,
  NotificationTemplate, NotificationRule, NotificationLog,
  AuditLog,
};
