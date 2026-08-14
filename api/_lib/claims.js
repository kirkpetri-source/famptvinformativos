import admin, { db } from './firebaseAdmin.js';

/**
 * Sincroniza o perfil da whitelist com o custom claim `admin` do token.
 *
 * As regras do Storage precisam saber quem e admin para liberar a leitura da
 * midia dos outros. Consultar o Firestore de dentro das regras do Storage
 * exige uma permissao IAM que nao vem habilitada — entao o perfil viaja no
 * proprio token.
 *
 * A whitelist continua sendo a fonte de verdade. O claim e so um espelho, e
 * este arquivo e o unico lugar que o escreve.
 */
export async function sincronizarClaim(email) {
  const alvo = (email || '').trim().toLowerCase();
  if (!alvo) return { email: alvo, ok: false, motivo: 'e-mail vazio' };

  let user;
  try {
    user = await admin.auth().getUserByEmail(alvo);
  } catch {
    // Ainda nao fez o primeiro login: nao existe token para marcar.
    return { email: alvo, ok: true, motivo: 'sem conta no Auth ainda' };
  }

  const snap = await db.collection('usuarios_autorizados').doc(alvo).get();
  const deveSerAdmin = snap.exists && snap.data().ativo === true && snap.data().perfil === 'admin';
  const jaEhAdmin = user.customClaims?.admin === true;

  if (deveSerAdmin === jaEhAdmin) {
    return { email: alvo, ok: true, motivo: 'ja estava correto', admin: jaEhAdmin };
  }

  const claims = { ...(user.customClaims || {}) };
  if (deveSerAdmin) claims.admin = true;
  else delete claims.admin;

  await admin.auth().setCustomUserClaims(user.uid, claims);

  // Ao TIRAR o admin, invalida os tokens em uso na hora: manter um token de
  // admin valido por ate uma hora depois do rebaixamento e justamente o que
  // nao pode acontecer. Ao CONCEDER, nao revoga — o claim novo entra no
  // proximo refresh e derrubar a sessao de alguem promovido so atrapalha.
  if (!deveSerAdmin) {
    await admin.auth().revokeRefreshTokens(user.uid);
  }

  return { email: alvo, ok: true, motivo: 'atualizado', admin: deveSerAdmin };
}

/** Reconcilia todos os acessos. Usado no seed e como rede de seguranca no cron. */
export async function sincronizarTodos() {
  const snap = await db.collection('usuarios_autorizados').get();
  const resultados = [];
  for (const doc of snap.docs) {
    resultados.push(await sincronizarClaim(doc.id));
  }
  return resultados;
}
