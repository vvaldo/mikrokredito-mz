// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./utils/logger');

const app = express();
app.set('trust proxy', 1);

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
}));

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Demasiadas requisições. Tente novamente em 15 minutos.' }
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) }
}));

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
const API = process.env.API_PREFIX || '/api/v1';
app.use(`${API}/auth`, require('./routes/auth'));
app.use(`${API}/institutions`, require('./routes/institutions'));
app.use(`${API}/products`, require('./routes/products'));
app.use(`${API}/clients`, require('./routes/clients'));
app.use(`${API}/loans`, require('./routes/loans'));
app.use(`${API}/payments`, require('./routes/payments'));
app.use(`${API}/notifications`, require('./routes/notifications'));
app.use(`${API}/documents`, require('./routes/documents'));
app.use(`${API}/audit`, require('./routes/audit'));
app.use(`${API}/dashboard`, require('./routes/dashboard'));
app.use(`${API}/reports`, require('./routes/reports'));
app.use(`${API}/smtp-test`, require('./routes/smtpTest'));
app.use(`${API}/users`, require('./routes/users'));
app.use(`${API}/roles`, require('./routes/roles'));
app.use(`${API}/platform-settings`, require('./routes/platformSettings'));
app.use(`${API}/whatsapp`, require('./routes/whatsapp'));

// Health check
app.get('/health', (req, res) => res.json({
  status: 'ok', version: '1.0.0', timestamp: new Date().toISOString()
}));

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Rota não encontrada' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
