/**
 * Validacao de midia no navegador, antes de subir qualquer byte.
 *
 * Regra de bloqueio vs. aviso: so bloqueia o que e inutilizavel (tipo errado,
 * arquivo grande demais, video absurdamente longo). Dimensao fora do padrao
 * avisa mas deixa enviar — as vezes a arte e aproveitavel e quem decide e a
 * administracao. O que o sistema nao pode fazer e deixar passar em silencio.
 */

export const LARGURA_PADRAO = 1920;
export const ALTURA_PADRAO = 1080;
export const DURACAO_MAXIMA_S = 30;
export const DURACAO_BLOQUEIO_S = 120;

export const TIPOS_ACEITOS = {
  'image/jpeg': 'imagem',
  'image/png': 'imagem',
  'video/mp4': 'video',
  'application/pdf': 'pdf',
};

/** Aceito pelo react-dropzone. */
export const ACCEPT_DROPZONE = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'video/mp4': ['.mp4'],
  'application/pdf': ['.pdf'],
};

export const LIMITES_PADRAO = {
  limiteImagemMB: 15,
  limiteVideoMB: 70,
  limitePdfMB: 20,
};

/** Peso a partir do qual vale sugerir um arquivo mais leve. Nao e erro. */
export const IDEAL_MB = { imagem: 3, video: 20, pdf: 5 };

export const PROBLEMA = {
  DIMENSAO: 'dimensao',
  ORIENTACAO: 'orientacao',
  DURACAO: 'duracao',
  AUDIO: 'audio',
  NAO_VERIFICAVEL: 'nao_verificavel',
};

export const TEXTO_PROBLEMA = {
  [PROBLEMA.DIMENSAO]: 'Fora de 1920 x 1080',
  [PROBLEMA.ORIENTACAO]: 'Arquivo em pe — as TVs sao deitadas',
  [PROBLEMA.DURACAO]: `Passa de ${DURACAO_MAXIMA_S} segundos`,
  [PROBLEMA.AUDIO]: 'Tem faixa de audio — as TVs nao reproduzem som',
  [PROBLEMA.NAO_VERIFICAVEL]: 'Formato nao verificavel automaticamente',
};

export function categoriaDoArquivo(file) {
  return TIPOS_ACEITOS[file?.type] || null;
}

export function limiteMB(categoria, limites = LIMITES_PADRAO) {
  if (categoria === 'imagem') return limites.limiteImagemMB;
  if (categoria === 'video') return limites.limiteVideoMB;
  if (categoria === 'pdf') return limites.limitePdfMB;
  return 0;
}

export function formatarBytes(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Le dimensoes de uma imagem, sem inserir nada na arvore visivel. */
function medirImagem(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ largura: img.naturalWidth, altura: img.naturalHeight });
    img.onerror = () => reject(new Error('Nao foi possivel ler a imagem.'));
    img.src = url;
  });
}

/**
 * Le dimensoes, duracao e presenca de audio de um MP4.
 *
 * A deteccao de audio e MELHOR ESFORCO: as propriedades usadas aqui nao
 * existem em todos os navegadores. Por isso ela e complementada pela
 * declaracao explicita do remetente — nunca confie so nela.
 */
function medirVideo(url) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;

    const limpar = () => {
      video.onloadedmetadata = null;
      video.onerror = null;
    };

    video.onloadedmetadata = () => {
      const temAudio =
        video.mozHasAudio === true ||
        Boolean(video.webkitAudioDecodedByteCount) ||
        Boolean(video.audioTracks && video.audioTracks.length);

      limpar();
      resolve({
        largura: video.videoWidth,
        altura: video.videoHeight,
        duracaoSegundos: Number.isFinite(video.duration) ? video.duration : null,
        temAudio,
        audioIndeterminado:
          video.mozHasAudio === undefined &&
          video.webkitAudioDecodedByteCount === undefined &&
          !video.audioTracks,
      });
    };

    video.onerror = () => {
      limpar();
      reject(new Error('Nao foi possivel ler o video.'));
    };

    video.src = url;
  });
}

/**
 * Analisa o arquivo escolhido.
 * Devolve { bloqueio, categoria, largura, altura, duracaoSegundos, temAudio,
 *           conformidade: { conforme, problemas }, dicaPeso }.
 * `bloqueio` preenchido significa: nao deixe enviar.
 */
export async function analisarArquivo(file, limites = LIMITES_PADRAO) {
  const categoria = categoriaDoArquivo(file);

  if (!categoria) {
    return {
      bloqueio: 'Formato nao aceito. Envie JPG, PNG, MP4 ou PDF.',
      categoria: null,
    };
  }

  const limite = limiteMB(categoria, limites);
  if (file.size > limite * 1024 * 1024) {
    return {
      bloqueio: `Arquivo de ${formatarBytes(file.size)}. O limite para ${
        categoria === 'pdf' ? 'PDF' : categoria
      } e ${limite} MB.`,
      categoria,
    };
  }

  const base = {
    categoria,
    largura: null,
    altura: null,
    duracaoSegundos: null,
    temAudio: null,
    audioIndeterminado: false,
    bloqueio: null,
  };

  const problemas = [];
  const url = URL.createObjectURL(file);

  try {
    if (categoria === 'imagem') {
      const { largura, altura } = await medirImagem(url);
      base.largura = largura;
      base.altura = altura;
    } else if (categoria === 'video') {
      const m = await medirVideo(url);
      Object.assign(base, m);

      if (m.duracaoSegundos && m.duracaoSegundos > DURACAO_BLOQUEIO_S) {
        return {
          ...base,
          bloqueio: `Video de ${Math.round(
            m.duracaoSegundos
          )} segundos. O maximo aceito e ${DURACAO_BLOQUEIO_S} segundos.`,
        };
      }
      if (m.duracaoSegundos && m.duracaoSegundos > DURACAO_MAXIMA_S + 0.5) {
        problemas.push(PROBLEMA.DURACAO);
      }
      if (m.temAudio) {
        problemas.push(PROBLEMA.AUDIO);
      }
    } else {
      // PDF: o navegador nao mede a pagina sem biblioteca extra.
      problemas.push(PROBLEMA.NAO_VERIFICAVEL);
    }

    if (base.largura && base.altura) {
      if (base.largura !== LARGURA_PADRAO || base.altura !== ALTURA_PADRAO) {
        problemas.push(PROBLEMA.DIMENSAO);
      }
      if (base.largura / base.altura < 1) {
        problemas.push(PROBLEMA.ORIENTACAO);
      }
    }
  } catch (erro) {
    return { ...base, bloqueio: erro.message };
  } finally {
    URL.revokeObjectURL(url);
  }

  const ideal = IDEAL_MB[categoria];
  const mb = file.size / (1024 * 1024);

  return {
    ...base,
    conformidade: {
      conforme: problemas.length === 0,
      problemas,
    },
    dicaPeso:
      mb > ideal
        ? `Este arquivo tem ${formatarBytes(
            file.size
          )}. Cerca de ${ideal} MB ja bastaria, com a mesma qualidade na TV.`
        : null,
  };
}

/** Quais declaracoes o remetente precisa marcar, conforme o tipo. */
export function declaracoesExigidas(categoria) {
  if (categoria === 'video') return ['semAudio', 'legendado'];
  if (categoria === 'pdf') return ['pdfPaisagemPaginaUnica'];
  return []; // imagem nao tem audio nem fala; nao pedir e nao ensinar a marcar sem ler
}

export const TEXTO_DECLARACAO = {
  semAudio:
    'Confirmo que o arquivo nao tem audio, ou que o audio e dispensavel para o entendimento.',
  legendado: 'Se o video tem fala, ela esta legendada na imagem.',
  pdfPaisagemPaginaUnica: 'Confirmo que o PDF tem uma unica pagina, em paisagem.',
};

/** Resumo de uma linha para o e-mail e para a lista. */
export function resumoConformidade(conformidade) {
  if (!conformidade) return 'NAO VERIFICADO';
  if (conformidade.conforme) return 'CONFORME';
  const lista = (conformidade.problemas || [])
    .map((p) => TEXTO_PROBLEMA[p] || p)
    .join('; ');
  return `FORA DO PADRAO: ${lista}`;
}
