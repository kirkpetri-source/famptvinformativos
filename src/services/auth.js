import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase.js';
import { dominioPermitido, normalizarEmail, MOTIVO_RECUSA } from '../utils/dominio.js';

export function observarSessao(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * No celular, popup nao funciona.
 *
 * O `signInWithPopup` abre a pagina do Google em outra aba e depois espera o
 * resultado voltar por postMessage, vigiando `popup.closed`. O Google serve
 * aquela pagina com Cross-Origin-Opener-Policy, que corta o vinculo com a aba
 * que abriu: no desktop isso so polui o console com "would block the
 * window.closed call" e o login ainda conclui por outro caminho; no celular a
 * aba fica branca e nada mais acontece, porque o navegador movel nao mantem o
 * opener vivo nem entrega o postMessage entre abas.
 *
 * Redirect nao depende de nada disso — sai da pagina e volta.
 */
function ehDispositivoMovel() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;

  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Windows Phone|IEMobile/i.test(ua)) return true;

  // iPad recente se declara Mac; o toque desmente.
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;

  // Navegador embutido de app (Instagram, WhatsApp, Gmail): nunca abre popup.
  if (/FBAN|FBAV|Instagram|Line|WhatsApp|GSA/i.test(ua)) return true;

  return false;
}

/**
 * Devolve o usuario no fluxo de popup; no de redirect a pagina sai do ar antes
 * de retornar, e quem conclui e `resultadoDoRedirect`.
 */
export async function entrarComGoogle() {
  if (ehDispositivoMovel()) {
    await signInWithRedirect(auth, googleProvider);
    return null;
  }

  try {
    const { user } = await signInWithPopup(auth, googleProvider);
    return user;
  } catch (e) {
    const codigo = e?.code || '';
    const popupNaoServe =
      codigo === 'auth/popup-blocked' ||
      codigo === 'auth/operation-not-supported-in-this-environment' ||
      codigo === 'auth/web-storage-unsupported';

    if (!popupNaoServe) throw e;

    await signInWithRedirect(auth, googleProvider);
    return null;
  }
}

/**
 * Consome o retorno do redirect. Precisa ser chamado no carregamento da pagina,
 * antes de decidir qualquer rota: e aqui que aparece o erro de um login que
 * falhou do outro lado, que de outro modo viraria "voltou para a tela de entrar
 * sem explicacao".
 */
export async function resultadoDoRedirect() {
  const resultado = await getRedirectResult(auth);
  return resultado?.user || null;
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
