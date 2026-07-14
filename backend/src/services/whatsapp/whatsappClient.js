// src/services/whatsapp/whatsappClient.js
// Sessão WhatsApp Web autenticada por QR code (whatsapp-web.js), sem API oficial da Meta.
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const logger = require('../../utils/logger');

const AUTH_DIR = path.join(__dirname, '..', '..', '..', '.wwebjs_auth');

let client = null;
let status = 'idle'; // idle | initializing | qr | authenticated | ready | disconnected | auth_failure
let qrDataUrl = null;
let lastError = null;
let readyInfo = null; // { number, pushname }

function resolveChromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const candidates = ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome'];
  return candidates.find(p => fs.existsSync(p));
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

  const { Client, LocalAuth } = require('whatsapp-web.js');

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
    try { qrDataUrl = await QRCode.toDataURL(qr); } catch (e) { logger.error('WhatsApp: falha ao gerar QR', { error: e.message }); }
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
