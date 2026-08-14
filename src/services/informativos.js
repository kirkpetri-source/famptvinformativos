import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { STATUS } from '../utils/status.js';
import { normalizarParaBusca } from '../utils/arquivos.js';
import { hojeISO } from '../utils/datas.js';

const COL = 'informativos';

const ref = () => collection(db, COL);
const refDoc = (id) => doc(db, COL, id);

/**
 * Passo 1 do envio: cria o documento ANTES do upload.
 *
 * Isso resolve duas coisas de uma vez: gera o id que compoe o caminho no
 * Storage, e faz com que uma falha de rede no meio do upload deixe o
 * documento em rascunho — invisivel para o admin — em vez de deixar um
 * arquivo orfao sem dono.
 */
export async function criarRascunho({ dados, usuario, cadastro }) {
  const documento = {
    protocolo: null,
    titulo: dados.titulo.trim(),
    tituloBusca: normalizarParaBusca(dados.titulo),
    conteudo: dados.conteudo.trim(),
    nomeArquivo: null,
    nomeArmazenado: null,
    caminhoStorage: null,
    tipoArquivo: null,
    tamanhoBytes: null,
    largura: null,
    altura: null,
    duracaoSegundos: null,
    duracaoExibicaoSegundos: null,
    conformidade: null,
    declaracoes: { semAudio: null, legendado: null, pdfPaisagemPaginaUnica: null },
    dataInicio: dados.dataInicio,
    dataFim: dados.dataFim,
    prioridade: dados.prioridade,
    justificativaUrgencia: dados.justificativaUrgencia?.trim() || null,
    status: STATUS.RASCUNHO,
    enviadoPor: {
      uid: usuario.uid,
      nome: cadastro.nome,
      cargo: cadastro.cargo,
      email: (usuario.email || '').toLowerCase(),
      whatsapp: cadastro.whatsapp,
    },
    enviadoEm: serverTimestamp(),
    decididoPor: null,
    decididoEm: null,
    observacaoAdmin: null,
    motivoRejeicao: null,
    programadoEm: null,
    referenciaExterna: null,
    retiradoEm: null,
    notificacaoPendente: true,
    arquivoExpurgadoEm: null,
    reenvioDe: dados.reenvioDe || null,
  };

  const criado = await addDoc(ref(), documento);
  return criado.id;
}

/** Passo 3: com o arquivo no lugar, o informativo entra na fila do admin. */
export async function concluirEnvio(id, { arquivo, analise, declaracoes, caminho }) {
  await updateDoc(refDoc(id), {
    nomeArquivo: arquivo.nomeOriginal,
    nomeArmazenado: arquivo.nomeArmazenado,
    caminhoStorage: caminho,
    tipoArquivo: arquivo.tipo,
    tamanhoBytes: arquivo.tamanho,
    largura: analise.largura ?? null,
    altura: analise.altura ?? null,
    duracaoSegundos: analise.duracaoSegundos ?? null,
    conformidade: {
      conforme: analise.conformidade.conforme,
      problemas: analise.conformidade.problemas,
      verificadoEm: serverTimestamp(),
    },
    declaracoes: {
      semAudio: declaracoes.semAudio ?? null,
      legendado: declaracoes.legendado ?? null,
      pdfPaisagemPaginaUnica: declaracoes.pdfPaisagemPaginaUnica ?? null,
    },
    status: STATUS.PENDENTE,
  });
}

export async function buscarPorId(id) {
  const snap = await getDoc(refDoc(id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Envios do proprio usuario. */
export async function listarMeusEnvios(uid, { pagina = 25 } = {}) {
  const consulta = query(
    ref(),
    where('enviadoPor.uid', '==', uid),
    orderBy('enviadoEm', 'desc'),
    limit(pagina)
  );
  const snap = await getDocs(consulta);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((i) => i.status !== STATUS.RASCUNHO);
}

/**
 * Lista do admin, com paginacao por cursor.
 *
 * A busca por titulo e uma consulta ISOLADA: combina-la com os outros filtros
 * exigiria um indice composto para cada combinacao possivel.
 */
export async function listarInformativos({
  status = null,
  prioridade = null,
  uidRemetente = null,
  pagina = 25,
  cursor = null,
} = {}) {
  const filtros = [];

  if (uidRemetente) filtros.push(where('enviadoPor.uid', '==', uidRemetente));
  if (prioridade) filtros.push(where('prioridade', '==', prioridade));
  if (status) filtros.push(where('status', '==', status));

  // Sem filtro de status nao da para excluir rascunho na propria consulta: um
  // `!=` obrigaria a ordenar por status primeiro e mudaria a ordem da lista.
  // Rascunhos sao poucos e efemeros (o cron limpa em 24h), entao saem aqui.
  const base = query(ref(), ...filtros, orderBy('enviadoEm', 'desc'));

  const consulta = cursor
    ? query(base, startAfter(cursor), limit(pagina))
    : query(base, limit(pagina));

  const snap = await getDocs(consulta);

  return {
    itens: snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((i) => i.status !== STATUS.RASCUNHO),
    ultimo: snap.docs[snap.docs.length - 1] || null,
    fim: snap.docs.length < pagina,
  };
}

/**
 * Busca por prefixo do titulo. Consulta ISOLADA, sem os outros filtros:
 * combina-la exigiria um indice composto para cada combinacao possivel.
 *
 * O Firestore nao faz busca textual. O limite superior usa o ultimo ponto de
 * codigo da area de uso privado (U+F8FF), que e o truque padrao para
 * "comeca com". Por isso a busca nao encontra trecho no meio da frase.
 */
export async function buscarPorTitulo(termo) {
  const prefixo = normalizarParaBusca(termo);
  if (prefixo.length < 3) return [];
  const consulta = query(
    ref(),
    orderBy('tituloBusca'),
    where('tituloBusca', '>=', prefixo),
    where('tituloBusca', '<=', `${prefixo}`),
    limit(25)
  );
  const snap = await getDocs(consulta);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function porStatus(status, { ordenarPor = 'enviadoEm', direcao = 'desc' } = {}) {
  const consulta = query(
    ref(),
    where('status', '==', status),
    orderBy(ordenarPor, direcao),
    limit(200)
  );
  const snap = await getDocs(consulta);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Fila de entrada: aprovados ainda nao programados, o que estreia antes no topo. */
export async function filaDeProgramacao() {
  return porStatus(STATUS.APROVADO, { ordenarPor: 'dataInicio', direcao: 'asc' });
}

/**
 * Fila de retirada: passou da data de termino e ninguem confirmou a remocao
 * do CMS. E a metade esquecida do trabalho, e a que entope o loop das TVs.
 */
export async function filaDeRetirada() {
  const hoje = hojeISO();
  const consulta = query(
    ref(),
    where('status', 'in', [STATUS.NO_AR, STATUS.EXPIRADO]),
    where('retiradoEm', '==', null),
    where('dataFim', '<', hoje),
    orderBy('dataFim', 'asc'),
    limit(100)
  );
  const snap = await getDocs(consulta);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Tudo que ocupa a grade dentro de uma janela de datas. */
export async function naJanela(inicioISO, fimISO) {
  const consulta = query(
    ref(),
    where('dataFim', '>=', inicioISO),
    orderBy('dataFim', 'asc'),
    limit(300)
  );
  const snap = await getDocs(consulta);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter(
      (i) =>
        i.dataInicio <= fimISO &&
        [STATUS.APROVADO, STATUS.PROGRAMADO, STATUS.NO_AR].includes(i.status)
    );
}

// --- Acoes do admin --------------------------------------------------------

export async function aprovar(id, emailAdmin) {
  await updateDoc(refDoc(id), {
    status: STATUS.APROVADO,
    decididoPor: emailAdmin,
    decididoEm: serverTimestamp(),
    observacaoAdmin: null,
    motivoRejeicao: null,
  });
}

export async function rejeitar(id, emailAdmin, { motivo, observacao }) {
  await updateDoc(refDoc(id), {
    status: STATUS.REJEITADO,
    decididoPor: emailAdmin,
    decididoEm: serverTimestamp(),
    motivoRejeicao: motivo,
    observacaoAdmin: observacao.trim(),
  });
}

export async function marcarProgramado(id, { referenciaExterna, duracaoExibicaoSegundos }) {
  await updateDoc(refDoc(id), {
    status: STATUS.PROGRAMADO,
    programadoEm: serverTimestamp(),
    referenciaExterna: referenciaExterna?.trim() || null,
    duracaoExibicaoSegundos: duracaoExibicaoSegundos ?? null,
  });
}

export async function voltarParaPendente(id) {
  await updateDoc(refDoc(id), {
    status: STATUS.PENDENTE,
    decididoPor: null,
    decididoEm: null,
    programadoEm: null,
  });
}

export async function cancelar(id, emailAdmin, observacao) {
  await updateDoc(refDoc(id), {
    status: STATUS.CANCELADO,
    decididoPor: emailAdmin,
    decididoEm: serverTimestamp(),
    observacaoAdmin: observacao.trim(),
  });
}

export async function confirmarRetirada(id) {
  await updateDoc(refDoc(id), { retiradoEm: serverTimestamp() });
}
