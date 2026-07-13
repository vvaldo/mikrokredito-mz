// src/models/clean.js
// Apaga todos os dados inseridos nas tabelas e repõe os dados de demonstração (seed.js).
// Uso:  npm run clean          (pede confirmação)
//       npm run clean -- --yes (sem confirmação)
require('dotenv').config();
const readline = require('readline');
const { sequelize } = require('./index');
const seed = require('./seed');

const skipConfirm = process.argv.includes('--yes') || process.argv.includes('-y');

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer); }));
}

async function clean() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Recusado: NODE_ENV=production. Este script não pode correr em produção.');
    process.exit(1);
  }

  if (!skipConfirm) {
    const answer = await confirm(
      `Isto vai APAGAR todos os dados da base "${process.env.DB_NAME}" e repor os dados de demonstração.\nEscreva "sim" para continuar: `
    );
    if (answer.trim().toLowerCase() !== 'sim') {
      console.log('Cancelado.');
      return;
    }
  }

  const tables = Object.values(sequelize.models).map(m => `"${m.getTableName()}"`).join(', ');
  console.log(`A limpar tabelas: ${tables}`);
  await sequelize.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`);
  console.log('Tabelas limpas.\n');

  await seed();
}

clean()
  .then(() => process.exit(0))
  .catch(err => { console.error('Erro ao limpar dados:', err); process.exit(1); });
