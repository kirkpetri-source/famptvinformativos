import { db, FieldValue } from './_lib/firebaseAdmin.js';
import { autenticar, responderErro, ErroHttp } from './_lib/autenticar.js';
import { atribuirProtocolo } from './_lib/protocolo.js';
import { emailNovoEnvio } from './_lib/emailTemplates.js';
import {
  enviarEmail,
  destinatariosAdmin,
  appUrl,
  linkAssinado,
  anexoSeCouber,
} from './_lib/email.js';

/**
 * Chamada pelo cliente logo apos o envio.
 *
 * Regras que este endpoint segue e que valem para todos os outros:
 *  - o corpo carrega SOMENTE o docId; todo o resto vem do Firestore;
 *  - quem chama e identificado pelo ID Token, nunca pelo corpo;
 *  - so o dono do informativo (ou um admin) pode dispara-lo.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  try {
    const chamador = await autenticar(req);
    const { docId } = req.body || {};

    if (!docId || typeof docId !== 'string') {
      throw new ErroHttp(400, 'docId ausente.');
    }

    const ref = db.collection('informativos').doc(docId);
    const snap = await ref.get();

    if (!snap.exists) throw new ErroHttp(404, 'Informativo não encontrado.');

    const info = { id: snap.id, ...snap.data() };

    if (info.enviadoPor?.uid !== chamador.uid && !chamador.isAdmin) {
      throw new ErroHttp(403, 'Este informativo não é seu.');
    }

    if (info.status !== 'pendente') {
      throw new ErroHttp(409, 'Informativo não está aguardando análise.');
    }

    // Duplo clique ou reprocesso: nao renumera e nao manda o e-mail de novo.
    if (info.protocolo && info.notificacaoPendente === false) {
      return res.status(200).json({ protocolo: info.protocolo, jaNotificado: true });
    }

    await verificarLimiteDiario(info.enviadoPor.uid);

    const protocolo = await atribuirProtocolo(docId);
    info.protocolo = protocolo;

    const destinatarios = destinatariosAdmin();
    if (!destinatarios.length) throw new ErroHttp(500, 'ADMIN_EMAIL não configurado.');

    const [link, anexo] = await Promise.all([
      linkAssinado(info.caminhoStorage),
      anexoSeCouber(info.caminhoStorage, info.nomeArquivo, info.tamanhoBytes),
    ]);

    const html = emailNovoEnvio({
      info,
      periodo: periodoExtenso(info.dataInicio, info.dataFim),
      conformidade: resumoConformidade(info.conformidade),
      linkArquivo: link,
      appUrl: appUrl(),
      comAnexo: Boolean(anexo),
    });

    await enviarEmail({
      para: destinatarios,
      assunto: `[FAMP TV] ${protocolo} — "${info.titulo}"${
        info.prioridade === 'urgente' ? ' — URGENTE' : ''
      }`,
      html,
      responderPara: info.enviadoPor?.email,
      anexos: anexo ? [anexo] : undefined,
    });

    await ref.update({ notificacaoPendente: false });

    await ref.collection('logs').add({
      acao: 'email_enviado',
      de: null,
      para: 'pendente',
      por: 'sistema',
      em: FieldValue.serverTimestamp(),
      observacao: anexo ? 'com anexo' : 'somente link',
    });

    return res.status(200).json({ protocolo });
  } catch (erro) {
    return responderErro(res, erro);
  }
}

/**
 * Limite de envios por dia.
 *
 * Nao e para conter ma-fe — e para conter o clique repetido por ansiedade
 * quando a rede esta ruim.
 */
async function verificarLimiteDiario(uid) {
  const config = await db.collection('configuracoes').doc('sistema').get();
  const limite = (config.exists && config.data().limiteEnviosPorDia) || 10;

  const inicioDoDia = new Date();
  inicioDoDia.setHours(0, 0, 0, 0);

  const envios = await db
    .collection('informativos')
    .where('enviadoPor.uid', '==', uid)
    .where('enviadoEm', '>=', inicioDoDia)
    .count()
    .get();

  if (envios.data().count > limite) {
    throw new ErroHttp(
      429,
      `Você atingiu o limite de ${limite} envios por dia. Tente novamente amanhã.`
    );
  }
}

function periodoExtenso(inicio, fim) {
  const dias = Math.round((new Date(fim) - new Date(inicio)) / 86400000) + 1;
  const br = (iso) => iso.split('-').reverse().join('/');
  return `${br(inicio)} a ${br(fim)} (${dias} ${dias === 1 ? 'dia' : 'dias'})`;
}

function resumoConformidade(conformidade) {
  if (!conformidade) return 'NÃO VERIFICADO';
  if (conformidade.conforme) return 'CONFORME';

  const textos = {
    dimensao: 'fora de 1920x1080',
    orientacao: 'arquivo em pé',
    duracao: 'passa de 30 segundos',
    audio: 'tem faixa de áudio',
    nao_verificavel: 'formato não verificável automaticamente',
  };

  const lista = (conformidade.problemas || []).map((p) => textos[p] || p).join('; ');
  return `FORA DO PADRÃO: ${lista}`;
}
