// src/models/seed.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const {
  sequelize, Institution, User, Client, CreditProduct,
  NotificationTemplate, NotificationRule
} = require('./index');

async function seed() {
  await sequelize.sync({ force: false });

  // Institutions
  const institutions = await Promise.all([
    Institution.upsert({ id: 'inst-bo', name: 'Banco Oportunidade', acronym: 'BO', color: '#185FA5', province: 'Maputo', email: 'geral@bancooportunidade.co.mz', status: 'active', notif_email_enabled: true, notif_sms_enabled: true, notif_whatsapp_enabled: true }),
    Institution.upsert({ id: 'inst-gm', name: 'GAPI Microfinanças',  acronym: 'GM', color: '#7C3AED', province: 'Beira',    email: 'geral@gapi.co.mz',              status: 'active', notif_email_enabled: true, notif_sms_enabled: true, notif_whatsapp_enabled: true }),
    Institution.upsert({ id: 'inst-tc', name: 'Tchuma Microcrédito', acronym: 'TC', color: '#A32D2D', province: 'Nampula',  email: 'geral@tchuma.co.mz',            status: 'active', notif_email_enabled: true, notif_sms_enabled: true, notif_whatsapp_enabled: true }),
    Institution.upsert({ id: 'inst-fd', name: 'FDD Mozambique',      acronym: 'FD', color: '#0F766E', province: 'Inhambane',email: 'geral@fdd.co.mz',               status: 'active', notif_email_enabled: true, notif_sms_enabled: false, notif_whatsapp_enabled: true }),
  ]);

  // Users
  const hash = await bcrypt.hash('demo1234', 12);
  await User.upsert({ id: 'user-sa',  full_name: 'Super Admin',      email: 'superadmin@mikrokredito.co.mz', phone: '+258800000001', password_hash: hash, role: 'super_admin', status: 'active', email_verified: true });
  await User.upsert({ id: 'user-bo',  full_name: 'Admin Banco Oport.',email: 'admin@bancooportunidade.co.mz', phone: '+258800000002', password_hash: hash, role: 'inst_admin',  status: 'active', email_verified: true, institution_id: 'inst-bo' });
  await User.upsert({ id: 'user-mg',  full_name: 'Maria da Graça Sitoe', email: 'maria@cliente.mz',          phone: '+258842345678', password_hash: hash, role: 'client',      status: 'active', email_verified: true });

  await Client.upsert({ id: 'client-mg', user_id: 'user-mg', bi_number: '12345678A', nuit: '198234567', province: 'Maputo', activity_type: 'Comércio a retalho', monthly_income: 25000, kyc_status: 'approved' });

  // Credit Products
  const products = [
    { id: 'prod-bo-1', institution_id: 'inst-bo', name: 'Crédito Negócio', interest_rate: 0.032, interest_type: 'reducing_balance', min_amount: 10000, max_amount: 500000, min_term_months: 6,  max_term_months: 36, processing_fee_rate: 0.02,  late_fee_rate: 0.005, sectors: ['Comércio','Agrícola'], requirements: ['BI','NUIT','Extracto bancário'], required_documents: ['bi','nuit','bank_statement'] },
    { id: 'prod-gm-1', institution_id: 'inst-gm', name: 'Kixiku Loan',    interest_rate: 0.028, interest_type: 'reducing_balance', min_amount: 5000,  max_amount: 200000, min_term_months: 3,  max_term_months: 24, processing_fee_rate: 0.015, late_fee_rate: 0.005, sectors: ['Todo sector'],          requirements: ['BI','Comprovativo renda'],       required_documents: ['bi','income_proof'] },
    { id: 'prod-tc-1', institution_id: 'inst-tc', name: 'Crédito Rápido', interest_rate: 0.035, interest_type: 'flat',             min_amount: 2000,  max_amount: 80000,  min_term_months: 3,  max_term_months: 18, processing_fee_rate: 0.025, late_fee_rate: 0.008, sectors: ['Pequeno negócio'],     requirements: ['BI','Fiador'],                   required_documents: ['bi'] },
    { id: 'prod-fd-1', institution_id: 'inst-fd', name: 'Empréstimo Rural',interest_rate: 0.025, interest_type: 'reducing_balance', min_amount: 5000,  max_amount: 300000, min_term_months: 12, max_term_months: 48, processing_fee_rate: 0.018, late_fee_rate: 0.004, sectors: ['Agrícola'],            requirements: ['BI','Título de terra'],          required_documents: ['bi','land_title'] },
  ];
  for (const p of products) await CreditProduct.upsert(p);

  // Notification Templates
  const templates = [
    { id: uuidv4(), key: 'loan_approved',    channel: 'email', language: 'pt', subject: 'O seu pedido de crédito foi aprovado ✓', body: '<p>Caro(a) {{clientName}},</p><p>O seu pedido de crédito <strong>{{reference}}</strong> no valor de <strong>{{amount}} MZN</strong> foi <strong>aprovado</strong> pela {{institutionName}}.</p><p>A sua prestação mensal será de {{installment}} MZN durante {{term}} meses.</p><p>Obrigado pela sua confiança.</p>', variables: ['clientName','reference','amount','institutionName','installment','term'] },
    { id: uuidv4(), key: 'loan_approved',    channel: 'sms',   language: 'pt', body: 'MicroCredit: Caro(a) {{clientName}}, pedido {{reference}} APROVADO. Valor: {{amount}} MZN. Prestação: {{installment}} MZN/mês.', variables: ['clientName','reference','amount','installment'] },
    { id: uuidv4(), key: 'loan_rejected',    channel: 'email', language: 'pt', subject: 'Actualização sobre o seu pedido de crédito', body: '<p>Caro(a) {{clientName}},</p><p>Infelizmente o pedido {{reference}} não foi aprovado. Motivo: {{reason}}.</p><p>Pode submeter novo pedido após 30 dias.</p>', variables: ['clientName','reference','reason'] },
    { id: uuidv4(), key: 'loan_rejected',    channel: 'sms',   language: 'pt', body: 'MicroCredit: Pedido {{reference}} não aprovado. Motivo: {{reason}}. Contacte a instituição para mais informação.', variables: ['reference','reason'] },
    { id: uuidv4(), key: 'payment_received', channel: 'email', language: 'pt', subject: 'Pagamento confirmado — {{amount}} MZN', body: '<p>Caro(a) {{clientName}},</p><p>Confirmamos a recepção do pagamento de <strong>{{amount}} MZN</strong> via {{method}}.</p><p>Referência: {{reference}}</p>', variables: ['clientName','amount','method','reference'] },
    { id: uuidv4(), key: 'payment_received', channel: 'sms',   language: 'pt', body: 'MicroCredit: Pagamento de {{amount}} MZN via {{method}} confirmado. Ref: {{reference}}. Obrigado.', variables: ['amount','method','reference'] },
    { id: uuidv4(), key: 'guarantees_review',channel: 'email', language: 'pt', subject: 'Pedido redireccionado para análise por garantias', body: '<p>Caro(a) {{clientName}},</p><p>O seu pedido {{reference}} excede o limite de 1/3 do salário e foi redireccionado para análise por bens e garantias.</p><p>Um agente entrará em contacto em breve.</p>', variables: ['clientName','reference'] },
    { id: uuidv4(), key: 'guarantees_review',channel: 'sms',   language: 'pt', body: 'MicroCredit: Pedido {{reference}} segue para análise por garantias. Um agente contactará em breve.', variables: ['reference'] },
    { id: uuidv4(), key: 'client_registered',channel: 'email', language: 'pt', subject: 'Bem-vindo(a) ao MicroCredit SYSTEM!', body: '<p>Caro(a) {{clientName}},</p><p>A sua conta foi criada com sucesso. Complete o seu perfil KYC para poder submeter pedidos de crédito.</p>', variables: ['clientName'] },
    { id: uuidv4(), key: 'payment_due_reminder', channel: 'sms', language: 'pt', body: 'MicroCredit: A sua prestação de {{amount}} MZN vence em {{dueDate}}. Pague via M-Pesa, e-Mola ou balcão.', variables: ['amount','dueDate'] },

    // WhatsApp (whatsapp-web.js — sessão própria, sem API oficial da Meta)
    { id: uuidv4(), key: 'loan_approved',        channel: 'whatsapp', language: 'pt', body: 'MicroCredit: Caro(a) {{clientName}}, o seu pedido {{reference}} foi *aprovado*. Valor: {{amount}} MZN. Prestação: {{installment}} MZN/mês.', variables: ['clientName','reference','amount','installment'] },
    { id: uuidv4(), key: 'loan_rejected',        channel: 'whatsapp', language: 'pt', body: 'MicroCredit: Pedido {{reference}} não foi aprovado. Motivo: {{reason}}. Contacte a instituição para mais informação.', variables: ['reference','reason'] },
    { id: uuidv4(), key: 'loan_disbursed',       channel: 'whatsapp', language: 'pt', body: 'MicroCredit: Parabéns {{clientName}}! O seu empréstimo {{reference}} no valor de {{amount}} MZN foi desembolsado.', variables: ['clientName','reference','amount'] },
    { id: uuidv4(), key: 'payment_received',     channel: 'whatsapp', language: 'pt', body: 'MicroCredit: Pagamento de {{amount}} MZN via {{method}} confirmado. Ref: {{reference}}. Obrigado.', variables: ['amount','method','reference'] },
    { id: uuidv4(), key: 'guarantees_review',    channel: 'whatsapp', language: 'pt', body: 'MicroCredit: Pedido {{reference}} segue para análise por garantias. Um agente contactará em breve.', variables: ['reference'] },
    { id: uuidv4(), key: 'payment_due_reminder', channel: 'whatsapp', language: 'pt', body: 'MicroCredit: A sua prestação de {{amount}} MZN vence em {{dueDate}}. Pague via M-Pesa, e-Mola ou balcão.', variables: ['amount','dueDate'] },
  ];

  for (const t of templates) {
    await NotificationTemplate.upsert(t);
  }

  // Notification Rules (global)
  const rules = [
    { id: uuidv4(), event: 'loan_submitted',    channels: ['email','sms'],             notify_client: true,  notify_agent: false, notify_admin: true,  delay_minutes: 0,  is_active: true },
    { id: uuidv4(), event: 'loan_approved',      channels: ['email','sms','whatsapp'],  notify_client: true,  notify_agent: false, notify_admin: false, delay_minutes: 0,  is_active: true },
    { id: uuidv4(), event: 'loan_rejected',      channels: ['email','sms','whatsapp'],  notify_client: true,  notify_agent: false, notify_admin: false, delay_minutes: 0,  is_active: true },
    { id: uuidv4(), event: 'loan_disbursed',     channels: ['email','sms','whatsapp'],  notify_client: true,  notify_agent: false, notify_admin: false, delay_minutes: 0,  is_active: true },
    { id: uuidv4(), event: 'guarantees_review',  channels: ['email','sms','whatsapp'],  notify_client: true,  notify_agent: true,  notify_admin: true,  delay_minutes: 30, is_active: true },
    { id: uuidv4(), event: 'payment_received',   channels: ['email','sms','whatsapp'],  notify_client: true,  notify_agent: false, notify_admin: false, delay_minutes: 0,  is_active: true },
    { id: uuidv4(), event: 'payment_failed',     channels: ['email','sms'],             notify_client: true,  notify_agent: true,  notify_admin: false, delay_minutes: 5,  is_active: true },
    { id: uuidv4(), event: 'payment_due_reminder', channels: ['sms','whatsapp'],       notify_client: true,  notify_agent: false, notify_admin: false, delay_minutes: 0,  is_active: true },
    { id: uuidv4(), event: 'kyc_approved',       channels: ['email','sms'],             notify_client: true,  notify_agent: false, notify_admin: false, delay_minutes: 0,  is_active: true },
    { id: uuidv4(), event: 'kyc_rejected',       channels: ['email','sms'],             notify_client: true,  notify_agent: false, notify_admin: false, delay_minutes: 0,  is_active: true },
  ];

  for (const r of rules) {
    await NotificationRule.upsert(r);
  }

  console.log('Seed concluído com sucesso!');
  console.log('\nContas de acesso:');
  console.log('  Super Admin : superadmin@mikrokredito.co.mz / demo1234');
  console.log('  Admin BO    : admin@bancooportunidade.co.mz / demo1234');
  console.log('  Cliente     : osimone@unisced.edu.mz / demo1234');
}

module.exports = seed;

if (require.main === module) {
  seed().then(() => process.exit(0)).catch(err => { console.error('Seed error:', err); process.exit(1); });
}
