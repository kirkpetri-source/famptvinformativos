/**
 * Politica de dominio no servidor.
 *
 * Copia deliberada de src/utils/dominio.js: as funcoes da pasta api/ nao devem
 * importar codigo de src/ (o Vite empacota src/, o servidor nao). Ao mudar a
 * politica, mude nos tres lugares: aqui, em src/utils/dominio.js e nas rules.
 */

export const DOMINIO_INSTITUCIONAL = '@fampfaculdade.com.br';
export const EXCECOES = ['kirkpetri@gmail.com'];

/** ===== CONTAS DE TESTE — REMOVER ANTES DE ENTREGAR O SISTEMA A FAMP ===== */
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
