// src/models/seed.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const {
  sequelize, Institution, User, Client, CreditProduct,
  NotificationTemplate, NotificationRule
} = require('./index');

// Cria o template/regra só se ainda não existir uma linha global (institution_id nulo) com a
// mesma chave natural (key+channel+language, ou event) — NUNCA actualiza uma linha já
// existente, para não apagar uma customização que um gestor já tenha feito no editor. Isto
// torna a função verdadeiramente idempotente: pode correr em todos os arranques do servidor,
// e cada chamada só preenche o que realmente falta (ex.: adicionar a variante WhatsApp de um
// template que só tinha email).
async function ensureTemplate(t) {
  try {
    const where = { key: t.key, channel: t.channel, language: t.language || 'pt', institution_id: null };
    const existing = await NotificationTemplate.findOne({ where });
    if (existing) return existing;
    return await NotificationTemplate.create({ id: uuidv4(), institution_id: null, language: 'pt', ...t });
  } catch (err) {
    // Uma falha isolada (ex.: ligação momentânea) não pode impedir os outros templates de
    // serem criados nem abortar o arranque do servidor que chama esta função.
    console.error(`ensureTemplate falhou para ${t.key}/${t.channel}:`, err.message);
    return null;
  }
}
async function ensureRule(r) {
  try {
    const where = { event: r.event, institution_id: null };
    const existing = await NotificationRule.findOne({ where });
    if (existing) return existing;
    return await NotificationRule.create({ id: uuidv4(), institution_id: null, ...r });
  } catch (err) {
    // Ex.: o valor ENUM 'late_fee_started' ainda não existe nesta base de dados porque a
    // schema patch em server.js não chegou a aplicar-se — não deve impedir as outras regras.
    console.error(`ensureRule falhou para ${r.event}:`, err.message);
    return null;
  }
}

async function seedNotificationDefaults() {
  // ── Templates por omissão (email + whatsapp) ──
  // Não são "dados de demonstração" — são configuração base do sistema, por isso também são
  // criados no modo --minimal do clean.js. Usam apenas variáveis que o notificationService
  // realmente substitui (ver triggerEvent/renderData em notificationService.js e os pontos de
  // disparo em auth.js, loanService.js, payments.js, loans.js, clients.js, jobs/loanDeadlineJob.js).
  const templates = [
    // ── Cliente registado (boas-vindas + dados de acesso, uma única mensagem) ──
    { key: 'client_registered', channel: 'email', subject: '🎉 Bem-vindo(a) à {{app_name}}!',
      body: `<p>🎉 <strong>Bem-vindo(a) à {{app_name}}!</strong></p>
<p>Olá, <strong>{{clientName}}</strong>! 👋😊</p>
<p>✅ A sua conta foi criada com sucesso!</p>
<p>🔐 <strong>Dados de acesso</strong></p>
<p>👤 <strong>Utilizador/Email:</strong> {{loginEmail}}<br>🌐 <strong>Plataforma:</strong> <a href="{{app_url}}" target="_blank">{{app_url}}</a></p>
<p>🔑 <strong>Defina a sua palavra-passe:</strong></p>
<p><a href="{{passwordSetupUrl}}" target="_blank">Definir a minha palavra-passe</a></p>
<p>⏳ Por motivos de segurança, este link é temporário e poderá expirar após o período definido pelo sistema.</p>
<p>📋 <strong>Próximo passo:</strong> Depois de entrar na plataforma, complete o seu perfil <strong>KYC</strong> com os seus dados e documentos solicitados.</p>
<p>💰 Depois de concluir o KYC, poderá:</p>
<ul><li>🔹 Solicitar crédito;</li><li>🔹 Acompanhar os seus pedidos;</li><li>🔹 Consultar os seus empréstimos;</li><li>🔹 Acompanhar pagamentos e saldos;</li><li>🔹 Receber notificações importantes. 🔔</li></ul>
<p>🚀 <strong>Complete o seu KYC e dê o próximo passo!</strong></p>
<p>💙 <strong>{{app_name}}</strong><br>🤝 Crédito simples, próximo e transparente.</p>`,
      variables: ['clientName','loginEmail','passwordSetupUrl','app_name','app_url'] },
    { key: 'client_registered', channel: 'whatsapp',
      body: `🎉 *Bem-vindo(a) à {{app_name}}!*

Olá, *{{clientName}}*! 👋😊

✅ A sua conta foi criada com sucesso!

🔐 *Dados de acesso*
👤 Utilizador/Email: *{{loginEmail}}*
🌐 Plataforma: {{app_url}}

🔑 *Defina a sua palavra-passe:*
{{passwordSetupUrl}}

⏳ Este link é temporário e, por segurança, poderá expirar.

📋 *Próximo passo:*
Depois de entrar, complete o seu perfil *KYC* com os seus dados e documentos necessários.

💰 Depois poderá:
🔹 Solicitar crédito;
🔹 Acompanhar pedidos;
🔹 Consultar empréstimos;
🔹 Acompanhar pagamentos e saldos;
🔹 Receber notificações. 🔔

🚀 *Complete o seu KYC e dê o próximo passo!*

💙 *{{app_name}}*
🤝 Crédito simples, próximo e transparente.`,
      variables: ['clientName','loginEmail','passwordSetupUrl','app_name','app_url'] },

    // ── KYC submetido ──
    { key: 'kyc_submitted', channel: 'email', subject: '📋 Recebemos o seu perfil KYC',
      body: `<p>📋 <strong>Perfil KYC recebido</strong></p><p>Olá, <strong>{{clientName}}</strong>! 👋</p><p>✅ Os seus dados e documentos foram submetidos com sucesso.</p><p>🔎 A nossa equipa vai analisar a sua informação em breve.</p><p>🔔 Assim que o seu KYC for aprovado, poderá solicitar crédito imediatamente.</p><p>🔗 Acompanhe o estado em: <a href="{{app_url}}" target="_blank">{{app_url}}</a></p><p>💙 <strong>{{app_name}}</strong></p>`,
      variables: ['clientName','app_name','app_url'] },
    { key: 'kyc_submitted', channel: 'whatsapp',
      body: `📋 *Perfil KYC recebido*\n\nOlá, *{{clientName}}*! 👋\n\n✅ Os seus dados e documentos foram submetidos com sucesso.\n🔎 A nossa equipa vai analisar a sua informação em breve.\n🔔 Assim que o KYC for aprovado, poderá solicitar crédito.\n\n🔗 {{app_url}}\n\n💙 *{{app_name}}*`,
      variables: ['clientName','app_name','app_url'] },

    // ── KYC aprovado ──
    { key: 'kyc_approved', channel: 'email', subject: '✅ O seu KYC foi aprovado!',
      body: `<p>✅ <strong>KYC aprovado!</strong></p><p>Parabéns, <strong>{{clientName}}</strong>! 🎉</p><p>🔓 O seu perfil já está completo e verificado.</p><p>💰 Já pode solicitar o seu crédito na plataforma.</p><p>🔗 <a href="{{app_url}}" target="_blank">Solicitar crédito agora</a></p><p>💙 <strong>{{app_name}}</strong></p>`,
      variables: ['clientName','app_name','app_url'] },
    { key: 'kyc_approved', channel: 'whatsapp',
      body: `✅ *KYC aprovado!*\n\nParabéns, *{{clientName}}*! 🎉\n\n🔓 O seu perfil já está completo e verificado.\n💰 Já pode solicitar o seu crédito na plataforma.\n\n🔗 {{app_url}}\n\n💙 *{{app_name}}*`,
      variables: ['clientName','app_name','app_url'] },

    // ── KYC rejeitado ──
    { key: 'kyc_rejected', channel: 'email', subject: '⚠️ O seu KYC precisa de correcção',
      body: `<p>⚠️ <strong>KYC não aprovado</strong></p><p>Olá, <strong>{{clientName}}</strong>.</p><p>❌ Infelizmente não foi possível aprovar o seu perfil desta vez.</p><p>📝 <strong>Motivo:</strong> {{reason}}</p><p>📋 <strong>Próximo passo:</strong> Corrija os dados/documentos indicados e submeta novamente.</p><p>🔗 <a href="{{app_url}}" target="_blank">Actualizar o meu perfil</a></p><p>💙 <strong>{{app_name}}</strong></p>`,
      variables: ['clientName','reason','app_name','app_url'] },
    { key: 'kyc_rejected', channel: 'whatsapp',
      body: `⚠️ *KYC não aprovado*\n\nOlá, *{{clientName}}*.\n\n❌ Infelizmente não foi possível aprovar o seu perfil desta vez.\n📝 Motivo: {{reason}}\n\n📋 Corrija os dados/documentos indicados e submeta novamente.\n🔗 {{app_url}}\n\n💙 *{{app_name}}*`,
      variables: ['clientName','reason','app_name','app_url'] },

    // ── Documentos solicitados ──
    { key: 'loan_docs_requested', channel: 'email', subject: '📎 Precisamos de mais documentos',
      body: `<p>📎 <strong>Documentos em falta</strong></p><p>Olá, <strong>{{clientName}}</strong>.</p><p>🔎 O seu pedido <strong>{{reference}}</strong> está em análise, mas precisamos de documentos adicionais para continuar.</p><p>📋 <strong>Próximo passo:</strong> Carregue os documentos solicitados na plataforma o mais breve possível.</p><p>🔗 <a href="{{app_url}}" target="_blank">Carregar documentos</a></p><p>💙 <strong>{{app_name}}</strong></p>`,
      variables: ['clientName','reference','app_name','app_url'] },
    { key: 'loan_docs_requested', channel: 'whatsapp',
      body: `📎 *Documentos em falta*\n\nOlá, *{{clientName}}*.\n\n🔎 O seu pedido *{{reference}}* está em análise, mas precisamos de documentos adicionais.\n📋 Carregue-os na plataforma o mais breve possível.\n\n🔗 {{app_url}}\n\n💙 *{{app_name}}*`,
      variables: ['clientName','reference','app_name','app_url'] },

    // ── Pedido submetido ──
    { key: 'loan_submitted', channel: 'email', subject: '📨 Recebemos o seu pedido de crédito',
      body: `<p>📨 <strong>Pedido submetido com sucesso</strong></p><p>Olá, <strong>{{clientName}}</strong>! 👋</p><p>📄 <strong>Referência:</strong> {{reference}}</p><p>💰 <strong>Valor solicitado:</strong> {{amount}}</p><p>🔎 O seu pedido está agora em fila de análise.</p><p>🔔 Vamos avisá-lo(a) assim que houver uma decisão.</p><p>💙 <strong>{{app_name}}</strong></p>`,
      variables: ['clientName','reference','amount','app_name'] },
    { key: 'loan_submitted', channel: 'whatsapp',
      body: `📨 *Pedido submetido com sucesso*\n\nOlá, *{{clientName}}*! 👋\n\n📄 Referência: *{{reference}}*\n💰 Valor solicitado: *{{amount}}*\n\n🔎 O seu pedido está agora em fila de análise.\n🔔 Vamos avisá-lo(a) assim que houver decisão.\n\n💙 *{{app_name}}*`,
      variables: ['clientName','reference','amount','app_name'] },

    // ── Pedido em análise ──
    { key: 'loan_under_review', channel: 'email', subject: '🔎 O seu pedido está em análise',
      body: `<p>🔎 <strong>Pedido em análise</strong></p><p>Olá, <strong>{{clientName}}</strong>.</p><p>📄 <strong>Referência:</strong> {{reference}}</p><p>👩‍💼 A nossa equipa está a rever o seu pedido de crédito.</p><p>🔔 Avisamos assim que sair uma decisão.</p><p>💙 <strong>{{app_name}}</strong></p>`,
      variables: ['clientName','reference','app_name'] },
    { key: 'loan_under_review', channel: 'whatsapp',
      body: `🔎 *Pedido em análise*\n\nOlá, *{{clientName}}*.\n\n📄 Referência: *{{reference}}*\n👩‍💼 A nossa equipa está a rever o seu pedido.\n🔔 Avisamos assim que sair uma decisão.\n\n💙 *{{app_name}}*`,
      variables: ['clientName','reference','app_name'] },

    // ── Pedido aprovado ──
    { key: 'loan_approved', channel: 'email', subject: '✅ Pedido aprovado — {{reference}}',
      body: `<p>✅ <strong>Pedido aprovado!</strong></p><p>Parabéns, <strong>{{clientName}}</strong>! 🎉</p><p>📄 <strong>Referência:</strong> {{reference}}</p><p>💰 <strong>Valor aprovado:</strong> {{amount}}</p><p>💳 <strong>Prestação mensal:</strong> {{installment}}</p><p>📆 <strong>Prazo:</strong> {{term}} meses</p><p>🏦 <strong>Instituição:</strong> {{institutionName}}</p><p>📋 <strong>Próximo passo:</strong> aguarde o desembolso — vamos notificá-lo(a) assim que o valor estiver disponível.</p><p>🔗 <a href="{{app_url}}" target="_blank">Consultar o meu pedido</a></p><p>💙 <strong>{{app_name}}</strong></p>`,
      variables: ['clientName','reference','amount','installment','term','institutionName','app_name','app_url'] },
    { key: 'loan_approved', channel: 'whatsapp',
      body: `✅ *Pedido aprovado!*\n\nParabéns, *{{clientName}}*! 🎉\n\n📄 Referência: *{{reference}}*\n💰 Valor aprovado: *{{amount}}*\n💳 Prestação mensal: *{{installment}}*\n📆 Prazo: *{{term}} meses*\n🏦 Instituição: {{institutionName}}\n\n📋 Aguarde o desembolso — avisamos assim que estiver disponível.\n🔗 {{app_url}}\n\n💙 *{{app_name}}*`,
      variables: ['clientName','reference','amount','installment','term','institutionName','app_name','app_url'] },

    // ── Pedido rejeitado ──
    { key: 'loan_rejected', channel: 'email', subject: 'Actualização sobre o seu pedido — {{reference}}',
      body: `<p>📄 <strong>Actualização do pedido {{reference}}</strong></p><p>Olá, <strong>{{clientName}}</strong>.</p><p>❌ Infelizmente o seu pedido não foi aprovado desta vez.</p><p>📝 <strong>Motivo:</strong> {{reason}}</p><p>🔁 Pode submeter um novo pedido após 30 dias.</p><p>💙 <strong>{{app_name}}</strong></p>`,
      variables: ['clientName','reference','reason','app_name'] },
    { key: 'loan_rejected', channel: 'whatsapp',
      body: `📄 *Actualização do pedido {{reference}}*\n\nOlá, *{{clientName}}*.\n\n❌ Infelizmente o pedido não foi aprovado desta vez.\n📝 Motivo: {{reason}}\n🔁 Pode submeter um novo pedido após 30 dias.\n\n💙 *{{app_name}}*`,
      variables: ['clientName','reference','reason','app_name'] },

    // ── Empréstimo desembolsado ──
    { key: 'loan_disbursed', channel: 'email', subject: '💸 Empréstimo desembolsado — {{reference}}',
      body: `<p>💸 <strong>Empréstimo desembolsado!</strong></p><p>Parabéns, <strong>{{clientName}}</strong>! 🎉</p><p>📄 <strong>Referência:</strong> {{reference}}</p><p>💰 <strong>Valor:</strong> {{amount}}</p><p>📅 <strong>Próximo vencimento:</strong> {{dueDate}}</p><p>💳 <strong>Prestação mensal:</strong> {{installment}}</p><p>🔔 Vamos lembrá-lo(a) antes de cada vencimento.</p><p>🔗 <a href="{{app_url}}" target="_blank">Consultar o meu empréstimo</a></p><p>💙 <strong>{{app_name}}</strong></p>`,
      variables: ['clientName','reference','amount','dueDate','installment','app_name','app_url'] },
    { key: 'loan_disbursed', channel: 'whatsapp',
      body: `💸 *Empréstimo desembolsado!*\n\nParabéns, *{{clientName}}*! 🎉\n\n📄 Referência: *{{reference}}*\n💰 Valor: *{{amount}}*\n📅 Próximo vencimento: *{{dueDate}}*\n💳 Prestação: *{{installment}}*\n\n🔔 Vamos lembrá-lo(a) antes de cada vencimento.\n🔗 {{app_url}}\n\n💙 *{{app_name}}*`,
      variables: ['clientName','reference','amount','dueDate','installment','app_name','app_url'] },

    // ── Pagamento recebido/confirmado ──
    { key: 'payment_received', channel: 'email', subject: '💰 Pagamento confirmado — {{amount}}',
      body: `<p>💰 <strong>Pagamento confirmado!</strong></p><p>Obrigado, <strong>{{clientName}}</strong>! 🙏</p><p>✅ <strong>Valor:</strong> {{amount}}</p><p>💳 <strong>Método:</strong> {{method}}</p><p>🔖 <strong>Referência:</strong> {{reference}}</p><p>📊 <strong>Saldo actual:</strong> {{balance}}</p><p>💙 <strong>{{app_name}}</strong></p>`,
      variables: ['clientName','amount','method','reference','balance','app_name'] },
    { key: 'payment_received', channel: 'whatsapp',
      body: `💰 *Pagamento confirmado!*\n\nObrigado, *{{clientName}}*! 🙏\n\n✅ Valor: *{{amount}}*\n💳 Método: {{method}}\n🔖 Referência: {{reference}}\n📊 Saldo actual: *{{balance}}*\n\n💙 *{{app_name}}*`,
      variables: ['clientName','amount','method','reference','balance','app_name'] },

    // ── Pagamento falhado ──
    { key: 'payment_failed', channel: 'email', subject: '❌ Pagamento não confirmado',
      body: `<p>❌ <strong>Pagamento não confirmado</strong></p><p>Olá, <strong>{{clientName}}</strong>.</p><p>⚠️ Não conseguimos confirmar o pagamento de <strong>{{amount}}</strong> (ref. {{reference}}).</p><p>📝 <strong>Motivo:</strong> {{reason}}</p><p>🔁 Por favor tente novamente ou contacte-nos.</p><p>💙 <strong>{{app_name}}</strong></p>`,
      variables: ['clientName','amount','reference','reason','app_name'] },
    { key: 'payment_failed', channel: 'whatsapp',
      body: `❌ *Pagamento não confirmado*\n\nOlá, *{{clientName}}*.\n\n⚠️ Não conseguimos confirmar o pagamento de *{{amount}}* (ref. {{reference}}).\n📝 Motivo: {{reason}}\n🔁 Tente novamente ou contacte-nos.\n\n💙 *{{app_name}}*`,
      variables: ['clientName','amount','reference','reason','app_name'] },

    // ── Lembrete de vencimento (7/3/1 dias antes, configurável) ──
    { key: 'payment_due_reminder', channel: 'email', subject: '📅 Prestação a vencer em {{daysRemaining}} dia(s)',
      body: `<p>📅 <strong>Prestação a aproximar-se</strong></p><p>Olá, <strong>{{clientName}}</strong>.</p><p>⏰ A sua prestação de <strong>{{installmentAmount}}</strong> vence em <strong>{{dueDate}}</strong> ({{daysRemaining}} dia(s)).</p><p>📄 <strong>Empréstimo:</strong> {{reference}}</p><p>💳 Pague via M-Pesa, e-Mola ou balcão para evitar juros de mora.</p><p>🔗 <a href="{{app_url}}" target="_blank">Efectuar pagamento</a></p><p>💙 <strong>{{app_name}}</strong></p>`,
      variables: ['clientName','installmentAmount','dueDate','daysRemaining','reference','app_name','app_url'] },
    { key: 'payment_due_reminder', channel: 'whatsapp',
      body: `📅 *Prestação a aproximar-se*\n\nOlá, *{{clientName}}*.\n\n⏰ A sua prestação de *{{installmentAmount}}* vence em *{{dueDate}}* ({{daysRemaining}} dia(s)).\n📄 Empréstimo: {{reference}}\n💳 Pague via M-Pesa, e-Mola ou balcão para evitar mora.\n\n🔗 {{app_url}}\n\n💙 *{{app_name}}*`,
      variables: ['clientName','installmentAmount','dueDate','daysRemaining','reference','app_name','app_url'] },

    // ── Prestação vencida / em atraso ──
    { key: 'loan_overdue', channel: 'email', subject: '⚠️ Prestação em atraso — {{reference}}',
      body: `<p>⚠️ <strong>Prestação em atraso</strong></p><p>Olá, <strong>{{clientName}}</strong>.</p><p>📅 A sua prestação venceu em <strong>{{dueDate}}</strong> e ainda não foi paga.</p><p>📆 <strong>Dias em atraso:</strong> {{daysOverdue}}</p><p>💰 <strong>Saldo em dívida:</strong> {{balance}}</p><p>📊 <strong>Mora acumulada:</strong> {{lateFee}}</p><p>🔗 <a href="{{app_url}}" target="_blank">Regularizar agora</a></p><p>💙 <strong>{{app_name}}</strong></p>`,
      variables: ['clientName','reference','dueDate','daysOverdue','balance','lateFee','app_name','app_url'] },
    { key: 'loan_overdue', channel: 'whatsapp',
      body: `⚠️ *Prestação em atraso*\n\nOlá, *{{clientName}}*.\n\n📅 Venceu em *{{dueDate}}* e ainda não foi paga.\n📆 Dias em atraso: *{{daysOverdue}}*\n💰 Saldo em dívida: *{{balance}}*\n📊 Mora acumulada: *{{lateFee}}*\n\n🔗 {{app_url}}\n\n💙 *{{app_name}}*`,
      variables: ['clientName','reference','dueDate','daysOverdue','balance','lateFee','app_name','app_url'] },

    // ── Início de juros de mora (fim do período de tolerância) ──
    { key: 'late_fee_started', channel: 'email', subject: '⚠️ Juros de mora iniciados — {{reference}}',
      body: `<p>⚠️ <strong>Juros de mora iniciados</strong></p><p>Olá, <strong>{{clientName}}</strong>.</p><p>📅 A sua prestação venceu em: <strong>{{dueDate}}</strong></p><p>⏰ O período de tolerância terminou.</p><p>⚠️ A partir de <strong>{{lateInterestStartDate}}</strong>, serão aplicados juros de mora conforme as condições do seu crédito.</p><p>💰 <strong>Saldo actual:</strong> {{balance}}</p><p>📊 <strong>Mora acumulada:</strong> {{lateInterest}}</p><p>🔗 <a href="{{app_url}}" target="_blank">Consultar o meu empréstimo</a></p><p>💙 <strong>{{app_name}}</strong></p>`,
      variables: ['clientName','reference','dueDate','lateInterestStartDate','balance','lateInterest','app_name','app_url'] },
    { key: 'late_fee_started', channel: 'whatsapp',
      body: `⚠️ *Juros de mora iniciados*\n\nOlá, *{{clientName}}*.\n\n📅 A sua prestação venceu em: *{{dueDate}}*\n⏰ O período de tolerância terminou.\n⚠️ A partir de *{{lateInterestStartDate}}*, serão aplicados juros de mora conforme as condições do seu crédito.\n\n💰 Saldo actual: *{{balance}}*\n📊 Mora acumulada: *{{lateInterest}}*\n\n🔗 {{app_url}}\n\n💙 *{{app_name}}*`,
      variables: ['clientName','reference','dueDate','lateInterestStartDate','balance','lateInterest','app_name','app_url'] },

    // ── Empréstimo liquidado ──
    { key: 'loan_completed', channel: 'email', subject: '🏆 Empréstimo liquidado — {{reference}}',
      body: `<p>🏆 <strong>Empréstimo liquidado!</strong></p><p>Parabéns, <strong>{{clientName}}</strong>! 🎉</p><p>✅ O seu empréstimo <strong>{{reference}}</strong> foi totalmente pago.</p><p>💰 <strong>Total pago:</strong> {{amount}}</p><p>🙏 Obrigado pela sua confiança e pontualidade.</p><p>🔗 <a href="{{app_url}}" target="_blank">Ver os meus créditos</a></p><p>💙 <strong>{{app_name}}</strong></p>`,
      variables: ['clientName','reference','amount','app_name','app_url'] },
    { key: 'loan_completed', channel: 'whatsapp',
      body: `🏆 *Empréstimo liquidado!*\n\nParabéns, *{{clientName}}*! 🎉\n\n✅ O seu empréstimo *{{reference}}* foi totalmente pago.\n💰 Total pago: *{{amount}}*\n🙏 Obrigado pela sua confiança e pontualidade.\n\n🔗 {{app_url}}\n\n💙 *{{app_name}}*`,
      variables: ['clientName','reference','amount','app_name','app_url'] },
  ];

  for (const t of templates) await ensureTemplate(t);

  // ── Regras de envio por omissão ──
  const rules = [
    { event: 'client_registered',     channels: ['email','whatsapp'],       notify_client: true,  notify_agent: false, notify_admin: false, delay_minutes: 0,  is_active: true },
    { event: 'kyc_submitted',         channels: ['email'],                  notify_client: true,  notify_agent: false, notify_admin: true,  delay_minutes: 0,  is_active: true },
    { event: 'kyc_approved',          channels: ['email','whatsapp'],       notify_client: true,  notify_agent: false, notify_admin: false, delay_minutes: 0,  is_active: true },
    { event: 'kyc_rejected',          channels: ['email','whatsapp'],       notify_client: true,  notify_agent: false, notify_admin: false, delay_minutes: 0,  is_active: true },
    { event: 'loan_docs_requested',   channels: ['email','whatsapp'],       notify_client: true,  notify_agent: false, notify_admin: false, delay_minutes: 0,  is_active: true },
    { event: 'loan_submitted',        channels: ['email'],                  notify_client: true,  notify_agent: false, notify_admin: true,  delay_minutes: 0,  is_active: true },
    { event: 'loan_under_review',     channels: ['email'],                  notify_client: true,  notify_agent: false, notify_admin: false, delay_minutes: 0,  is_active: true },
    { event: 'loan_approved',         channels: ['email','whatsapp'],       notify_client: true,  notify_agent: false, notify_admin: false, delay_minutes: 0,  is_active: true },
    { event: 'loan_rejected',         channels: ['email','whatsapp'],       notify_client: true,  notify_agent: false, notify_admin: false, delay_minutes: 0,  is_active: true },
    { event: 'loan_disbursed',        channels: ['email','whatsapp'],       notify_client: true,  notify_agent: false, notify_admin: false, delay_minutes: 0,  is_active: true },
    { event: 'payment_received',      channels: ['email','whatsapp'],       notify_client: true,  notify_agent: false, notify_admin: false, delay_minutes: 0,  is_active: true },
    { event: 'payment_failed',        channels: ['email'],                  notify_client: true,  notify_agent: true,  notify_admin: false, delay_minutes: 5,  is_active: true },
    { event: 'payment_due_reminder',  channels: ['whatsapp'],               notify_client: true,  notify_agent: false, notify_admin: false, delay_minutes: 0,  is_active: true },
    { event: 'loan_overdue',          channels: ['email','whatsapp'],       notify_client: true,  notify_agent: true,  notify_admin: false, delay_minutes: 0,  is_active: true },
    { event: 'late_fee_started',      channels: ['email','whatsapp'],       notify_client: true,  notify_agent: false, notify_admin: false, delay_minutes: 0,  is_active: true },
    { event: 'loan_completed',        channels: ['email','whatsapp'],       notify_client: true,  notify_agent: false, notify_admin: false, delay_minutes: 0,  is_active: true },
  ];

  for (const r of rules) await ensureRule(r);
}

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

  await seedNotificationDefaults();

  console.log('Seed concluído com sucesso!');
  console.log('\nContas de acesso:');
  console.log('  Super Admin : superadmin@mikrokredito.co.mz / demo1234');
  console.log('  Admin BO    : admin@bancooportunidade.co.mz / demo1234');
  console.log('  Cliente     : osimone@unisced.edu.mz / demo1234');
}

module.exports = seed;
module.exports.seedNotificationDefaults = seedNotificationDefaults;

if (require.main === module) {
  seed().then(() => process.exit(0)).catch(err => { console.error('Seed error:', err); process.exit(1); });
}
