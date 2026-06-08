const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const { candidateConfigs } = require('../services/notification/providers/emailProvider');

function mask(value = '') { if (!value) return ''; if (value.length <= 4) return '****'; return `${value.slice(0, 2)}***${value.slice(-2)}`; }
function clean(v){ return String(v || '').trim().replace(/^['\"]|['\"]$/g, ''); }
function getSmtpConfig() {
  return {
    host: clean(process.env.SMTP_HOST) || 'mail.otech.co.mz',
    port: parseInt(process.env.SMTP_PORT, 10) || 465,
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    user: clean(process.env.SMTP_USER || 'comercial@otech.co.mz'),
    pass: clean(process.env.SMTP_PASS || ''),
    fromEmail: clean(process.env.EMAIL_FROM || process.env.SMTP_USER || 'comercial@otech.co.mz'),
    fromName: process.env.EMAIL_FROM_NAME || 'OTECH - MicroCredit SYSTEM',
    defaultTo: process.env.SMTP_TEST_DEFAULT_TO || process.env.SMTP_USER || 'comercial@otech.co.mz',
  };
}
async function sendWithFallback(mail) {
  const errors=[];
  for(const cfg of candidateConfigs()){
    try{
      const transporter = nodemailer.createTransport({ host: cfg.host, port: cfg.port, secure: cfg.secure, requireTLS: !!cfg.requireTLS, auth: { user: cfg.user, pass: cfg.pass }, authMethod: 'LOGIN', tls: { rejectUnauthorized: false } });
      const info = await transporter.sendMail(mail);
      return { info, cfg };
    }catch(err){ errors.push(`${cfg.host}:${cfg.port}/${cfg.secure?'ssl':'tls'} -> ${err.message}`); }
  }
  const e = new Error('Falha SMTP: ' + errors.join(' | ')); e.status = 502; throw e;
}
router.get('/config', (req, res) => { const cfg=getSmtpConfig(); res.json({success:true,data:{host:cfg.host,port:cfg.port,secure:cfg.secure,user:cfg.user,password:mask(cfg.pass),fromEmail:cfg.fromEmail,fromName:cfg.fromName,defaultTo:cfg.defaultTo}}); });
router.post('/send', async (req, res, next) => {
  try {
    const cfg = getSmtpConfig();
    const to = req.body?.to || cfg.defaultTo;
    const subject = req.body?.subject || 'Teste SMTP — MicroCredit SYSTEM / OTECH';
    const message = req.body?.message || 'Este é um email de teste enviado pela página de teste SMTP do MicroCredit SYSTEM.';
    if (!cfg.pass) return res.status(400).json({ success: false, message: 'SMTP_PASS não está configurado no ficheiro .env.' });
    const {info, cfg: used} = await sendWithFallback({ from: `"${cfg.fromName}" <${cfg.fromEmail}>`, to, subject, text: message, html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;border:1px solid #dbeafe;border-radius:14px;overflow:hidden"><div style="background:#185FA5;color:#fff;padding:18px 22px;font-size:18px;font-weight:700">${cfg.fromName}</div><div style="padding:22px;color:#1f2937;line-height:1.6"><p>${String(message).replace(/\n/g,'<br>')}</p><p style="font-size:12px;color:#6b7280;margin-top:18px">Servidor SMTP usado: ${used.host}:${used.port}</p></div></div>` });
    res.json({ success: true, message: 'Email de teste enviado com sucesso.', data: { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected, response: info.response, host: used.host, port: used.port } });
  } catch (err) { next(err); }
});
router.post('/verify', async (req, res, next) => { try { const errors=[]; for(const cfg of candidateConfigs()){ try{ const t=nodemailer.createTransport({host:cfg.host,port:cfg.port,secure:cfg.secure,requireTLS:!!cfg.requireTLS,auth:{user:cfg.user,pass:cfg.pass},authMethod:'LOGIN',tls:{rejectUnauthorized:false}}); await t.verify(); return res.json({success:true,message:'Ligação SMTP validada com sucesso.',data:{host:cfg.host,port:cfg.port}}); }catch(e){errors.push(`${cfg.host}:${cfg.port} -> ${e.message}`)} } res.status(502).json({success:false,message:'Falha SMTP: '+errors.join(' | ')}); } catch(err){ next(err); }});
module.exports = router;
