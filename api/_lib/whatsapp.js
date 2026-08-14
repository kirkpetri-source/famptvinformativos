/**
 * Aviso por WhatsApp para a administracao.
 *
 * O e-mail resolve o registro; o WhatsApp resolve a urgencia. Quem opera as
 * TVs nao fica com a caixa de entrada aberta o dia todo, e um informativo que
 * demora dois dias para ser visto perde a data.
 *
 * Provedor atual: CallMeBot — gratuito, sem conta comercial, envia apenas
 * para o numero que autorizou o bot. Serve exatamente para "me avise", que e
 * o caso aqui.
 *
 * LIMITES QUE VOCE PRECISA SABER:
 *  - E servico de terceiro, nao oficial da Meta. Pode sair do ar sem aviso.
 *  - So entrega para o numero que autorizou; nao serve para avisar professores.
 *  - A mensagem chega do numero do CallMeBot, nao do seu.
 *
 * Para trocar por Twilio ou pela API oficial da Meta, este arquivo e o unico
 * lugar a mexer: mantenha a assinatura de avisarWhatsapp().
 */

function limpar(v) {
  return (v || '').replace(/\r/g, '').trim();
}

export function whatsappConfigurado() {
  return Boolean(limpar(process.env.CALLMEBOT_PHONE) && limpar(process.env.CALLMEBOT_APIKEY));
}

/**
 * Envia o aviso. NUNCA lanca: falha de WhatsApp nao pode derrubar um envio
 * que ja foi gravado e ja gerou e-mail.
 *
 * @returns {Promise<{enviado: boolean, motivo?: string}>}
 */
export async function avisarWhatsapp(texto) {
  if (!whatsappConfigurado()) {
    return { enviado: false, motivo: 'nao configurado' };
  }

  const telefone = limpar(process.env.CALLMEBOT_PHONE).replace(/\D/g, '');
  const apikey = limpar(process.env.CALLMEBOT_APIKEY);

  const url =
    'https://api.callmebot.com/whatsapp.php' +
    `?phone=${encodeURIComponent(telefone)}` +
    `&apikey=${encodeURIComponent(apikey)}` +
    `&text=${encodeURIComponent(texto)}`;

  try {
    const controlador = new AbortController();
    const limite = setTimeout(() => controlador.abort(), 12000);

    const r = await fetch(url, { signal: controlador.signal });
    clearTimeout(limite);

    const corpo = await r.text();
    const ok = r.ok && !/error/i.test(corpo);

    return ok
      ? { enviado: true }
      : { enviado: false, motivo: `HTTP ${r.status}: ${corpo.slice(0, 120)}` };
  } catch (erro) {
    return { enviado: false, motivo: erro.name === 'AbortError' ? 'tempo esgotado' : erro.message };
  }
}

/** Texto do aviso de novo envio. Curto: e para ler na notificacao do celular. */
export function textoNovoEnvio({ info, periodo, appUrl }) {
  const urgente = info.prioridade === 'urgente' ? '[URGENTE] ' : '';
  const conforme = info.conformidade?.conforme;

  return (
    `${urgente}Nova mídia para as TVs da FAMP\n\n` +
    `${info.protocolo}\n` +
    `${info.titulo}\n\n` +
    `De: ${info.enviadoPor?.nome} (${info.enviadoPor?.cargo})\n` +
    `Período: ${periodo}\n` +
    `Arquivo: ${info.nomeArquivo}\n` +
    `${conforme ? 'Dentro do padrão das TVs' : 'ATENÇÃO: fora do padrão das TVs'}\n\n` +
    `Analisar: ${appUrl}/informativos/${info.id}`
  );
}
