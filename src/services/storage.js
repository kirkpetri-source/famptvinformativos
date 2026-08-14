import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase.js';

/**
 * Upload com progresso real, cancelamento e retomada.
 *
 * O documento no Firestore ja existe quando isto roda — e o que permite a
 * regra do Storage conferir de quem e a pasta, e o que evita arquivo orfao.
 */
export function enviarArquivo({ caminho, arquivo, aoProgredir }) {
  const tarefa = uploadBytesResumable(ref(storage, caminho), arquivo, {
    contentType: arquivo.type,
    cacheControl: 'private, max-age=3600',
  });

  const promessa = new Promise((resolve, reject) => {
    tarefa.on(
      'state_changed',
      (snap) => {
        if (aoProgredir && snap.totalBytes) {
          aoProgredir(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }
      },
      (erro) => reject(traduzirErro(erro)),
      () => resolve(caminho)
    );
  });

  return { promessa, cancelar: () => tarefa.cancel(), pausar: () => tarefa.pause() };
}

/**
 * URL resolvida SOB DEMANDA.
 *
 * A URL nunca e gravada no documento: getDownloadURL devolve um token que nao
 * expira e ignora as security rules. Gravado no banco, viraria um endereco
 * publico permanente do arquivo. Aqui a chamada em si passa pelas regras, e a
 * URL vive apenas na memoria da aba.
 */
export async function urlDoArquivo(caminho) {
  if (!caminho) return null;
  try {
    return await getDownloadURL(ref(storage, caminho));
  } catch (erro) {
    if (erro?.code === 'storage/object-not-found') return null;
    throw traduzirErro(erro);
  }
}

/** Baixa com o nome padronizado, que e o nome usado no CMS das TVs. */
export async function baixarComNome(caminho, nomeArquivo) {
  const url = await urlDoArquivo(caminho);
  if (!url) throw new Error('Arquivo não está mais disponível.');

  // fetch + blob para que o atributo download seja respeitado mesmo com o
  // arquivo vindo de outro dominio.
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error('Falha ao baixar o arquivo.');

  const blob = await resposta.blob();
  const urlLocal = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = urlLocal;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(urlLocal), 1000);
}

function traduzirErro(erro) {
  const codigo = erro?.code || '';
  if (codigo === 'storage/canceled') return new Error('Envio cancelado.');
  if (codigo === 'storage/unauthorized') {
    return new Error('Sem permissão para enviar este arquivo.');
  }
  if (codigo === 'storage/retry-limit-exceeded') {
    return new Error('A conexão caiu durante o envio. Tente de novo.');
  }
  if (codigo === 'storage/quota-exceeded') {
    return new Error('O armazenamento está cheio. Avise a coordenação.');
  }
  return new Error('Falha no envio do arquivo. Tente de novo.');
}
