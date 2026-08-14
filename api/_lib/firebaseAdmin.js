/**
 * Admin SDK — usado apenas pelas funcoes da pasta api/ e pelo script de seed.
 *
 * Duas armadilhas conhecidas estao tratadas aqui:
 *
 *  1. Importar `firebase-admin` como DEFAULT IMPORT. O subpath
 *     'firebase-admin/auth' puxa jwks-rsa e quebra o build na Vercel.
 *
 *  2. FIREBASE_PRIVATE_KEY chega com \n literal (e as vezes \r do terminal do
 *     Windows). Sem o tratamento abaixo, a inicializacao falha com um erro que
 *     nao diz nada sobre a causa.
 */

import admin from 'firebase-admin';

function limpar(valor) {
  return (valor || '').replace(/\r/g, '').trim();
}

function chavePrivada() {
  return (process.env.FIREBASE_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n')
    .replace(/\r/g, '')
    .trim();
}

if (!admin.apps.length) {
  const projectId = limpar(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = limpar(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = chavePrivada();
  const storageBucket = limpar(process.env.FIREBASE_STORAGE_BUCKET);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Credenciais do Firebase Admin ausentes. Confira FIREBASE_PROJECT_ID, ' +
        'FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY.'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    storageBucket,
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
export const bucket = admin.storage().bucket();
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;

export default admin;
