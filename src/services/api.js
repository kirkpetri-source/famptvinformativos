import { tokenAtual } from './auth.js';

/**
 * Chamadas as funcoes da pasta api/.
 *
 * Todas mandam o ID Token e apenas o docId. O servidor le o resto do
 * Firestore: nada do que vem do navegador e tratado como verdade.
 */

async function chamar(rota, corpo) {
  const token = await tokenAtual();

  const resposta = await fetch(rota, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(corpo),
  });

  if (!resposta.ok) {
    let mensagem = `A API respondeu ${resposta.status}.`;
    try {
      const dados = await resposta.json();
      if (dados?.erro) mensagem = dados.erro;
    } catch {
      // resposta sem corpo JSON; a mensagem padrao serve
    }
    throw new Error(mensagem);
  }

  return resposta.json();
}

/** Gera o protocolo e avisa a administracao. Devolve o protocolo. */
export async function notificarEnvio(docId) {
  const dados = await chamar('/api/notificar-envio', { docId });
  return dados.protocolo || null;
}

/** Avisa o remetente da decisao. decisao: aprovado | rejeitado | cancelado. */
export function notificarDecisao(docId, decisao) {
  return chamar('/api/notificar-decisao', { docId, decisao });
}
