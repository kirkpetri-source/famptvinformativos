/**
 * Reamostragem de imagem no navegador, antes do upload.
 *
 * Um PNG de 8 MB exportado do Canva vira cerca de 600 KB sem perda visivel a
 * 3 metros de distancia. Isso corta o consumo de Storage, acelera o upload no
 * 4G do professor e nao muda nada do ponto de vista da TV.
 *
 * Se qualquer coisa falhar, devolve o arquivo original. A otimizacao nunca
 * pode bloquear um envio.
 */

import { LARGURA_PADRAO, ALTURA_PADRAO } from './midia.js';

/** Abaixo disso nao vale a pena reprocessar. */
const LIMIAR_BYTES = 1.5 * 1024 * 1024;
const QUALIDADE = 0.85;

function carregarImagem(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('falha ao carregar'));
    img.src = url;
  });
}

/**
 * @returns {Promise<{arquivo: File, otimizado: boolean, tamanhoOriginal: number}>}
 */
export async function comprimirImagem(file) {
  const original = { arquivo: file, otimizado: false, tamanhoOriginal: file.size };

  const ehImagem = file.type === 'image/jpeg' || file.type === 'image/png';
  if (!ehImagem || file.size <= LIMIAR_BYTES) return original;

  const url = URL.createObjectURL(file);

  try {
    const img = await carregarImagem(url);

    // Cabe dentro de 1920x1080 preservando a proporcao. Nunca amplia.
    const escala = Math.min(
      LARGURA_PADRAO / img.naturalWidth,
      ALTURA_PADRAO / img.naturalHeight,
      1
    );
    const largura = Math.round(img.naturalWidth * escala);
    const altura = Math.round(img.naturalHeight * escala);

    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;

    const ctx = canvas.getContext('2d');
    if (!ctx) return original;

    // PNG com transparencia perde o canal ao virar JPEG: fundo branco explicito
    // e melhor que preto, que e o que o canvas faria por omissao.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, largura, altura);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, largura, altura);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALIDADE)
    );

    // Se o resultado nao ficou menor, o original ja estava bom.
    if (!blob || blob.size >= file.size) return original;

    const nome = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    const arquivo = new File([blob], nome, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    return { arquivo, otimizado: true, tamanhoOriginal: file.size };
  } catch {
    return original;
  } finally {
    URL.revokeObjectURL(url);
  }
}
