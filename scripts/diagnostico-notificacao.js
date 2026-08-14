/**
 * Testa a cadeia de notificacao de ponta a ponta, contra PRODUCAO.
 *
 * Simula um envio de colaborador — documento, upload e chamada da API — e
 * relata o que cada etapa produziu. Serve para saber se os e-mails saem sem
 * precisar repetir o fluxo na interface a cada ajuste.
 *
 *   node scripts/diagnostico-notificacao.js [email-do-remetente]
 */

import '../api/_lib/carregarEnv.js';
import admin, { db, FieldValue } from '../api/_lib/firebaseAdmin.js';

const email = (process.argv[2] || 'liontech.sup@gmail.com').toLowerCase();
const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET;
const APP = (process.env.APP_URL || 'https://famptvinformativos.vercel.app').replace(/\/+$/, '');

async function idTokenDe(uid) {
  const custom = await admin.auth().createCustomToken(uid);
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: custom, returnSecureToken: true }),
    }
  );
  const d = await r.json();
  if (!d.idToken) throw new Error('Falha ao trocar o token: ' + JSON.stringify(d));
  return d.idToken;
}

async function main() {
  const user = await admin.auth().getUserByEmail(email);
  const cadastro = await db.collection('usuarios').doc(user.uid).get();
  const dados = cadastro.exists ? cadastro.data() : {};
  const idToken = await idTokenDe(user.uid);

  console.log(`remetente : ${email} (${dados.nome || 'sem cadastro'})`);

  const doc = await db.collection('informativos').add({
    protocolo: null,
    titulo: 'Teste automatico de notificacao',
    tituloBusca: 'teste automatico de notificacao',
    conteudo: 'Envio gerado pelo diagnostico para validar os e-mails. Pode recusar.',
    status: 'rascunho',
    prioridade: 'normal',
    dataInicio: '2026-09-10',
    dataFim: '2026-09-12',
    enviadoPor: {
      uid: user.uid,
      nome: dados.nome || 'Diagnostico',
      cargo: dados.cargo || 'Teste do sistema',
      email,
      whatsapp: dados.whatsapp || '',
    },
    enviadoEm: FieldValue.serverTimestamp(),
    notificacaoPendente: true,
  });

  const agora = new Date();
  const caminho =
    `informativos/${user.uid}/${agora.getFullYear()}/` +
    `${String(agora.getMonth() + 1).padStart(2, '0')}/${doc.id}/teste.png`;

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  await admin.storage().bucket().file(caminho).save(png, { contentType: 'image/png' });

  await doc.update({
    nomeArquivo: 'teste.png',
    nomeArmazenado: 'teste.png',
    caminhoStorage: caminho,
    tipoArquivo: 'image/png',
    tamanhoBytes: png.length,
    largura: 1920,
    altura: 1080,
    conformidade: { conforme: true, problemas: [], verificadoEm: FieldValue.serverTimestamp() },
    declaracoes: { semAudio: null, legendado: null, pdfPaisagemPaginaUnica: null },
    status: 'pendente',
  });

  console.log(`documento : ${doc.id}`);
  console.log(`chamando  : ${APP}/api/notificar-envio`);

  const r = await fetch(`${APP}/api/notificar-envio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ docId: doc.id }),
  });

  const corpo = await r.text();
  console.log(`\nRESPOSTA  : HTTP ${r.status}  ${corpo.slice(0, 200)}\n`);

  // Os logs contam o que cada etapa fez, inclusive as que falham em silencio.
  await new Promise((r2) => setTimeout(r2, 2500));
  const logs = await doc.collection('logs').orderBy('em').get();
  console.log('ETAPAS:');
  logs.forEach((l) => {
    const d2 = l.data();
    console.log(`  ${d2.acao}${d2.observacao ? ' — ' + d2.observacao : ''}`);
  });

  console.log(`\nDestinatarios esperados:`);
  console.log(`  administracao : ${process.env.ADMIN_EMAIL}`);
  console.log(`  remetente     : ${email}`);
  console.log(`\nO informativo de teste ficou como PENDENTE em ${APP}/painel.`);
  console.log(`Recuse ou apague depois: node scripts/limpar-teste.js ${doc.id}`);

  process.exit(0);
}

main().catch((e) => {
  console.error('Falha:', e.message);
  process.exit(1);
});
