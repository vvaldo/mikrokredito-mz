#!/usr/bin/env node
// Run inside backend container: node migrate.js
const { Sequelize } = require('sequelize')
require('dotenv').config()

const seq = new Sequelize(process.env.DATABASE_URL || process.env.DB_URL, { logging: console.log })

async function migrate() {
  const qi = seq.getQueryInterface()
  const cols = await qi.describeTable('clients')

  const toAdd = [
    ['doc_type',           { type: Sequelize.DataTypes.STRING(50) }],
    ['doc_issue_date',     { type: Sequelize.DataTypes.DATEONLY }],
    ['doc_expiry_date',    { type: Sequelize.DataTypes.DATEONLY }],
    ['birth_place',        { type: Sequelize.DataTypes.STRING(255) }],
    ['employment_type',    { type: Sequelize.DataTypes.STRING(50) }],
    ['employer_name',      { type: Sequelize.DataTypes.STRING(255) }],
    ['employer_location',  { type: Sequelize.DataTypes.STRING(255) }],
    ['dependents',         { type: Sequelize.DataTypes.INTEGER, defaultValue: 0 }],
    ['guarantors',         { type: Sequelize.DataTypes.JSONB, defaultValue: [] }],
    ['photo_url',          { type: Sequelize.DataTypes.TEXT }],
  ]

  for (const [name, def] of toAdd) {
    if (!cols[name]) {
      await qi.addColumn('clients', name, def)
      console.log(`✅ Added: clients.${name}`)
    } else {
      console.log(`⏭  Skip: clients.${name} already exists`)
    }
  }

  const nlCols = await qi.describeTable('notification_logs')
  if (!nlCols.read_at) {
    await qi.addColumn('notification_logs', 'read_at', { type: Sequelize.DataTypes.DATE })
    console.log('✅ Added: notification_logs.read_at')
  }
  if (!nlCols.read_by_user_id) {
    await qi.addColumn('notification_logs', 'read_by_user_id', { type: Sequelize.DataTypes.UUID })
    console.log('✅ Added: notification_logs.read_by_user_id')
  }

  console.log('\n🎉 Migration complete!')
  await seq.close()
}

migrate().catch(e => { console.error('❌ Error:', e.message); process.exit(1) })
