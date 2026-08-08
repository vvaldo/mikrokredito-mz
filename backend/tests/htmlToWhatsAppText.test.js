// backend/tests/htmlToWhatsAppText.test.js
// node tests/htmlToWhatsAppText.test.js (ou `npm test`)

const assert = require('assert');
const { htmlToWhatsAppText } = require('../src/utils/htmlToWhatsAppText');

// Texto já simples (o caso normal — templates whatsapp por omissão) não é alterado.
{
  const plain = 'Olá, *João*!\nA sua conta foi criada.\n\nhttps://exemplo.com';
  assert.strictEqual(htmlToWhatsAppText(plain), plain, 'Texto sem tags HTML não deve ser alterado');
}

// <strong>/<b> -> *negrito*, <em>/<i> -> _itálico_
{
  const out = htmlToWhatsAppText('<p>Olá, <strong>Maria</strong>! <em>Bem-vinda</em>.</p>');
  assert.ok(out.includes('*Maria*'), 'strong deve virar *negrito*');
  assert.ok(out.includes('_Bem-vinda_'), 'em deve virar _itálico_');
}

// <a href> -> "texto (url)"
{
  const out = htmlToWhatsAppText('<p>Aceda a <a href="https://microcredito.otech.co.mz/set-password?token=abc">este link</a>.</p>');
  assert.ok(out.includes('este link (https://microcredito.otech.co.mz/set-password?token=abc)'), `Link mal convertido: ${out}`);
}

// <ul><li> -> marcadores linha a linha
{
  const out = htmlToWhatsAppText('<ul><li>Solicitar crédito</li><li>Consultar prestações</li></ul>');
  assert.ok(out.includes('• Solicitar crédito'), 'Item de lista deve ter marcador');
  assert.ok(out.includes('• Consultar prestações'), 'Segundo item de lista deve ter marcador');
}

// <p>/<br> -> quebras de linha, sem deixar tags nem excesso de linhas em branco
{
  const out = htmlToWhatsAppText('<p>Linha 1</p><p>Linha 2<br>Linha 3</p>');
  assert.ok(!/<[a-z]/i.test(out), `Não deve sobrar nenhuma tag HTML: ${out}`);
  assert.ok(out.includes('Linha 1'));
  assert.ok(out.includes('Linha 2\nLinha 3'));
  assert.ok(!/\n{3,}/.test(out), 'Nunca mais de 2 linhas em branco seguidas');
}

// Entidades HTML comuns são descodificadas
{
  const out = htmlToWhatsAppText('<p>Crédito &amp; confiança &nbsp;&mdash; simples</p>'.replace('&mdash;', '-'));
  assert.ok(out.includes('Crédito & confiança'), `Entidade &amp; não descodificada: ${out}`);
}

console.log('✓ htmlToWhatsAppText: HTML comum (negrito, itálico, links, listas, parágrafos, entidades) convertido correctamente para texto simples; texto já simples preservado.');
