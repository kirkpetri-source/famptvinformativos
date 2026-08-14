import { Resend } from 'resend';
import { bucket } from './firebaseAdmin.js';

/**
 * Envio de e-mail e geracao de link do arquivo.
 *
 * Duas decisoes que parecem detalhe e nao sao:
 *
 * 1. ANEXO SO ATE 3 MB. A funcao precisa baixar o arquivo e converter para
 *    base64 (que cresce ~33%). Acima disso estoura memoria e tempo da funcao
 *    serverless, e Gmail/Outlook cortam anexo em 25 MB de qualquer forma.
 *
 * 2. SIGNED URL V4, NAO getDownloadURL(). O token do getDownloadURL nunca
 *    expira e ignora as security rules — colado num e-mail, vira endereco
 *    publico permanente do arquivo.
 */

const LIMITE_ANEXO_BYTES = 3 * 1024 * 1024;
const VALIDADE_LINK_MS = 7 * 24 * 60 * 60 * 1000;

function limpar(v) {
  return (v || '').replace(/\r/g, '').trim();
}

export function destinatariosAdmin() {
  return limpar(process.env.ADMIN_EMAIL)
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

export function appUrl() {
  return limpar(process.env.APP_URL).replace(/\/+$/, '') || 'http://localhost:5173';
}

export async function linkAssinado(caminho) {
  if (!caminho) return null;
  try {
    const [url] = await bucket.file(caminho).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + VALIDADE_LINK_MS,
    });
    return url;
  } catch (erro) {
    console.error('[email] falha ao assinar URL:', erro.message);
    return null;
  }
}

/** Devolve o anexo se couber, ou null. Nunca lanca: e-mail sem anexo ainda serve. */
export async function anexoSeCouber(caminho, nomeArquivo, tamanhoBytes) {
  if (!caminho || !tamanhoBytes || tamanhoBytes > LIMITE_ANEXO_BYTES) return null;
  try {
    const [buffer] = await bucket.file(caminho).download();
    return { filename: nomeArquivo, content: buffer.toString('base64') };
  } catch (erro) {
    console.error('[email] falha ao baixar anexo:', erro.message);
    return null;
  }
}

export async function enviarEmail({ para, assunto, html, responderPara, anexos }) {
  const chave = limpar(process.env.RESEND_API_KEY);
  const remetente = limpar(process.env.RESEND_FROM);

  if (!chave || !remetente) {
    throw new Error('RESEND_API_KEY ou RESEND_FROM nao configurados.');
  }

  const resend = new Resend(chave);

  const carga = {
    from: remetente,
    to: Array.isArray(para) ? para : [para],
    subject: assunto,
    html,
  };

  // O nome do campo mudou entre versoes do SDK: reply_to na v3, replyTo na v4.
  // Mandar os dois e inofensivo e sobrevive ao upgrade.
  if (responderPara) {
    carga.reply_to = responderPara;
    carga.replyTo = responderPara;
  }

  if (anexos?.length) carga.attachments = anexos;

  const { data, error } = await resend.emails.send(carga);
  if (error) throw new Error(error.message || 'Falha no envio do e-mail.');

  return data;
}
