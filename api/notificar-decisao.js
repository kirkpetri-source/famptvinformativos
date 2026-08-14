import { db, FieldValue } from './_lib/firebaseAdmin.js';
import { autenticar, responderErro, ErroHttp } from './_lib/autenticar.js';
import { emailDecisao } from './_lib/emailTemplates.js';
import { enviarEmail, appUrl } from './_lib/email.js';

/**
 * Avisa o remetente da decisao.
 *
 * Sem isto, o professor e recusado e nunca fica sabendo — que era exatamente o
 * problema do WhatsApp individual que este sistema veio resolver.
 *
 * ATENCAO OPERACIONAL: com dominio nao verificado no Resend, este e-mail so e
 * entregue ao dono da conta. O aviso ao admin funciona; este aqui nao chega ao
 * professor ate que um dominio proprio seja verificado.
 */

const MOTIVOS = {
  fora_do_padrao: 'Fora do padrão técnico das TVs',
  politica_de_conteudo: 'Contraria a política de conteúdo',
  data_invalida: 'Período de veiculação inviável',
  duplicado: 'Informativo duplicado',
  outro: 'Não aprovado',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  try {
    const chamador = await autenticar(req);

    if (!chamador.isAdmin) {
      throw new ErroHttp(403, 'Apenas a administração pode notificar decisões.');
    }

    const { docId, decisao } = req.body || {};

    if (!docId || !['aprovado', 'rejeitado', 'cancelado'].includes(decisao)) {
      throw new ErroHttp(400, 'Parâmetros inválidos.');
    }

    const ref = db.collection('informativos').doc(docId);
    const snap = await ref.get();
    if (!snap.exists) throw new ErroHttp(404, 'Informativo não encontrado.');

    const info = { id: snap.id, ...snap.data() };
    const destino = info.enviadoPor?.email;
    if (!destino) throw new ErroHttp(400, 'Informativo sem remetente.');

    // O bloco de padroes so entra quando a recusa foi tecnica: e ali que ele
    // ajuda. Em recusa por conteudo, ele so faria ruido.
    let padroes = null;
    if (decisao === 'rejeitado' && info.motivoRejeicao === 'fora_do_padrao') {
      const publico = await db.collection('configuracoes').doc('publico').get();
      padroes = publico.exists ? publico.data().textoPadroesMidia : null;
    }

    const html = emailDecisao({
      info,
      periodo: periodoExtenso(info.dataInicio, info.dataFim),
      decisao,
      motivo: MOTIVOS[info.motivoRejeicao] || 'Não aprovado',
      observacao: info.observacaoAdmin || '',
      appUrl: appUrl(),
      padroes,
    });

    const assuntos = {
      aprovado: `Seu informativo foi aprovado — ${info.protocolo}`,
      rejeitado: `Seu informativo precisa de ajustes — ${info.protocolo}`,
      cancelado: `Seu informativo saiu do ar — ${info.protocolo}`,
    };

    await enviarEmail({ para: destino, assunto: assuntos[decisao], html });

    await ref.collection('logs').add({
      acao: `notificado_${decisao}`,
      de: null,
      para: decisao,
      por: chamador.email,
      em: FieldValue.serverTimestamp(),
      observacao: null,
    });

    return res.status(200).json({ ok: true });
  } catch (erro) {
    return responderErro(res, erro);
  }
}

function periodoExtenso(inicio, fim) {
  if (!inicio || !fim) return '—';
  const dias = Math.round((new Date(fim) - new Date(inicio)) / 86400000) + 1;
  const br = (iso) => iso.split('-').reverse().join('/');
  return `${br(inicio)} a ${br(fim)} (${dias} ${dias === 1 ? 'dia' : 'dias'})`;
}
