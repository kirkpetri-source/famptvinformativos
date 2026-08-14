/**
 * Diagnostico do upload para o Storage.
 *
 * Monta um ID Token real de um usuario autorizado (via custom token trocado
 * na API do Identity Toolkit) e tenta subir um arquivo exatamente como o
 * navegador faria. Serve para isolar se a recusa vem da regra do Storage, do
 * caminho, do tipo ou do tamanho — sem precisar repetir o teste na interface.
 *
 *   node scripts/diagnostico-upload.js <email-do-usuario>
 */

import '../api/_lib/carregarEnv.js';
import admin, { db, FieldValue } from '../api/_lib/firebaseAdmin.js';

const email = (process.argv[2] || 'kirkpetri@gmail.com').toLowerCase();
const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET;

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
  console.log(`usuario   : ${email}  uid=${user.uid}  emailVerified=${user.emailVerified}`);

  const idToken = await idTokenDe(user.uid);
  const claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
  console.log(`token     : email=${claims.email}  email_verified=${claims.email_verified}`);

  // Documento igual ao que o navegador cria no passo 1 do envio
  const doc = await db.collection('informativos').add({
    protocolo: null,
    titulo: 'Diagnostico de upload',
    tituloBusca: 'diagnostico de upload',
    conteudo: 'Documento temporario do diagnostico. Sera apagado.',
    status: 'rascunho',
    prioridade: 'normal',
    dataInicio: '2026-09-01',
    dataFim: '2026-09-02',
    enviadoPor: {
      uid: user.uid,
      nome: 'Diagnostico',
      cargo: 'Teste',
      email,
      whatsapp: '',
    },
    enviadoEm: FieldValue.serverTimestamp(),
    notificacaoPendente: false,
  });
  console.log(`documento : ${doc.id}`);

  const agora = new Date();
  const caminho = `informativos/${user.uid}/${agora.getFullYear()}/${String(agora.getMonth() + 1).padStart(
    2,
    '0'
  )}/${doc.id}/diagnostico.png`;
  console.log(`caminho   : ${caminho}`);

  // PNG 1x1 valido
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );

  const url =
    `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?uploadType=media&name=` +
    encodeURIComponent(caminho);

  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Firebase ${idToken}`, 'Content-Type': 'image/png' },
    body: png,
  });

  const texto = await r.text();
  console.log(`\nUPLOAD    : HTTP ${r.status}`);
  console.log(texto.slice(0, 400));

  await doc.delete();
  if (r.ok) {
    await admin.storage().bucket().file(caminho).delete({ ignoreNotFound: true });
    console.log('\n(arquivo e documento de teste removidos)');
  } else {
    console.log('\n(documento de teste removido)');
  }

  process.exit(r.ok ? 0 : 1);
}

main().catch((e) => {
  console.error('Falha:', e.message);
  process.exit(1);
});
