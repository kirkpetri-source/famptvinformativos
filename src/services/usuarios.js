import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { dominioPermitido, normalizarEmail } from '../utils/dominio.js';

/**
 * Whitelist e cadastros.
 *
 * O perfil vive SOMENTE em usuarios_autorizados. A colecao usuarios nao tem
 * esse campo — e o que impede um colaborador de se promover a admin.
 */

export async function listarAutorizados() {
  const snap = await getDocs(query(collection(db, 'usuarios_autorizados'), orderBy('email')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listarCadastros() {
  const snap = await getDocs(collection(db, 'usuarios'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Junta whitelist e cadastro para a tela de gestao de acessos. */
export async function listarAcessos() {
  const [autorizados, cadastros] = await Promise.all([
    listarAutorizados(),
    listarCadastros(),
  ]);

  const porEmail = new Map(cadastros.map((c) => [normalizarEmail(c.email), c]));

  return autorizados.map((a) => ({
    ...a,
    cadastro: porEmail.get(normalizarEmail(a.email)) || null,
  }));
}

export async function adicionarAutorizado(email, perfil, emailAdmin) {
  const alvo = normalizarEmail(email);

  if (!dominioPermitido(alvo)) {
    throw new Error(
      'Este e-mail não pode ser autorizado: o sistema aceita apenas e-mails institucionais.'
    );
  }

  const existente = await getDoc(doc(db, 'usuarios_autorizados', alvo));
  if (existente.exists()) {
    throw new Error('Este e-mail já está na lista.');
  }

  await setDoc(doc(db, 'usuarios_autorizados', alvo), {
    email: alvo,
    perfil,
    ativo: true,
    adicionadoPor: emailAdmin,
    adicionadoEm: serverTimestamp(),
  });
}

/** Desativar, nunca apagar: o historico de envios precisa continuar rastreavel. */
export async function alterarAcesso(email, { perfil, ativo }) {
  const alvo = normalizarEmail(email);
  const atual = await getDoc(doc(db, 'usuarios_autorizados', alvo));
  if (!atual.exists()) throw new Error('Registro não encontrado.');

  await setDoc(
    doc(db, 'usuarios_autorizados', alvo),
    {
      ...atual.data(),
      perfil: perfil ?? atual.data().perfil,
      ativo: ativo ?? atual.data().ativo,
    },
    { merge: true }
  );
}

/** Remetentes que ja enviaram algo, para o filtro do relatorio. */
export async function listarRemetentes() {
  const cadastros = await listarCadastros();
  return cadastros
    .map((c) => ({ uid: c.id, nome: c.nome, email: c.email, cargo: c.cargo }))
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
}
