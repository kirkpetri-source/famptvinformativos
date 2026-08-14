/**
 * Libera, altera ou remove um acesso pela linha de comando.
 *
 * Serve para o que a interface nao cobre: liberar o primeiro acesso quando
 * ainda nao ha admin logado, ou limpar contas de teste antes da entrega.
 * O Admin SDK ignora as security rules, entao funciona mesmo sem sessao.
 *
 *   node scripts/acesso.js liberar  fulano@fampfaculdade.com.br colaborador
 *   node scripts/acesso.js liberar  fulano@fampfaculdade.com.br admin
 *   node scripts/acesso.js listar
 *   node scripts/acesso.js remover  liontech.sup@gmail.com
 *
 * `remover` apaga de verdade — use apenas em conta de teste. Para desligar o
 * acesso de alguem que ja enviou informativos, use a tela de Acessos, que
 * desativa sem apagar e preserva a auditoria.
 */

import '../api/_lib/carregarEnv.js';
import { db, FieldValue } from '../api/_lib/firebaseAdmin.js';
import { dominioPermitido, normalizarEmail } from '../api/_lib/dominio.js';
import { sincronizarClaim } from '../api/_lib/claims.js';

const [acao, emailBruto, perfilBruto] = process.argv.slice(2);

async function listar() {
  const snap = await db.collection('usuarios_autorizados').orderBy('email').get();
  if (snap.empty) {
    console.log('Nenhum acesso liberado.');
    return;
  }
  console.log(`${snap.size} acesso(s):\n`);
  for (const doc of snap.docs) {
    const d = doc.data();
    const cadastro = await db.collection('usuarios').where('email', '==', d.email).limit(1).get();
    const nome = cadastro.empty ? '(cadastro nao concluido)' : cadastro.docs[0].data().nome;
    console.log(
      `  ${d.ativo ? '[ativo]   ' : '[inativo] '} ${d.perfil.padEnd(12)} ${d.email.padEnd(38)} ${nome}`
    );
  }
}

async function liberar(email, perfil) {
  if (!dominioPermitido(email)) {
    console.error(
      `"${email}" viola a politica de dominio.\n` +
        'Para liberar mesmo assim, adicione o e-mail em EXCECOES_TESTE de\n' +
        '  src/utils/dominio.js e api/_lib/dominio.js,\n' +
        'e em dominioPermitido() de firestore.rules e storage.rules.\n' +
        'Depois: firebase deploy --only firestore:rules,storage'
    );
    process.exit(1);
  }

  if (!['colaborador', 'admin'].includes(perfil)) {
    console.error('Perfil precisa ser "colaborador" ou "admin".');
    process.exit(1);
  }

  const ref = db.collection('usuarios_autorizados').doc(email);
  const existente = await ref.get();

  await ref.set(
    {
      email,
      perfil,
      ativo: true,
      adicionadoPor: 'cli',
      adicionadoEm: existente.exists ? existente.data().adicionadoEm : FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const claim = await sincronizarClaim(email);

  console.log(
    existente.exists
      ? `Acesso atualizado: ${email} -> ${perfil}`
      : `Acesso liberado: ${email} -> ${perfil}`
  );
  console.log(`Perfil no token: ${claim.motivo}`);
  console.log('A pessoa completa o cadastro no primeiro login.');
}

async function remover(email) {
  const envios = await db
    .collection('informativos')
    .where('enviadoPor.email', '==', email)
    .limit(1)
    .get();

  if (!envios.empty) {
    console.error(
      `"${email}" ja enviou informativos. Apagar o acesso quebraria a\n` +
        'rastreabilidade da auditoria. Use a tela de Acessos para DESATIVAR.'
    );
    process.exit(1);
  }

  await db.collection('usuarios_autorizados').doc(email).delete();
  const cadastro = await db.collection('usuarios').where('email', '==', email).get();
  for (const doc of cadastro.docs) await doc.ref.delete();

  // Tira o admin do token tambem: sem isto a conta continuaria enxergando a
  // midia dos outros ate o token expirar.
  await sincronizarClaim(email);

  console.log(`Acesso e cadastro removidos: ${email}`);
}

async function main() {
  const email = normalizarEmail(emailBruto);

  if (acao === 'listar') {
    await listar();
  } else if (acao === 'liberar') {
    if (!email) throw new Error('Informe o e-mail.');
    await liberar(email, perfilBruto || 'colaborador');
  } else if (acao === 'remover') {
    if (!email) throw new Error('Informe o e-mail.');
    await remover(email);
  } else {
    console.log('Uso: node scripts/acesso.js <listar|liberar|remover> [email] [perfil]');
  }

  process.exit(0);
}

main().catch((erro) => {
  console.error('Falha:', erro.message);
  process.exit(1);
});
