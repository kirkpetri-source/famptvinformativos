/**
 * Ciclo de vida de um informativo.
 *
 *   rascunho -> pendente -> aprovado -> programado -> no_ar -> expirado
 *                        \-> rejeitado
 *   qualquer status ativo -> cancelado
 *
 * `programado` existe porque o sistema NAO fala com o CMS das TVs. Sem esse
 * passo, "no ar" seria uma suposicao por data e a auditoria mentiria: diria
 * que algo esteve na tela sem ninguem ter cadastrado nada.
 */

export const STATUS = {
  RASCUNHO: 'rascunho',
  PENDENTE: 'pendente',
  APROVADO: 'aprovado',
  PROGRAMADO: 'programado',
  NO_AR: 'no_ar',
  EXPIRADO: 'expirado',
  REJEITADO: 'rejeitado',
  CANCELADO: 'cancelado',
};

export const TEXTO_STATUS = {
  rascunho: 'Rascunho',
  pendente: 'Aguardando análise',
  aprovado: 'Aprovado',
  programado: 'Programado',
  no_ar: 'No ar',
  expirado: 'Expirado',
  rejeitado: 'Rejeitado',
  cancelado: 'Cancelado',
};

/** Classe do badge. Sempre par soft/escuro; nunca cor forte com texto branco. */
export const CLASSE_STATUS = {
  rascunho: 'badge--neutro',
  pendente: 'badge--pendente',
  aprovado: 'badge--aprovado',
  programado: 'badge--programado',
  no_ar: 'badge--no-ar',
  expirado: 'badge--expirado',
  rejeitado: 'badge--rejeitado',
  cancelado: 'badge--cancelado',
};

/** Aparecem nos filtros. Rascunho nunca chega ao admin. */
export const STATUS_VISIVEIS = [
  STATUS.PENDENTE,
  STATUS.APROVADO,
  STATUS.PROGRAMADO,
  STATUS.NO_AR,
  STATUS.EXPIRADO,
  STATUS.REJEITADO,
  STATUS.CANCELADO,
];

/** Ainda podem ser cancelados. */
export const STATUS_ATIVOS = [
  STATUS.PENDENTE,
  STATUS.APROVADO,
  STATUS.PROGRAMADO,
  STATUS.NO_AR,
];

export const MOTIVO_REJEICAO = {
  fora_do_padrao: 'Fora do padrão técnico das TVs',
  politica_de_conteudo: 'Contraria a política de conteúdo',
  data_invalida: 'Período de veiculação inviável',
  duplicado: 'Informativo duplicado',
  outro: 'Outro motivo',
};

export const PRIORIDADE = { NORMAL: 'normal', URGENTE: 'urgente' };
