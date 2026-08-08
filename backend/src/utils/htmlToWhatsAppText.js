// src/utils/htmlToWhatsAppText.js
//
// Rede de segurança para o canal WhatsApp: os templates por omissão (seed.js) já são texto
// simples formatado (sem HTML), mas um administrador pode editar um template e colar HTML
// (ex.: copiar/colar da versão de email) — o WhatsApp não interpreta HTML, por isso isto
// converte as tags mais comuns para a formatação de texto simples que o WhatsApp entende
// (*negrito*, quebras de linha, listas com marcador, links em texto simples). Se o texto não
// contiver nenhuma tag HTML, é devolvido tal como está.

function htmlToWhatsAppText(input) {
  if (!input || typeof input !== 'string') return input || '';
  if (!/<[a-z][\s\S]*>/i.test(input)) return input; // já é texto simples — nada a converter

  let text = input;

  // Links: <a href="URL">texto</a> -> texto (URL)
  text = text.replace(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, url, label) => {
    const cleanLabel = label.replace(/<[^>]+>/g, '').trim();
    return cleanLabel && cleanLabel !== url ? `${cleanLabel} (${url})` : url;
  });

  // Ênfase -> *negrito* (o único destaque que o WhatsApp suporta bem)
  text = text.replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, '*$2*');
  text = text.replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, '_$2_');

  // Listas -> marcador simples, um item por linha
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '• $1\n');
  text = text.replace(/<\/(ul|ol)>/gi, '\n');
  text = text.replace(/<(ul|ol)[^>]*>/gi, '');

  // Blocos -> quebra de linha
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|h[1-6])>/gi, '\n\n');
  text = text.replace(/<(p|div|h[1-6])[^>]*>/gi, '');

  // Remove qualquer tag restante e descodifica entidades HTML comuns
  text = text.replace(/<[^>]+>/g, '');
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Normaliza espaço em branco: nunca mais de 2 linhas em branco seguidas, sem espaços à volta.
  text = text
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

module.exports = { htmlToWhatsAppText };
