import { autenticar, responderErro, ErroHttp } from './_lib/autenticar.js';
import { sincronizarClaim } from './_lib/claims.js';

/**
 * Chamado pela tela de Acessos depois de liberar, promover, rebaixar ou
 * desativar alguem.
 *
 * A whitelist e escrita direto pelo cliente (a regra do Firestore garante que
 * so admin consegue). Este endpoint existe so para propagar o perfil para o
 * custom claim do token, que e o que as regras do Storage enxergam.
 *
 * Sem ele, um colaborador promovido a admin continuaria sem conseguir abrir a
 * midia dos outros ate o token expirar sozinho.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  try {
    const chamador = await autenticar(req);

    if (!chamador.isAdmin) {
      throw new ErroHttp(403, 'Apenas a administração pode sincronizar acessos.');
    }

    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      throw new ErroHttp(400, 'E-mail ausente.');
    }

    const resultado = await sincronizarClaim(email);
    return res.status(200).json(resultado);
  } catch (erro) {
    return responderErro(res, erro);
  }
}
