// src/services/whatsapp/whatsappClient.js
// Sessão WhatsApp Web autenticada por QR code (whatsapp-web.js), sem API oficial da Meta.
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');
// whatsapp-web.js e qrcode são pesados (Puppeteer/Chromium) e opcionais para o resto da
// app arrancar: são exigidos em runtime (lazy), nunca no topo do módulo. Assim, se faltar
// `npm install` destas dependências no servidor, só a funcionalidade de WhatsApp falha —
// o resto da API continua a funcionar normalmente.

const AUTH_DIR = path.join(__dirname, '..', '..', '..', '.wwebjs_auth');

let client = null;
let status = 'idle'; // idle | initializing | qr | authenticated | ready | disconnected | auth_failure
let qrDataUrl = null;
let lastError = null;
let readyInfo = null; // { number, pushname }

// Alguns sistemas (ex.: Ubuntu) têm um /usr/bin/chromium-browser que é só um script
// de aviso ("requires the chromium snap"), não um binário funcional. Por isso nunca
// confiamos apenas na existência do ficheiro — testamos se ele corre mesmo.
function isWorkingBinary(p) {
  if (!p) return false;
  try {
    require('child_process').execSync(`"${p}" --version`, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 8000 });
    return true;
  } catch (e) { return false; }
}

function resolveChromePath() {
  const candidates = [];
  if (process.env.PUPPETEER_EXECUTABLE_PATH) candidates.push(process.env.PUPPETEER_EXECUTABLE_PATH);
  candidates.push('/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome');

  for (const p of candidates) {
    if (fs.existsSync(p) && isWorkingBinary(p)) return p;
  }

  // Tenta resolver pelo PATH (útil em Nix/Nixpacks, onde o caminho tem hash variável).
  try {
    const { execSync } = require('child_process');
    for (const bin of ['chromium', 'chromium-browser', 'google-chrome']) {
      try {
        const resolved = execSync(`which ${bin}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        if (isWorkingBinary(resolved)) return resolved;
      } catch (e) { /* não encontrado, tenta o próximo */ }
    }
  } catch (e) {}

  // Nada de sistema funcional encontrado — deixa o Puppeteer usar o Chromium que
  // descarregou para si próprio no `npm install` (funciona em ambientes glibc/Ubuntu).
  return undefined;
}

function normalizeToChatId(phone) {
  let clean = String(phone || '').replace(/\s+/g, '').replace(/[^0-9+]/g, '');
  if (clean.startsWith('+')) clean = clean.slice(1);
  if (!clean.startsWith('258') && clean.length === 9) clean = `258${clean}`;
  return `${clean}@c.us`;
}

function hasExistingSession() {
  try { return fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length > 0; }
  catch (e) { return false; }
}

async function initialize() {
  if (client || status === 'initializing') return; // já em curso
  status = 'initializing';
  lastError = null;

  let Client, LocalAuth;
  try {
    ({ Client, LocalAuth } = require('whatsapp-web.js'));
  } catch (err) {
    status = 'auth_failure';
    lastError = 'Dependência whatsapp-web.js não instalada no servidor. Corra "npm install" no backend e reinicie.';
    logger.error('WhatsApp: whatsapp-web.js não está instalado', { error: err.message });
    return;
  }

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: AUTH_DIR }),
    puppeteer: {
      headless: true,
      executablePath: resolveChromePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  });

  client.on('qr', async (qr) => {
    status = 'qr';
    try {
      const QRCode = require('qrcode');
      qrDataUrl = await QRCode.toDataURL(qr);
    } catch (e) { logger.error('WhatsApp: falha ao gerar QR (dependência qrcode em falta?)', { error: e.message }); }
    logger.info('WhatsApp: código QR gerado, aguardando leitura');
  });

  client.on('authenticated', () => {
    status = 'authenticated';
    qrDataUrl = null;
    logger.info('WhatsApp: sessão autenticada');
  });

  client.on('ready', () => {
    status = 'ready';
    qrDataUrl = null;
    readyInfo = { number: client.info?.wid?.user || null, pushname: client.info?.pushname || null };
    logger.info('WhatsApp: cliente pronto', readyInfo);
  });

  client.on('auth_failure', (msg) => {
    status = 'auth_failure';
    lastError = String(msg);
    logger.error('WhatsApp: falha de autenticação', { msg });
  });

  client.on('disconnected', (reason) => {
    status = 'disconnected';
    lastError = String(reason);
    readyInfo = null;
    qrDataUrl = null;
    logger.warn('WhatsApp: sessão desligada', { reason });
    client = null;
  });

  try {
    await client.initialize();
  } catch (err) {
    status = 'auth_failure';
    lastError = err.message;
    logger.error('WhatsApp: falha ao inicializar', { error: err.message });
    client = null;
  }
}

// Reconecta silenciosamente no arranque do servidor, só se já existir sessão gravada.
async function autoInitIfSessionExists() {
  if (hasExistingSession()) {
    logger.info('WhatsApp: sessão gravada encontrada, a reconectar...');
    await initialize();
  }
}

function getStatus() {
  return { status, qr: qrDataUrl, error: lastError, info: readyInfo };
}

async function logout() {
  if (client) {
    try { await client.logout(); } catch (e) {}
    try { await client.destroy(); } catch (e) {}
  }
  client = null;
  status = 'idle';
  qrDataUrl = null;
  readyInfo = null;
  lastError = null;
}

async function sendMessage(to, body) {
  if (!client || status !== 'ready') throw new Error('WhatsApp não está ligado. Ligue a sessão em Super Admin → WhatsApp.');
  const chatId = normalizeToChatId(to);
  const result = await client.sendMessage(chatId, body);
  return { provider: 'whatsapp_web_js', messageId: result?.id?._serialized || result?.id?.id || null };
}

module.exports = { initialize, autoInitIfSessionExists, getStatus, logout, sendMessage };
