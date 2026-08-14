/**
 * Sanitizacao de nome de arquivo e geracao do nome padronizado.
 *
 * Nome com acento ou espaco quebra caminho no Storage e em cabecalho HTTP.
 * Tudo que sobe passa por aqui.
 */

const EXTENSAO_POR_TIPO = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'video/mp4': 'mp4',
  'application/pdf': 'pdf',
};

export function semAcento(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function slug(texto, maximo = 60) {
  return semAcento(texto)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maximo)
    .replace(/-+$/g, '');
}

export function extensaoDe(file) {
  const porTipo = EXTENSAO_POR_TIPO[file?.type];
  if (porTipo) return porTipo;
  const partes = (file?.name || '').split('.');
  return partes.length > 1 ? slug(partes.pop(), 8) : 'bin';
}

/** Nome com que o arquivo e gravado no Storage. */
export function sanitizarNome(file) {
  const ext = extensaoDe(file);
  const base = slug((file?.name || 'arquivo').replace(/\.[^.]+$/, ''), 70) || 'arquivo';
  return `${base}.${ext}`;
}

/**
 * Nome padronizado do download no painel — e o nome com que a midia deve ser
 * cadastrada no CMS das TVs. Junta protocolo e titulo para que o operador nao
 * precise renomear nada nem conferir de qual informativo o arquivo veio.
 *
 *   FAMP-2026-0134_semana-da-enfermagem.mp4
 */
export function nomePadronizado(informativo) {
  const protocolo = informativo?.protocolo || 'FAMP-SEM-PROTOCOLO';
  const titulo = slug(informativo?.titulo || 'informativo', 50);
  const ext = (informativo?.nomeArmazenado || '').split('.').pop() || 'bin';
  return `${protocolo}_${titulo}.${ext}`;
}

/** Nome da midia no CMS: o mesmo, sem extensao. */
export function nomeDaMidia(informativo) {
  return nomePadronizado(informativo).replace(/\.[^.]+$/, '');
}

/**
 * Caminho no Storage. O documento e criado antes, para termos o id.
 *
 * O uid vem primeiro no caminho de proposito: e o que permite a regra do
 * Storage garantir que ninguem escreva na pasta de outro, sem precisar
 * consultar o Firestore (regra cruzada exige uma permissao IAM que nao vem
 * habilitada e faz o upload falhar com 403).
 */
export function caminhoStorage(uid, docId, nomeArmazenado, quando = new Date()) {
  const ano = quando.getFullYear();
  const mes = String(quando.getMonth() + 1).padStart(2, '0');
  return `informativos/${uid}/${ano}/${mes}/${docId}/${nomeArmazenado}`;
}

/** Normaliza titulo para a busca por prefixo do Firestore. */
export function normalizarParaBusca(texto) {
  return semAcento(texto || '').toLowerCase().trim();
}

/** So digitos, do jeito que o WhatsApp e gravado. */
export function apenasDigitos(texto) {
  return (texto || '').replace(/\D/g, '');
}

export function mascararWhatsapp(valor) {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function whatsappValido(valor) {
  const d = apenasDigitos(valor);
  return d.length === 10 || d.length === 11;
}

/** Link de conversa a partir do numero gravado. */
export function linkWhatsapp(valor) {
  const d = apenasDigitos(valor);
  if (!d) return null;
  return `https://wa.me/55${d}`;
}
