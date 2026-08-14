import { escapar, escaparComQuebras, urlSegura } from './escapar.js';

/**
 * Templates de e-mail.
 *
 * Tabelas, largura fixa e CSS inline: e e-mail, nao pagina. Cliente de e-mail
 * ignora folha de estilo externa e boa parte de flexbox.
 *
 * TUDO que vem do banco passa por escapar(). Titulo e conteudo sao texto livre
 * do usuario — sem escape, um titulo com marcacao vira marcacao executavel na
 * caixa de entrada de quem recebe.
 */

const COR = {
  laranja: '#E8941A',
  marromEscuro: '#2D1A06',
  marrom: '#4A2C0A',
  cinza: '#5B6270',
  cinzaClaro: '#E8E5E0',
  fundo: '#FDF8F2',
  sucesso: '#0F7A38',
  perigo: '#B91C1C',
};

const FONTE =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function moldura(conteudo, appUrl) {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:24px 0;background:${COR.fundo};font-family:${FONTE};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
             style="width:600px;max-width:100%;background:#ffffff;border:1px solid ${COR.cinzaClaro};border-radius:8px;">
        <tr><td style="padding:24px 24px 0;">
          <img src="${urlSegura(appUrl)}/famp-logo.png" alt="FAMP" height="30"
               style="display:block;height:30px;border:0;" />
        </td></tr>
        ${conteudo}
        <tr><td style="padding:16px 24px 24px;border-top:1px solid ${COR.cinzaClaro};">
          <p style="margin:0;font-size:12px;color:${COR.cinza};">
            TV Informativos &middot; Faculdade Morgana Potrich
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function linha(rotulo, valor, destaque = false) {
  if (valor == null || valor === '') return '';
  return `<tr>
    <td style="padding:6px 0;vertical-align:top;width:150px;">
      <span style="font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:${COR.cinza};">${escapar(
        rotulo
      )}</span>
    </td>
    <td style="padding:6px 0;vertical-align:top;">
      <span style="font-size:14px;color:${destaque ? COR.marromEscuro : COR.marrom};font-weight:${
    destaque ? 600 : 400
  };">${valor}</span>
    </td>
  </tr>`;
}

function botao(texto, href) {
  return `<a href="${urlSegura(href)}"
    style="display:inline-block;background:${COR.laranja};color:${COR.marromEscuro};
    font-weight:600;font-size:14px;text-decoration:none;padding:11px 20px;border-radius:8px;">
    ${escapar(texto)}</a>`;
}

/** Novo envio -> administracao. */
export function emailNovoEnvio({ info, periodo, conformidade, linkArquivo, appUrl, comAnexo }) {
  const p = info.enviadoPor || {};
  const urgente = info.prioridade === 'urgente';
  const conforme = info.conformidade?.conforme;

  const fichaTecnica = [
    info.largura && info.altura ? `${info.largura} × ${info.altura}` : null,
    info.tipoArquivo,
    info.duracaoSegundos ? `${Math.round(info.duracaoSegundos)}s` : null,
    info.tamanhoBytes ? `${(info.tamanhoBytes / 1048576).toFixed(1)} MB` : null,
  ]
    .filter(Boolean)
    .map(escapar)
    .join(' &middot; ');

  const declaracoes = [];
  if (info.declaracoes?.semAudio != null) {
    declaracoes.push(`Sem áudio: ${info.declaracoes.semAudio ? 'sim' : 'não'}`);
  }
  if (info.declaracoes?.legendado != null) {
    declaracoes.push(`Legendado: ${info.declaracoes.legendado ? 'sim' : 'não'}`);
  }
  if (info.declaracoes?.pdfPaisagemPaginaUnica != null) {
    declaracoes.push(
      `PDF página única em paisagem: ${info.declaracoes.pdfPaisagemPaginaUnica ? 'sim' : 'não'}`
    );
  }

  const corpo = `
  <tr><td style="padding:20px 24px 0;">
    ${
      urgente
        ? `<p style="margin:0 0 12px;display:inline-block;background:#FDECEC;color:${COR.perigo};
             font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;
             padding:4px 10px;border-radius:999px;">Urgente</p>`
        : ''
    }
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:.04em;color:${COR.cinza};">${escapar(
    info.protocolo || 'sem protocolo'
  )}</p>
    <h1 style="margin:0 0 16px;font-size:20px;line-height:1.25;color:${COR.marromEscuro};">${escapar(
    info.titulo
  )}</h1>

    <p style="margin:0 0 20px;padding:12px;background:${COR.fundo};border-radius:8px;
       font-size:14px;line-height:1.5;color:${COR.marrom};">${escaparComQuebras(info.conteudo)}</p>

    <p style="margin:0 0 16px;padding:10px 12px;border-left:3px solid ${
      conforme ? COR.sucesso : COR.perigo
    };background:${conforme ? '#E3F5EA' : '#FDECEC'};font-size:14px;font-weight:600;
       color:${conforme ? COR.sucesso : COR.perigo};">${escapar(conformidade)}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${linha('Período', escapar(periodo), true)}
      ${linha('Remetente', escapar(p.nome))}
      ${linha('Cargo', escapar(p.cargo))}
      ${linha(
        'E-mail',
        `<a href="mailto:${escapar(p.email)}" style="color:#1D4ED8;">${escapar(p.email)}</a>`
      )}
      ${linha(
        'WhatsApp',
        p.whatsapp
          ? `<a href="https://wa.me/55${escapar(p.whatsapp)}" style="color:#1D4ED8;">${escapar(
              formatarTelefone(p.whatsapp)
            )}</a>`
          : null
      )}
      ${linha('Arquivo', escapar(info.nomeArquivo))}
      ${linha('Ficha técnica', fichaTecnica)}
      ${linha('Declarações', declaracoes.map(escapar).join('<br />'))}
      ${linha('Justificativa', escaparComQuebras(info.justificativaUrgencia))}
    </table>
  </td></tr>

  <tr><td style="padding:20px 24px;">
    ${botao('Abrir no painel', `${appUrl}/informativos/${info.id}`)}
    ${
      linkArquivo
        ? `<a href="${urlSegura(linkArquivo)}"
             style="display:inline-block;margin-left:8px;font-size:14px;color:#1D4ED8;
             text-decoration:underline;padding:11px 0;">Baixar o arquivo</a>`
        : ''
    }
    ${
      !comAnexo && linkArquivo
        ? `<p style="margin:12px 0 0;font-size:12px;color:${COR.cinza};">
             O arquivo não foi anexado por causa do tamanho. O link acima vale por 7 dias.
           </p>`
        : ''
    }
  </td></tr>`;

  return moldura(corpo, appUrl);
}

/** Decisao -> remetente. */
export function emailDecisao({ info, periodo, decisao, motivo, observacao, appUrl, padroes }) {
  const aprovado = decisao === 'aprovado';
  const cancelado = decisao === 'cancelado';

  const titulos = {
    aprovado: 'Seu informativo foi aprovado',
    rejeitado: 'Seu informativo não foi aprovado',
    cancelado: 'Seu informativo saiu do ar',
  };

  const corpo = `
  <tr><td style="padding:20px 24px 0;">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:.04em;color:${COR.cinza};">${escapar(
    info.protocolo || ''
  )}</p>
    <h1 style="margin:0 0 16px;font-size:20px;line-height:1.25;color:${COR.marromEscuro};">${escapar(
    titulos[decisao]
  )}</h1>

    <p style="margin:0 0 20px;font-size:15px;color:${COR.marrom};">
      <strong>${escapar(info.titulo)}</strong>
    </p>

    ${
      aprovado
        ? `<p style="margin:0 0 16px;padding:12px;background:#E3F5EA;border-left:3px solid ${COR.sucesso};
             font-size:14px;color:${COR.sucesso};">
             A exibição começa em ${escapar(periodo)}.
           </p>`
        : `<p style="margin:0 0 16px;padding:12px;background:${
            cancelado ? '#FDF2E0' : '#FDECEC'
          };border-left:3px solid ${cancelado ? COR.laranja : COR.perigo};
             font-size:14px;color:${cancelado ? '#B86F0C' : COR.perigo};">
             <strong>${escapar(motivo)}</strong><br />${escaparComQuebras(observacao)}
           </p>`
    }

    ${
      padroes
        ? `<pre style="margin:0 0 16px;padding:12px;background:${COR.fundo};border-radius:8px;
             font-size:12px;line-height:1.6;color:${COR.marrom};white-space:pre-wrap;
             font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapar(padroes)}</pre>`
        : ''
    }
  </td></tr>

  <tr><td style="padding:0 24px 24px;">
    ${
      decisao === 'rejeitado'
        ? botao('Reenviar corrigido', `${appUrl}/enviar?reenvioDe=${info.id}`)
        : botao('Ver meus envios', `${appUrl}/meus-envios`)
    }
  </td></tr>`;

  return moldura(corpo, appUrl);
}

/** Resumo diario -> administracao. Nao e enviado quando nao ha nada a fazer. */
export function emailResumoDiario({ entram, saem, pendentes, aguardandoProgramacao, atrasados, appUrl }) {
  const bloco = (titulo, itens, cor) => {
    if (!itens.length) return '';
    return `<h2 style="margin:20px 0 8px;font-size:14px;color:${cor};">${escapar(titulo)}</h2>
      <ul style="margin:0;padding-left:18px;font-size:14px;color:${COR.marrom};">
        ${itens
          .map(
            (i) =>
              `<li style="margin-bottom:4px;">${escapar(i.protocolo || '—')} — ${escapar(
                i.titulo
              )}</li>`
          )
          .join('')}
      </ul>`;
  };

  const corpo = `
  <tr><td style="padding:20px 24px 0;">
    <h1 style="margin:0 0 4px;font-size:20px;color:${COR.marromEscuro};">Resumo do dia</h1>
    <p style="margin:0 0 16px;font-size:13px;color:${COR.cinza};">
      ${pendentes} aguardando análise &middot; ${aguardandoProgramacao} aguardando programação
    </p>

    ${bloco('Atrasados — data de início já passou sem programação', atrasados, COR.perigo)}
    ${bloco('Entram no ar hoje', entram, COR.marromEscuro)}
    ${bloco('Saem do ar hoje', saem, COR.marromEscuro)}
  </td></tr>

  <tr><td style="padding:20px 24px;">
    ${botao('Abrir a fila de programação', `${appUrl}/programacao`)}
  </td></tr>`;

  return moldura(corpo, appUrl);
}

function formatarTelefone(digitos) {
  const d = String(digitos || '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}
