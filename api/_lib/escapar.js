/**
 * Escape de HTML para os e-mails.
 *
 * Titulo, conteudo, nome, cargo e observacoes sao texto livre do usuario sendo
 * inserido em HTML. Sem isto, um titulo com <img onerror=...> vira marcacao
 * executavel no cliente de e-mail de quem recebe.
 *
 * Passe TUDO que vier do banco por aqui antes de montar o corpo.
 */

const MAPA = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapar(valor) {
  if (valor == null) return '';
  return String(valor).replace(/[&<>"']/g, (c) => MAPA[c]);
}

/** Escape preservando as quebras de linha de um textarea. */
export function escaparComQuebras(valor) {
  return escapar(valor).replace(/\r?\n/g, '<br />');
}

/** Para atributo href: so aceita http(s) e mailto. */
export function urlSegura(valor) {
  const v = String(valor || '').trim();
  if (/^https?:\/\//i.test(v) || /^mailto:/i.test(v)) return escapar(v);
  return '#';
}
