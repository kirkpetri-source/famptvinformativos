/**
 * Politica de dominio — fonte unica no cliente.
 *
 * Esta politica precisa estar em sincronia com firestore.rules e storage.rules.
 * As rules do Firebase nao leem variavel de ambiente, entao o dominio e a
 * excecao ficam literais nos tres lugares. Ao mudar aqui, mude la tambem.
 *
 * O `hd` do Google Sign-In e apenas uma dica de selecao de conta, nao uma
 * trava: qualquer um pode ignorar e escolher outra conta. A trava real esta
 * nas security rules.
 */

export const DOMINIO_INSTITUCIONAL = '@fampfaculdade.com.br';

/** Contas pessoais liberadas nominalmente. Manter o menor conjunto possivel. */
export const EXCECOES = ['kirkpetri@gmail.com'];

/**
 * ===== CONTAS DE TESTE — REMOVER ANTES DE ENTREGAR O SISTEMA A FAMP =====
 *
 * Existe para permitir testar o fluxo do colaborador sem ter uma conta do
 * dominio institucional. Cada e-mail aqui e um furo na regra de auditoria:
 * um envio feito por esta conta nao e rastreavel a ninguem da faculdade.
 *
 * Para remover: esvazie esta lista nos TRES lugares (aqui, em
 * api/_lib/dominio.js e em firestore.rules + storage.rules) e rode
 * `firebase deploy --only firestore:rules,storage`.
 */
export const EXCECOES_TESTE = ['liontech.sup@gmail.com'];

export function normalizarEmail(email) {
  return (email || '').trim().toLowerCase();
}

export function dominioPermitido(email) {
  const e = normalizarEmail(email);
  if (!e) return false;
  return (
    e.endsWith(DOMINIO_INSTITUCIONAL) || EXCECOES.includes(e) || EXCECOES_TESTE.includes(e)
  );
}

/** Marca visivel na tela de acessos, para a conta de teste nao passar batida. */
export function ehContaDeTeste(email) {
  return EXCECOES_TESTE.includes(normalizarEmail(email));
}

/** Distingue os dois motivos de recusa: a acao do usuario e diferente em cada. */
export const MOTIVO_RECUSA = {
  DOMINIO: 'dominio',
  WHITELIST: 'whitelist',
};
