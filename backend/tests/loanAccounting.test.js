// backend/tests/loanAccounting.test.js
//
// Teste de regressão matemático, sem dependências externas nem base de dados — corre com:
//   node tests/loanAccounting.test.js
// (ou `npm test`, ver package.json).
//
// Reproduz o caso real do empréstimo EMP-557509 (Domingos Jose Antônio Junior) que expôs o
// bug: a mora vencida antes de um pagamento estava a ser apagada durante a reconstrução do
// histórico, e o sistema "saltava" dinheiro para a prestação seguinte antes de a prestação
// corrente estar 100% liquidada (capital + juros + mora).

const assert = require('assert');
const { replayLoan, round2 } = require('../src/services/loanAccounting');

function approx(actual, expected, msg) {
  assert.ok(Math.abs(actual - expected) < 0.01, `${msg}: esperado ${expected}, obtido ${actual}`);
}

function testDomingosCase() {
  const RATE = 0.005; // 0.5% ao dia — late_fee_rate por omissão dos produtos (seed.js)

  const schedules = [
    { id: 's1', due_date: '2026-07-02', total_due: 4098 },
    { id: 's2', due_date: '2026-08-02', total_due: 4098 },
    { id: 's3', due_date: '2026-09-02', total_due: 4098 },
  ];

  const transactions = [
    { id: 'PAG-980452', amount: 4090, created_at: '2026-07-29T10:43:00' },
    { id: 'PAG-917187', amount: 800, created_at: '2026-08-06T12:01:00' },
  ];

  const today = new Date('2026-08-06T12:01:00');
  const { schedules: result, allocationsByTx, unallocatedByTx } = replayLoan(schedules, transactions, RATE, today);

  const s1 = result.find(s => s.id === 's1');
  const s2 = result.find(s => s.id === 's2');
  const s3 = result.find(s => s.id === 's3');

  // Prestação 1: mora de 27 dias (02/07→29/07) sobre 4098, mais 8 dias adicionais
  // (29/07→06/08) sobre o resíduo de 8 MTn que restava de capital+juros = 553.23 + 0.32.
  approx(s1.late_fee, 553.55, 'Prestação 1 — mora final (não pode ter sido apagada)');
  approx(s1.total_paid, 4651.55, 'Prestação 1 — total imputado (capital+juros+mora)');
  assert.strictEqual(s1.status, 'paid', 'Prestação 1 devia estar paga (capital+juros+mora cobertos)');

  // Prestação 2: só recebe o excedente do 2º pagamento (238.45), depois de a Prestação 1
  // ficar 100% coberta — nunca antes disso.
  approx(s2.late_fee, 81.96, 'Prestação 2 — mora acumulada até 06/08 (4 dias sobre 4098)');
  approx(s2.total_paid, 238.45, 'Prestação 2 — só o excedente do pagamento de 06/08');
  assert.strictEqual(s2.status, 'overdue', 'Prestação 2 continua em falta');

  // Prestação 3: ainda não venceu — não deve ter recebido nada nem mora.
  approx(s3.late_fee, 0, 'Prestação 3 — sem mora (ainda não venceu)');
  approx(s3.total_paid, 0, 'Prestação 3 — nada imputado');
  assert.strictEqual(s3.status, 'pending');

  // Conservação: tudo o que foi recebido está imputado nalguma prestação (nada "perdido").
  const totalImputado = round2(result.reduce((sum, s) => sum + s.total_paid, 0));
  const totalRecebido = round2(transactions.reduce((sum, t) => sum + t.amount, 0));
  assert.strictEqual(totalImputado, totalRecebido, 'Total imputado deve reconciliar com total recebido (4890)');

  // O 1º pagamento (4090) fica 100% na Prestação 1 — não "salta" para a 2 só por estar
  // próximo do valor original dela.
  assert.deepStrictEqual(allocationsByTx['PAG-980452'].map(a => a.schedule_id), ['s1']);
  approx(allocationsByTx['PAG-980452'][0].amount, 4090, 'PAG-980452 100% na Prestação 1');

  // O 2º pagamento (800) fecha o resto da Prestação 1 (561.55) e só o excedente (238.45)
  // vai para a Prestação 2.
  const alloc2 = allocationsByTx['PAG-917187'];
  assert.strictEqual(alloc2.length, 2, 'PAG-917187 deve tocar exactamente 2 prestações');
  assert.strictEqual(alloc2[0].schedule_id, 's1');
  approx(alloc2[0].amount, 561.55, 'PAG-917187 — parte que fecha a Prestação 1');
  assert.strictEqual(alloc2[1].schedule_id, 's2');
  approx(alloc2[1].amount, 238.45, 'PAG-917187 — excedente para a Prestação 2');

  assert.strictEqual(Object.keys(unallocatedByTx).length, 0, 'Sem valor por imputar neste caso');

  console.log('✓ EMP-557509 (Domingos): mora preservada por data real de cada pagamento, sem salto indevido entre prestações.');
}

function testAdditionalCases() {
  const RATE = 0.005;

  // Pagamento antes do vencimento — não gera mora.
  {
    const schedules = [{ id: 'a1', due_date: '2026-09-01', total_due: 1000 }];
    const txs = [{ id: 't1', amount: 1000, created_at: '2026-08-20T00:00:00' }];
    const { schedules: res } = replayLoan(schedules, txs, RATE, new Date('2026-08-20'));
    approx(res[0].late_fee, 0, 'Pagamento antecipado não gera mora');
    assert.strictEqual(res[0].status, 'paid');
  }

  // Pagamento que liquida exactamente a prestação, sem sobra.
  {
    const schedules = [{ id: 'b1', due_date: '2026-07-01', total_due: 500 }];
    const txs = [{ id: 't2', amount: 500, created_at: '2026-07-01T00:00:00' }];
    const { schedules: res } = replayLoan(schedules, txs, RATE, new Date('2026-07-01'));
    approx(res[0].total_paid, 500);
    assert.strictEqual(res[0].status, 'paid');
  }

  // Pagamento superior ao saldo cobre duas prestações (FIFO).
  {
    const schedules = [
      { id: 'c1', due_date: '2026-07-01', total_due: 500 },
      { id: 'c2', due_date: '2026-08-01', total_due: 500 },
    ];
    const txs = [{ id: 't3', amount: 800, created_at: '2026-07-01T00:00:00' }];
    const { schedules: res, allocationsByTx } = replayLoan(schedules, txs, RATE, new Date('2026-07-01'));
    approx(res[0].total_paid, 500); assert.strictEqual(res[0].status, 'paid');
    approx(res[1].total_paid, 300); assert.strictEqual(res[1].status, 'partial');
    assert.strictEqual(allocationsByTx['t3'].length, 2);
  }

  // Vários pagamentos pequenos na mesma prestação, todos antes do vencimento.
  {
    const schedules = [{ id: 'd1', due_date: '2026-09-01', total_due: 900 }];
    const txs = [
      { id: 't4a', amount: 300, created_at: '2026-08-01T00:00:00' },
      { id: 't4b', amount: 300, created_at: '2026-08-10T00:00:00' },
      { id: 't4c', amount: 300, created_at: '2026-08-20T00:00:00' },
    ];
    const { schedules: res } = replayLoan(schedules, txs, RATE, new Date('2026-08-20'));
    approx(res[0].total_paid, 900);
    assert.strictEqual(res[0].status, 'paid');
    approx(res[0].late_fee, 0, 'Sem mora quando tudo é pago antes do vencimento');
  }

  // Prestação vencida sem nenhum pagamento — mora continua a acumular até "hoje".
  {
    const schedules = [{ id: 'e1', due_date: '2026-07-01', total_due: 1000 }];
    const { schedules: res } = replayLoan(schedules, [], RATE, new Date('2026-07-11'));
    approx(res[0].late_fee, 1000 * RATE * 10, 'Mora acumulada em prestação nunca paga (10 dias)');
    assert.strictEqual(res[0].status, 'overdue');
  }

  // Prestação sem mora configurada (rate=0) nunca acresce, mesmo muito vencida.
  {
    const schedules = [{ id: 'f1', due_date: '2026-07-01', total_due: 1000 }];
    const { schedules: res } = replayLoan(schedules, [], 0, new Date('2026-09-01'));
    approx(res[0].late_fee, 0, 'Produto sem taxa de mora nunca acresce juros de mora');
  }

  console.log('✓ Casos adicionais (antecipado, exacto, duas prestações, vários pagamentos, sem pagamento, sem mora) validados.');
}

testDomingosCase();
testAdditionalCases();
console.log('\nTodos os testes de loanAccounting passaram.');
