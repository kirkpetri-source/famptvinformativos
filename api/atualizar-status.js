import { db, bucket, FieldValue } from './_lib/firebaseAdmin.js';
import { autenticarCron, responderErro } from './_lib/autenticar.js';
import { atribuirProtocolo } from './_lib/protocolo.js';
import { emailResumoDiario } from './_lib/emailTemplates.js';
import { enviarEmail, destinatariosAdmin, appUrl } from './_lib/email.js';
import { sincronizarTodos } from './_lib/claims.js';

/**
 * Cron diario — 0 6 * * * (03:00 de Brasilia).
 *
 * O plano gratuito da Vercel permite UMA execucao por dia, entao esta funcao
 * faz tudo: transicoes de status, protocolos pendentes, limpeza de rascunhos,
 * expurgo LGPD e o resumo diario.
 *
 * A data de referencia e calculada em America/Sao_Paulo. Calcular "hoje" em
 * UTC faria o informativo entrar ou sair do ar um dia errado — as datas aqui
 * sao datas civis, nao instantes.
 */

const LOTE = 400; // abaixo do teto de 500 do writeBatch, com folga para os logs

export default async function handler(req, res) {
  try {
    autenticarCron(req);
  } catch (erro) {
    return responderErro(res, erro);
  }

  const hoje = hojeSaoPaulo();
  const resumo = {
    data: hoje,
    noAr: 0,
    expirados: 0,
    protocolos: 0,
    notificacoesReenviadas: 0,
    rascunhosRemovidos: 0,
    arquivosExpurgados: 0,
    erros: [],
  };

  try {
    await paraNoAr(hoje, resumo);
    await paraExpirado(hoje, resumo);
    await protocolosPendentes(resumo);
    await limparRascunhos(resumo);
    await expurgarArquivos(hoje, resumo);
    await reconciliarPerfis(resumo);
    await enviarResumo(hoje, resumo);
  } catch (erro) {
    console.error('[cron] falha:', erro);
    resumo.erros.push(erro.message);
  }

  // Registro da execucao: e o que permite saber se o cron rodou ontem.
  try {
    await db.collection('logs_sistema').add({
      tipo: 'cron_atualizar_status',
      em: FieldValue.serverTimestamp(),
      ...resumo,
    });
  } catch (erro) {
    console.error('[cron] falha ao gravar log:', erro.message);
  }

  return res.status(resumo.erros.length ? 500 : 200).json(resumo);
}

/** programado + dataInicio <= hoje  ->  no_ar */
async function paraNoAr(hoje, resumo) {
  const snap = await db
    .collection('informativos')
    .where('status', '==', 'programado')
    .where('dataInicio', '<=', hoje)
    .limit(LOTE)
    .get();

  for (const doc of snap.docs) {
    await doc.ref.update({ status: 'no_ar' });
    await registrarLog(doc.ref, 'status_atualizado', 'programado', 'no_ar');
    resumo.noAr += 1;
  }
}

/** no_ar + dataFim < hoje  ->  expirado */
async function paraExpirado(hoje, resumo) {
  const snap = await db
    .collection('informativos')
    .where('status', '==', 'no_ar')
    .where('dataFim', '<', hoje)
    .limit(LOTE)
    .get();

  for (const doc of snap.docs) {
    await doc.ref.update({ status: 'expirado' });
    await registrarLog(doc.ref, 'status_atualizado', 'no_ar', 'expirado');
    resumo.expirados += 1;
  }
}

/**
 * `aprovado` cuja data de inicio ja passou NAO muda de status.
 *
 * O sistema nao fala com o CMS das TVs: dizer "no ar" sem ninguem ter
 * cadastrado nada faria a auditoria mentir. Em vez disso, entra no resumo
 * como atrasado e aparece no painel.
 */
async function atrasados(hoje) {
  const snap = await db
    .collection('informativos')
    .where('status', '==', 'aprovado')
    .where('dataInicio', '<', hoje)
    .limit(50)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Protocolo do envio cuja notificacao falhou na hora. */
async function protocolosPendentes(resumo) {
  const snap = await db
    .collection('informativos')
    .where('status', '==', 'pendente')
    .where('protocolo', '==', null)
    .limit(50)
    .get();

  for (const doc of snap.docs) {
    try {
      await atribuirProtocolo(doc.id);
      resumo.protocolos += 1;
    } catch (erro) {
      resumo.erros.push(`protocolo ${doc.id}: ${erro.message}`);
    }
  }
}

/**
 * Rascunho com mais de 24h: o upload falhou no meio. Some o documento e o
 * arquivo, para nao acumular lixo invisivel no Storage.
 */
async function limparRascunhos(resumo) {
  const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const snap = await db
    .collection('informativos')
    .where('status', '==', 'rascunho')
    .where('enviadoEm', '<', ontem)
    .limit(LOTE)
    .get();

  for (const doc of snap.docs) {
    const caminho = doc.data().caminhoStorage;
    if (caminho) await apagarArquivo(caminho, resumo);
    await doc.ref.delete();
    resumo.rascunhosRemovidos += 1;
  }
}

/**
 * Expurgo LGPD: o arquivo sai, o registro fica.
 *
 * O que a auditoria precisa e o metadado, nao o binario. Contagem a partir da
 * dataFim para expirados e da decisao para rejeitados e cancelados.
 */
async function expurgarArquivos(hoje, resumo) {
  const config = await db.collection('configuracoes').doc('sistema').get();
  const dias = (config.exists && config.data().retencaoArquivoDias) || 45;
  const corte = subtrairDias(hoje, dias);

  const snap = await db
    .collection('informativos')
    .where('status', 'in', ['expirado', 'rejeitado', 'cancelado'])
    .limit(LOTE)
    .get();

  for (const doc of snap.docs) {
    const info = doc.data();
    if (!info.caminhoStorage || info.arquivoExpurgadoEm) continue;

    const referencia =
      info.status === 'expirado'
        ? info.dataFim
        : isoDe(info.decididoEm) || info.dataFim;

    if (!referencia || referencia > corte) continue;

    await apagarArquivo(info.caminhoStorage, resumo);
    await doc.ref.update({ arquivoExpurgadoEm: FieldValue.serverTimestamp() });
    await registrarLog(doc.ref, 'arquivo_expurgado', null, null, `retenção de ${dias} dias`);
    resumo.arquivosExpurgados += 1;
  }
}

/**
 * Rede de seguranca do perfil no token.
 *
 * A tela de Acessos ja sincroniza na hora, mas se aquela chamada falhar (rede,
 * aba fechada no meio) o perfil ficaria divergente ate alguem notar. Aqui a
 * whitelist e o token voltam a bater todo dia.
 */
async function reconciliarPerfis(resumo) {
  try {
    const r = await sincronizarTodos();
    resumo.perfisAjustados = r.filter((x) => x.motivo === 'atualizado').length;
  } catch (erro) {
    resumo.erros.push(`perfis: ${erro.message}`);
  }
}

/** Resumo do dia. Nao envia quando nao ha nada a fazer. */
async function enviarResumo(hoje, resumo) {
  const [entramSnap, saemSnap, pendentesSnap, aguardandoSnap, listaAtrasados] =
    await Promise.all([
      db.collection('informativos').where('status', '==', 'no_ar').where('dataInicio', '==', hoje).get(),
      db.collection('informativos').where('status', '==', 'no_ar').where('dataFim', '==', hoje).get(),
      db.collection('informativos').where('status', '==', 'pendente').count().get(),
      db.collection('informativos').where('status', '==', 'aprovado').count().get(),
      atrasados(hoje),
    ]);

  const entram = entramSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const saem = saemSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const pendentes = pendentesSnap.data().count;
  const aguardandoProgramacao = aguardandoSnap.data().count;

  resumo.entramHoje = entram.length;
  resumo.saemHoje = saem.length;
  resumo.pendentes = pendentes;
  resumo.atrasados = listaAtrasados.length;

  const nadaAFazer =
    !entram.length && !saem.length && !pendentes && !aguardandoProgramacao && !listaAtrasados.length;

  // Resumo que chega todo dia dizendo "nada a fazer" e resumo que ninguem
  // abre mais — e ai o dia em que importa passa batido.
  if (nadaAFazer) {
    resumo.resumoEnviado = false;
    return;
  }

  const destinatarios = destinatariosAdmin();
  if (!destinatarios.length) return;

  try {
    await enviarEmail({
      para: destinatarios,
      assunto: `[FAMP TV] Resumo do dia — ${hoje.split('-').reverse().join('/')}`,
      html: emailResumoDiario({
        entram,
        saem,
        pendentes,
        aguardandoProgramacao,
        atrasados: listaAtrasados,
        appUrl: appUrl(),
      }),
    });
    resumo.resumoEnviado = true;
  } catch (erro) {
    resumo.erros.push(`resumo: ${erro.message}`);
  }
}

// --- auxiliares ------------------------------------------------------------

function hojeSaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function subtrairDias(iso, dias) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

function isoDe(timestamp) {
  if (!timestamp?.toDate) return null;
  return timestamp.toDate().toISOString().slice(0, 10);
}

async function apagarArquivo(caminho, resumo) {
  try {
    await bucket.file(caminho).delete({ ignoreNotFound: true });
  } catch (erro) {
    resumo.erros.push(`storage ${caminho}: ${erro.message}`);
  }
}

async function registrarLog(ref, acao, de, para, observacao = null) {
  await ref.collection('logs').add({
    acao,
    de,
    para,
    por: 'sistema',
    em: FieldValue.serverTimestamp(),
    observacao,
  });
}
