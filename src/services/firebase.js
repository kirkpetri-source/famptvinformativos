/**
 * Inicializacao do Firebase no cliente.
 *
 * As chaves VITE_* sao publicas por natureza — vao no bundle. O que protege o
 * sistema sao as security rules, nao o segredo dessas chaves.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();

/**
 * NAO usar o parametro `hd` aqui.
 *
 * A documentacao antiga o descreve como dica de selecao de conta, mas o Google
 * passou a trata-lo como filtro: com `hd=fampfaculdade.com.br`, digitar uma
 * conta fora do dominio termina em tela em branco no proprio Google — sem erro,
 * sem retorno. Isso quebra exatamente as contas de EXCECAO em utils/dominio.js,
 * que o sistema precisa aceitar.
 *
 * A trava de dominio continua nas quatro camadas de sempre: cliente, regras do
 * Firestore, regras do Storage e funcoes da API.
 */
googleProvider.setCustomParameters({ prompt: 'select_account' });

if (import.meta.env.VITE_USAR_EMULADORES === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}
