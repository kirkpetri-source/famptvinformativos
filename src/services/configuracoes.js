import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';

export const PADRAO_SISTEMA = {
  antecedenciaMinimaDias: 2,
  limiteSimultaneos: 10,
  limiteImagemMB: 15,
  limiteVideoMB: 70,
  limitePdfMB: 20,
  duracaoExibicaoPadraoSegundos: 15,
  retencaoArquivoDias: 45,
  limiteEnviosPorDia: 10,
  emailsNotificacao: [],
};

/** Teto do Storage. A regra nao le configuracao, entao ela prevalece. */
export const TETO_STORAGE_MB = 80;

let cache = null;

export async function carregarSistema({ recarregar = false } = {}) {
  if (cache && !recarregar) return cache;
  try {
    const snap = await getDoc(doc(db, 'configuracoes', 'sistema'));
    cache = snap.exists() ? { ...PADRAO_SISTEMA, ...snap.data() } : { ...PADRAO_SISTEMA };
  } catch {
    // Configuracao indisponivel nao pode travar o envio.
    cache = { ...PADRAO_SISTEMA };
  }
  return cache;
}

export async function salvarSistema(valores) {
  await setDoc(doc(db, 'configuracoes', 'sistema'), valores, { merge: true });
  cache = { ...(cache || PADRAO_SISTEMA), ...valores };
}

/** Texto dos padroes de midia. Legivel sem login: /padroes e publica. */
export async function carregarPadroesMidia() {
  const snap = await getDoc(doc(db, 'configuracoes', 'publico'));
  return snap.exists() ? snap.data().textoPadroesMidia || '' : '';
}

export async function salvarPadroesMidia(texto) {
  await setDoc(doc(db, 'configuracoes', 'publico'), { textoPadroesMidia: texto }, { merge: true });
}
