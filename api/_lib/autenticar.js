/**
 * Autenticacao das funcoes da API.
 *
 * Nenhum endpoint confia no corpo da requisicao para saber quem esta chamando.
 * O ID Token e verificado, o dominio e conferido e o perfil vem da whitelist
 * no Firestore — as tres coisas, sempre.
 */

import { db, auth } from './firebaseAdmin.js';
import { dominioPermitido, normalizarEmail } from './dominio.js';

export class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

/**
 * Verifica o header Authorization e devolve
 * { uid, email, perfil, isAdmin }.
 * Lanca ErroHttp em qualquer falha.
 */
export async function autenticar(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    throw new ErroHttp(401, 'Token ausente.');
  }

  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    throw new ErroHttp(401, 'Token invalido ou expirado.');
  }

  const email = normalizarEmail(decoded.email);

  if (!email || decoded.email_verified !== true) {
    throw new ErroHttp(403, 'E-mail nao verificado.');
  }

  if (!dominioPermitido(email)) {
    throw new ErroHttp(403, 'Dominio nao autorizado.');
  }

  const snap = await db.collection('usuarios_autorizados').doc(email).get();
  if (!snap.exists || snap.data().ativo !== true) {
    throw new ErroHttp(403, 'Acesso nao autorizado.');
  }

  const perfil = snap.data().perfil;

  return { uid: decoded.uid, email, perfil, isAdmin: perfil === 'admin' };
}

/** Protege o cron. A Vercel envia este header quando CRON_SECRET esta definido. */
export function autenticarCron(req) {
  const segredo = (process.env.CRON_SECRET || '').replace(/\r/g, '').trim();
  if (!segredo) {
    throw new ErroHttp(500, 'CRON_SECRET nao configurado.');
  }
  const header = req.headers.authorization || req.headers.Authorization || '';
  if (header !== `Bearer ${segredo}`) {
    throw new ErroHttp(401, 'Nao autorizado.');
  }
}

/** Resposta de erro padronizada, sem vazar detalhe interno. */
export function responderErro(res, erro) {
  const status = erro instanceof ErroHttp ? erro.status : 500;
  const mensagem = erro instanceof ErroHttp ? erro.message : 'Erro interno.';
  if (status === 500) {
    console.error('[api] erro interno:', erro);
  }
  return res.status(status).json({ erro: mensagem });
}
