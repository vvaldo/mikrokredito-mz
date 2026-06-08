// src/services/notification/providers/emailProvider.js
const nodemailer = require('nodemailer');
const { Institution } = require('../../../models');
const logger = require('../../../utils/logger');

function clean(v){ return String(v || '').trim().replace(/^['\"]|['\"]$/g, ''); }
function baseCfg(){
  return {
    host: clean(process.env.SMTP_HOST) || 'mail.otech.co.mz',
    port: parseInt(process.env.SMTP_PORT,10) || 465,
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    user: clean(process.env.SMTP_USER || process.env.EMAIL_FROM || 'comercial@otech.co.mz'),
    pass: clean(process.env.SMTP_PASS),
  };
}
function candidateConfigs(){
  const c=baseCfg();
  const list=[c,{...c,port:587,secure:false,requireTLS:true},{...c,port:465,secure:true},{...c,port:25,secure:false}];
  const seen=new Set();
  return list.filter(x=>{const k=`${x.host}:${x.port}:${x.secure}`; if(seen.has(k)) return false; seen.add(k); return true;});
}
function createTransporter(cfg){
  return nodemailer.createTransport({
    host: cfg.host, port: cfg.port, secure: cfg.secure, requireTLS: !!cfg.requireTLS,
    auth: { user: cfg.user, pass: cfg.pass }, authMethod: 'LOGIN', tls: { rejectUnauthorized: false },
  });
}
async function sendWithFallback(mail){
  const errors=[];
  for(const cfg of candidateConfigs()){
    try{
      const info=await createTransporter(cfg).sendMail(mail);
      return {info,cfg};
    }catch(err){
      errors.push(`${cfg.host}:${cfg.port}/${cfg.secure?'ssl':'tls'} -> ${err.message}`);
      logger.warn('SMTP attempt failed',{host:cfg.host,port:cfg.port,secure:cfg.secure,error:err.message});
    }
  }
  const e=new Error('Falha SMTP. Verifique servidor, porta, utilizador e senha. Detalhe: '+errors.join(' | '));
  e.smtpAttempts=errors; throw e;
}
async function send({ to, subject, body, institutionId }) {
  if (!to) throw new Error('Email recipient is required');
  let fromName = process.env.EMAIL_FROM_NAME || 'OTECH - MicroCredit SYSTEM';
  let fromEmail = clean(process.env.EMAIL_FROM || process.env.SMTP_USER || 'comercial@otech.co.mz');
  if (institutionId) {
    const inst = await Institution.findByPk(institutionId);
    if (inst?.notif_email_from) fromEmail = inst.notif_email_from;
    if (inst?.notif_sender_name) fromName = inst.notif_sender_name;
  }
  const {info,cfg}=await sendWithFallback({
    from: `"${fromName}" <${fromEmail}>`, to, subject: subject || 'Notificação MicroCredit SYSTEM',
    html: wrapHtml(body, fromName), text: String(body||'').replace(/<[^>]*>/g, ''),
  });
  logger.debug('Email sent', { messageId: info.messageId, to, host: cfg.host, port: cfg.port });
  return { provider: `smtp:${cfg.host}:${cfg.port}`, messageId: info.messageId };
}
function wrapHtml(body, senderName) { return `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}.container{max-width:600px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)}.header{background:#185FA5;color:#fff;padding:20px 28px;font-size:18px;font-weight:700}.body{padding:24px 28px;color:#374151;line-height:1.6}.footer{background:#f9fafb;padding:14px 28px;font-size:11px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb}</style></head><body><div class="container"><div class="header">${senderName}</div><div class="body">${body}</div><div class="footer">Mensagem automática enviada por ${senderName}.</div></div></body></html>`; }
module.exports = { send, candidateConfigs };
