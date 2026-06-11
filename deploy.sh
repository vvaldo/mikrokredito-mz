#!/bin/bash
# ================================================================
# MikroKrédito MZ — Deploy Script
# Corra este script na pasta do projecto no servidor
# ================================================================
set -e

echo "🔄 A actualizar código..."
git pull origin main

echo "📦 A instalar dependências frontend..."
cd frontend
npm install

echo "🔨 A compilar frontend..."
npm run build
cd ..

echo "📦 A instalar dependências backend..."
cd backend
npm install
cd ..

echo "♻️  A reiniciar serviços..."
# Uncomment the method you use:
# docker compose restart frontend backend
# pm2 restart all
# systemctl restart mikrokredito-frontend mikrokredito-backend

echo "✅ Deploy concluído!"
echo ""
echo "⚠️  Se o login ainda mostrar nome antigo:"
echo "   Abra o browser em modo privado / incógnito"
echo "   (o localStorage antigo causa o texto antigo)"
