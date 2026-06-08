// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token de acesso requerido' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, { attributes: { exclude: ['password_hash'] } });

    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Utilizador inactivo ou não encontrado' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token inválido ou expirado' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Sem permissão para esta acção' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
