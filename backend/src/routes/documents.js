// src/routes/documents.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { Document, Client, User } = require('../models');
const { Op } = require('sequelize');
const { authenticate, authorize } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { notifyAffectedUser } = require('../services/userActionNotifier');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'documents');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = (process.env.ALLOWED_MIME_TYPES || 'application/pdf,image/jpeg,image/png')
    .split(',');
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error(`Tipo de ficheiro não permitido: ${file.mimetype}`), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024 }
});

// ── Upload document
router.post('/upload',
  authenticate,
  upload.single('file'),
  audit('document_uploaded'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'Nenhum ficheiro fornecido' });

      let { doc_type, client_id, loan_id } = req.body;
      const aliases = { residence: 'residence_certificate', atestado_residencia: 'residence_certificate', salary_slip: 'income_proof' };
      doc_type = aliases[doc_type] || doc_type;

      // Resolve client_id for client role
      let resolvedClientId = client_id;
      if (req.user.role === 'client') {
        const client = await Client.findOne({ where: { user_id: req.user.id } });
        resolvedClientId = client?.id;
      }

      if (!resolvedClientId) return res.status(400).json({ success: false, message: 'Cliente não identificado para o documento' });

      // Mantém uma referência por tipo quando o documento é do perfil. Reupload substitui o anterior.
      if (!loan_id) {
        const oldDocs = await Document.findAll({ where: { client_id: resolvedClientId, type: doc_type || 'other', loan_id: { [Op.is]: null } } });
        for (const old of oldDocs) {
          if (old.file_path && fs.existsSync(old.file_path)) fs.unlinkSync(old.file_path);
          await old.destroy();
        }
      }

      const doc = await Document.create({
        id: uuidv4(),
        client_id: resolvedClientId,
        loan_id: loan_id || null,
        type: doc_type || 'other',
        original_name: req.file.originalname,
        file_name: req.file.filename,
        file_path: req.file.path,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        uploaded_by: req.user.id,
        status: 'pending',
      });

      const owner = await Client.findByPk(resolvedClientId, { include: [User] });
      await notifyAffectedUser({ user: owner?.User, actor: req.user, institutionId: req.user.institution_id, action: 'document_uploaded', subject: 'Documento carregado - MicroCredit SYSTEM', body: `<p>Prezado(a) ${owner?.User?.full_name || 'Cliente'},</p><p>Foi carregado/actualizado um documento no seu perfil: <strong>${doc_type || 'outro'}</strong>.</p>`, metadata: { document_id: doc.id, document_type: doc_type } });

      res.status(201).json({
        success: true,
        data: {
          ...doc.toJSON(),
          url: `/uploads/documents/${req.file.filename}`,
        }
      });
    } catch (err) { next(err); }
  }
);

// ── List documents
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { client_id, loan_id, type, status } = req.query;
    const where = {};
    if (client_id) where.client_id = client_id;
    if (loan_id) where.loan_id = loan_id;
    if (type) where.type = type;
    if (status) where.status = status;

    if (req.user.role === 'client') {
      const client = await Client.findOne({ where: { user_id: req.user.id } });
      where.client_id = client?.id;
    }

    const docs = await Document.findAll({ where, order: [['created_at', 'DESC']] });
    res.json({ success: true, data: docs.map(d => ({
      ...d.toJSON(),
      url: `/uploads/documents/${d.file_name}`,
    }))});
  } catch (err) { next(err); }
});


// ── Download document with access control
router.get('/:id/download', authenticate, async (req, res, next) => {
  try {
    const doc = await Document.findByPk(req.params.id, { include: [Client] });
    if (!doc) return res.status(404).json({ success: false, message: 'Documento não encontrado' });
    if (req.user.role === 'client') {
      const client = await Client.findOne({ where: { user_id: req.user.id } });
      if (!client || client.id !== doc.client_id) return res.status(403).json({ success: false, message: 'Acesso negado' });
    }
    if (!doc.file_path || !fs.existsSync(doc.file_path)) return res.status(404).json({ success: false, message: 'Ficheiro físico não encontrado no servidor' });
    res.download(doc.file_path, doc.original_name || doc.file_name);
  } catch (err) { next(err); }
});

// ── Review document (approve/reject)
router.patch('/:id/review',
  authenticate,
  authorize('inst_admin', 'inst_agent', 'super_admin'),
  async (req, res, next) => {
    try {
      const doc = await Document.findByPk(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: 'Documento não encontrado' });
      await doc.update({ status: req.body.status, rejection_reason: req.body.reason });
      const owner = await Client.findByPk(doc.client_id, { include: [User] });
      await notifyAffectedUser({ user: owner?.User, actor: req.user, institutionId: req.user.institution_id, action: 'document_reviewed', subject: 'Documento revisto - MicroCredit SYSTEM', body: `<p>Prezado(a) ${owner?.User?.full_name || 'Cliente'},</p><p>O documento <strong>${doc.type}</strong> foi actualizado para o estado: <strong>${req.body.status}</strong>.</p>`, metadata: { document_id: doc.id, status: req.body.status } });
      res.json({ success: true, data: doc });
    } catch (err) { next(err); }
  }
);

// ── Delete document
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Documento não encontrado' });

    // Delete file
    if (fs.existsSync(doc.file_path)) fs.unlinkSync(doc.file_path);
    await doc.destroy();

    res.json({ success: true, message: 'Documento eliminado' });
  } catch (err) { next(err); }
});

module.exports = router;
