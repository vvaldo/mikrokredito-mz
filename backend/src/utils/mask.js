// src/utils/mask.js
//
// Mascarar dados sensíveis para exibição (nunca usado para o envio real — só para o que é
// mostrado a um humano, ex.: listagens de logs). Nunca mostrar um token ou password completos.

function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return '***';
  const [user, domain] = email.split('@');
  const visible = user.slice(0, 1) || '*';
  return `${visible}${'*'.repeat(Math.max(user.length - 1, 3))}@${domain}`;
}

function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '***';
  const digits = phone.replace(/\s+/g, '');
  if (digits.length <= 4) return '*'.repeat(digits.length);
  return `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`;
}

module.exports = { maskEmail, maskPhone };
