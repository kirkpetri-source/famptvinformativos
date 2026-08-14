import { hojeISO, formatarDataCurta, diasDePeriodo, periodoCurto } from '../utils/datas.js';

/**
 * O idioma unico do sistema.
 *
 * Todo lugar onde existe um periodo de veiculacao ele aparece como barra
 * horizontal sobre uma regua de dias. Mesma gramatica, escalas diferentes:
 * a Grade de Exibicao usa a versao completa, listas e detalhes usam a
 * compacta. E essa repeticao que faz o sistema parecer um sistema.
 */
export default function PeriodoVeiculacao({ inicio, fim, mostrarProgresso = true }) {
  const hoje = hojeISO();
  const total = diasDePeriodo(inicio, fim);

  let progresso = 0;
  if (hoje > fim) progresso = 100;
  else if (hoje >= inicio) progresso = (diasDePeriodo(inicio, hoje) / total) * 100;

  return (
    <span className="periodo">
      <span className="meta" style={{ whiteSpace: 'nowrap' }}>
        {periodoCurto(inicio, fim)}
      </span>

      {mostrarProgresso ? (
        <span
          className="periodo__trilho"
          role="img"
          aria-label={`De ${formatarDataCurta(inicio)} a ${formatarDataCurta(fim)}, ${total} dias`}
        >
          <span className="periodo__preenchido" style={{ left: 0, width: `${progresso}%` }} />
        </span>
      ) : null}

      <span className="meta" style={{ whiteSpace: 'nowrap' }}>
        {total} {total === 1 ? 'dia' : 'dias'}
      </span>
    </span>
  );
}
