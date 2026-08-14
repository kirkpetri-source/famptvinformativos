/**
 * Apaga um informativo de teste e o arquivo dele.
 *
 * Existe porque a auditoria e imutavel pela interface — e deve continuar
 * sendo. Envios de teste, porem, nao podem sujar o relatorio da faculdade, e
 * este script (Admin SDK, ignora as rules) e a valvula controlada para isso.
 *
 *   node scripts/limpar-teste.js <docId>
 *   node scripts/limpar-teste.js --todos-os-testes
 *
 * `--todos-os-testes` remove apenas o que tem "teste" no titulo, para nao
 * haver como apagar um envio real por engano.
 */

import '../api/_lib/carregarEnv.js';
import admin, { db } from '../api/_lib/firebaseAdmin.js';

const alvo = process.argv[2];

async function remover(doc) {
  const i = doc.data();

  if (i.caminhoStorage) {
    await admin
      .storage()
      .bucket()
      .file(i.caminhoStorage)
      .delete({ ignoreNotFound: true });
  }

  const logs = await doc.ref.collection('logs').get();
  for (const l of logs.docs) await l.ref.delete();

  await doc.ref.delete();
  console.log(`removido: ${i.protocolo || doc.id} — ${i.titulo}`);
}

async function main() {
  if (!alvo) {
    console.log('Uso: node scripts/limpar-teste.js <docId | --todos-os-testes>');
    process.exit(1);
  }

  if (alvo === '--todos-os-testes') {
    const snap = await db.collection('informativos').get();
    const testes = snap.docs.filter((d) => /teste/i.test(d.data().titulo || ''));

    if (!testes.length) {
      console.log('Nenhum informativo de teste encontrado.');
      process.exit(0);
    }

    for (const doc of testes) await remover(doc);
    console.log(`\n${testes.length} removido(s).`);
  } else {
    const doc = await db.collection('informativos').doc(alvo).get();
    if (!doc.exists) {
      console.error('Informativo nao encontrado.');
      process.exit(1);
    }
    await remover(doc);
  }

  const restantes = await db.collection('informativos').get();
  console.log(`informativos na base: ${restantes.size}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('Falha:', e.message);
  process.exit(1);
});
