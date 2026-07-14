// src/models/clean.js
// Apaga todos os dados inseridos nas tabelas.
// Uso local/dev:  npm run clean          (pede para escrever "sim"; repõe dados de demonstração)
//                 npm run clean -- --yes (sem confirmação)
//
// Modo --minimal: em vez de repor os dados de demonstração (instituições/produtos/cliente
// fictícios), cria apenas UMA conta de super admin, pronta para começar a usar o sistema
// com dados reais. Lê SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD / SUPER_ADMIN_NAME do .env
// se existirem; caso contrário pergunta no terminal.
//   npm run clean -- --minimal
//
// Uso em produção (NODE_ENV=production): exige a flag extra --force-production
//                 e, na confirmação, escrever o nome exacto da base de dados (não "sim"),
//                 para nunca ser possível apagar produção por engano ou hábito.
//   npm run clean -- --force-production --minimal
//   npm run clean -- --force-production --minimal --yes   (sem prompt — use com muito cuidado)
require('dotenv').config();
const readline = require('readline');
const { sequelize } = require('./index');
const seed = require('./seed');

const isProduction = process.env.NODE_ENV === 'production';
const forceProduction = process.argv.includes('--force-production');
const skipConfirm = process.argv.includes('--yes') || process.argv.includes('-y');
const minimal = process.argv.includes('--minimal');

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer); }));
}

async function createSuperAdminOnly() {
  const { User } = require('./index');
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');

  let email = process.env.SUPER_ADMIN_EMAIL;
  let password = process.env.SUPER_ADMIN_PASSWORD;
  const fullName = process.env.SUPER_ADMIN_NAME || 'Super Admin';

  if (!email) email = (await confirm('Email do super admin: ')).trim();
  if (!password) password = (await confirm('Password do super admin (fica visível no terminal): ')).trim();

  if (!email || !password || password.length < 6) {
    console.error('Email/password inválidos (a password precisa de pelo menos 6 caracteres).');
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(password, 12);
  await User.create({
    id: uuidv4(), full_name: fullName, email, password_hash,
    role: 'super_admin', status: 'active', email_verified: true,
  });
  console.log(`\nSuper admin criado com sucesso: ${email}`);
}

async function clean() {
  if (isProduction && !forceProduction) {
    console.error('Recusado: NODE_ENV=production. Para limpar mesmo em produção, corra com a flag --force-production (acção deliberada).');
    process.exit(1);
  }

  const repoDescription = minimal ? 'e criar só a conta de super admin' : 'e repor os dados de demonstração';

  if (!skipConfirm) {
    const expected = isProduction ? String(process.env.DB_NAME) : 'sim';
    const prompt = isProduction
      ? `⚠️  PRODUÇÃO — isto vai APAGAR TODOS OS DADOS REAIS da base "${process.env.DB_NAME}" ${repoDescription}.\nEscreva o nome exacto da base de dados ("${process.env.DB_NAME}") para confirmar: `
      : `Isto vai APAGAR todos os dados da base "${process.env.DB_NAME}" ${repoDescription}.\nEscreva "sim" para continuar: `;
    const answer = await confirm(prompt);
    if (answer.trim().toLowerCase() !== expected.toLowerCase()) {
      console.log('Cancelado.');
      return;
    }
  }

  const tables = Object.values(sequelize.models).map(m => `"${m.getTableName()}"`).join(', ');
  console.log(`A limpar tabelas: ${tables}`);
  await sequelize.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`);
  console.log('Tabelas limpas.\n');

  if (minimal) {
    await createSuperAdminOnly();
  } else {
    await seed();
  }
}

clean()
  .then(() => process.exit(0))
  .catch(err => { console.error('Erro ao limpar dados:', err); process.exit(1); });
