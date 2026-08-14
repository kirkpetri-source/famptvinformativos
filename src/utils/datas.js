/**
 * Datas civis, sem armadilha de fuso.
 *
 * dataInicio e dataFim sao DATAS CIVIS ("dia 15 de agosto"), nao instantes no
 * tempo. Guardadas como timestamp, `new Date('2026-08-15')` em UTC-3 vira
 * 2026-08-14T21:00:00Z e qualquer comparacao no servidor devolve o dia
 * anterior. Por isso o formato de armazenamento e a string 'YYYY-MM-DD', e a
 * comparacao lexicografica dessas strings e cronologicamente correta.
 */

import { parseISO, format, differenceInCalendarDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const FUSO = 'America/Sao_Paulo';

/** Hoje em Brasilia, no formato 'YYYY-MM-DD'. Nunca use new Date() para isto. */
export function hojeISO() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** 'YYYY-MM-DD' somado de N dias, ainda como data civil. */
export function somarDiasISO(iso, dias) {
  return format(addDays(parseISO(iso), dias), 'yyyy-MM-dd');
}

/** '2026-08-15' -> '15/08/2026' */
export function formatarData(iso) {
  if (!iso) return '—';
  return format(parseISO(iso), 'dd/MM/yyyy');
}

/** '2026-08-15' -> '15/08' */
export function formatarDataCurta(iso) {
  if (!iso) return '—';
  return format(parseISO(iso), 'dd/MM');
}

/** '2026-08-15' -> 'sabado, 15 de agosto de 2026' */
export function formatarDataExtenso(iso) {
  if (!iso) return '—';
  return format(parseISO(iso), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

/** Timestamp do Firestore (ou Date) -> '13/08/2026 as 14:32' */
export function formatarDataHora(valor) {
  const d = paraDate(valor);
  if (!d) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(d)
    .replace(', ', ' as ');
}

export function paraDate(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor.toDate === 'function') return valor.toDate();
  if (typeof valor === 'number') return new Date(valor);
  if (typeof valor === 'string') return new Date(valor);
  if (typeof valor.seconds === 'number') return new Date(valor.seconds * 1000);
  return null;
}

/** Quantidade de dias de veiculacao, incluindo o primeiro e o ultimo. */
export function diasDePeriodo(inicioISO, fimISO) {
  if (!inicioISO || !fimISO) return 0;
  return differenceInCalendarDays(parseISO(fimISO), parseISO(inicioISO)) + 1;
}

/** '15/08 -> 29/08' para uso em linha, com o timecode do sistema. */
export function periodoCurto(inicioISO, fimISO) {
  return `${formatarDataCurta(inicioISO)} → ${formatarDataCurta(fimISO)}`;
}

/** '15/08/2026 a 29/08/2026 (15 dias)' para e-mail e relatorio. */
export function periodoExtenso(inicioISO, fimISO) {
  const dias = diasDePeriodo(inicioISO, fimISO);
  return `${formatarData(inicioISO)} a ${formatarData(fimISO)} (${dias} ${
    dias === 1 ? 'dia' : 'dias'
  })`;
}

/** Segundos -> '00:18'. Timecode, nao prosa. */
export function timecode(segundos) {
  if (segundos == null || Number.isNaN(segundos)) return '—';
  const total = Math.round(segundos);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Lista de dias de uma janela, para a regua da Grade de Exibicao. */
export function janelaDeDias(inicioISO, quantidade) {
  const inicio = parseISO(inicioISO);
  return Array.from({ length: quantidade }, (_, i) => {
    const d = addDays(inicio, i);
    return {
      iso: format(d, 'yyyy-MM-dd'),
      diaDoMes: format(d, 'dd'),
      diaDaSemana: format(d, 'EEEEEE', { locale: ptBR }).toUpperCase(),
      fimDeSemana: [0, 6].includes(d.getDay()),
    };
  });
}

/** Comparacao de datas civis. Funciona porque 'YYYY-MM-DD' ordena por string. */
export const antes = (a, b) => a < b;
export const depois = (a, b) => a > b;
export const entre = (iso, inicio, fim) => iso >= inicio && iso <= fim;
