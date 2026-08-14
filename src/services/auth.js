import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase.js';
import { dominioPermitido, normalizarEmail, MOTIVO_RECUSA } from '../utils/dominio.js';

export function observarSessao(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function entrarComGoogle() {
  const { user } = await signInWithPopup(auth, googleProvider);
  return user;
}

export async function sair() {
  await firebaseSignOut(auth);
}

/**
 * Resolve o acesso de quem acabou de entrar.
 *
 * Distingue os dois motivos de recusa porque a acao do usuario e diferente em
 * cada um: fora do dominio ele troca de conta; fora da whitelist ele pede
 * autorizacao.
 */
export async function resolverAcesso(user) {
  const email = normalizarEmail(user.email);

  if (!dominioPermitido(email)) {
    return { recusa: MOTIVO_RECUSA.DOMINIO, email };
  }

  const snap = await getDoc(doc(db, 'usuarios_autorizados', email));

  if (!snap.exists() || snap.data().ativo !== true) {
    return { recusa: MOTIVO_RECUSA.WHITELIST, email };
  }

  return { recusa: null, email, perfil: snap.data().perfil };
}

/** Cadastro do usuario. Ausente = primeiro acesso. */
export async function buscarCadastro(uid) {
  const snap = await getDoc(doc(db, 'usuarios', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function registrarUltimoLogin(uid) {
  try {
    await setDoc(doc(db, 'usuarios', uid), { ultimoLogin: serverTimestamp() }, { merge: true });
  } catch {
    // Falhar aqui nao pode impedir o uso do sistema.
  }
}

/** Concluir o primeiro acesso. O perfil nao e gravado aqui — vem da whitelist. */
export async function criarCadastro(user, { nome, cargo, whatsapp }) {
  const dados = {
    nome: nome.trim(),
    email: normalizarEmail(user.email),
    foto: user.photoURL || '',
    cargo: cargo.trim(),
    whatsapp,
    aceiteLgpdEm: serverTimestamp(),
    aceitePoliticaEm: serverTimestamp(),
    primeiroLogin: serverTimestamp(),
    ultimoLogin: serverTimestamp(),
  };
  await setDoc(doc(db, 'usuarios', user.uid), dados);
  return dados;
}

export async function atualizarCadastro(uid, { nome, cargo, whatsapp }) {
  await setDoc(
    doc(db, 'usuarios', uid),
    { nome: nome.trim(), cargo: cargo.trim(), whatsapp },
    { merge: true }
  );
}

/** Token para chamar as funcoes da pasta api/. */
export async function tokenAtual() {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessao expirada.');
  return user.getIdToken();
}
