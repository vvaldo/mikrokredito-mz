// src/services/accountAccess.js
//
// Concede acesso à plataforma a um cliente recém-criado (ou re-emite um acesso perdido) SEM
// nunca expor uma palavra-passe em texto simples por email/WhatsApp/SMS e sem nunca ler uma
// password já existente da base de dados (não é possível — só o hash é guardado). Em vez disso
// gera-se sempre um token seguro, único e de uso único (reutilizando reset_token/
// reset_token_expires do User, o MESMO mecanismo que já suporta "Esqueci a palavra-passe"),
// válido por um número limitado de horas, que o cliente troca por uma password própria em
// /set-password. O link é enviado dentro da MESMA mensagem de boas-vindas (evento
// client_registered) — nunca como uma segunda mensagem separada.
const crypto = require('crypto');
const { triggerEvent } = require('./notification/notificationService');

// Alfabeto sem caracteres ambíguos (0/O, 1/l/I) — o token é lido/copiado por humanos quando o
// link falha ou é reenviado manualmente por um agente.
const TOKEN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const TOKEN_LENGTH = 10; // dentro do validador já existente em auth.js: isLength({min:6,max:12})
const TOKEN_TTL_HOURS = 24;

// Email fabricado pela UI quando o operador marca "sem conta" (o cliente não vai aceder à
// plataforma) — nunca é um endereço real, por isso nunca deve receber um link de acesso.
const FAKE_EMAIL_SUFFIX = '@semconta.mikrokredito.local';

function isRealEmail(email) {
  return !!email && !String(email).toLowerCase().endsWith(FAKE_EMAIL_SUFFIX);
}

function generateToken(length = TOKEN_LENGTH) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  return out;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Emite um novo token de definição de password para `user`, invalidando qualquer token anterior
// (é sempre sobrescrito — nunca coexistem dois tokens válidos). Só o hash SHA-256 é persistido.
async function issuePasswordSetupToken(user, ttlHours = TOKEN_TTL_HOURS) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  await user.update({ reset_token: hashToken(token), reset_token_expires: expiresAt });
  return { token, expiresAt };
}

function buildPasswordSetupUrl(email, token) {
  const base = (process.env.FRONTEND_URL || 'https://microcredito.otech.co.mz').replace(/\/+$/, '');
  return `${base}/set-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
}

// Envia a mensagem de boas-vindas com o link seguro de acesso (evento client_registered),
// pelos canais/regras já activos no NotificationService — nunca calcula nem decide canais aqui,
// só passa os dados. Ignorado (sem erro) quando o cliente não tem um email real (caso "sem
// conta"): não faz sentido gerar um link de acesso que nunca vai ser usado.
async function sendWelcomeWithAccess({ user, client, institutionId = null, institutionName = null }) {
  if (!isRealEmail(user.email)) {
    return { skipped: true, reason: 'no_real_account' };
  }
  const { token, expiresAt } = await issuePasswordSetupToken(user);
  const passwordSetupUrl = buildPasswordSetupUrl(user.email, token);

  await triggerEvent('client_registered', {
    institutionId,
    clientId: client?.id || null,
    recipientEmail: user.email,
    recipientPhone: user.phone,
    data: {
      clientName: user.full_name,
      loginEmail: user.email,
      passwordSetupUrl,
      institutionName: institutionName || undefined,
    },
  });

  return { skipped: false, passwordSetupUrl, expiresAt };
}

module.exports = {
  TOKEN_TTL_HOURS,
  FAKE_EMAIL_SUFFIX,
  isRealEmail,
  generateToken,
  hashToken,
  issuePasswordSetupToken,
  buildPasswordSetupUrl,
  sendWelcomeWithAccess,
};
