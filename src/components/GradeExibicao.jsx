import { useMemo } from 'react';
import { janelaDeDias, hojeISO, somarDiasISO } from '../utils/datas.js';
import { STATUS } from '../utils/status.js';

const DIAS_ANTES = 7;
const TOTAL_DIAS = 21;

/**
 * Elemento assinatura A — grade de programacao de TV.
 *
 * Em vez de abrir o painel com quatro cards de numero, abre com a linha do
 * tempo: cada informativo e uma barra que vai da data de inicio a de termino,
 * empilhada em faixas.
 *
 * A densidade da grade e a metrica que importa. Da para ver de relance se o
 * loop das telas esta cheio demais ou vazio — coisa que numero nenhum diz.
 */
export default function GradeExibicao({ informativos, aoClicar }) {
  const hoje = hojeISO();
  const inicioJanela = somarDiasISO(hoje, -DIAS_ANTES);
  const dias = useMemo(() => janelaDeDias(inicioJanela, TOTAL_DIAS), [inicioJanela]);
  const fimJanela = dias[dias.length - 1].iso;

  const faixas = useMemo(
    () => distribuirEmFaixas(informativos, inicioJanela, fimJanela),
    [informativos, inicioJanela, fimJanela]
  );

  const indiceHoje = dias.findIndex((d) => d.iso === hoje);

  if (!informativos.length) {
    return (
      <div className="bloco">
        <p className="secundario">
          Nada programado para as próximas semanas. As telas estão livres.
        </p>
      </div>
    );
  }

  return (
    <div className="regua-tempo-rolagem">
      <div className="regua-tempo" style={{ '--dias': TOTAL_DIAS }}>
        <div className="regua-tempo__dias">
          {dias.map((dia) => (
            <div
              key={dia.iso}
              className={`regua-tempo__dia ${dia.fimDeSemana ? 'regua-tempo__dia--fds' : ''}`}
            >
              {dia.diaDaSemana}
              <strong>{dia.diaDoMes}</strong>
            </div>
          ))}
        </div>

        <div
          className="regua-tempo__faixas"
          style={{ gridTemplateRows: `repeat(${faixas.length || 1}, 28px)` }}
        >
          {indiceHoje >= 0 ? (
            <div
              className="regua-tempo__hoje"
              style={{ left: `${((indiceHoje + 0.5) / TOTAL_DIAS) * 100}%` }}
              aria-hidden="true"
            />
          ) : null}

          {faixas.map((faixa, indiceFaixa) =>
            faixa.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`barra barra--${classeDoStatus(item.status)}`}
                style={{
                  '--faixa': indiceFaixa + 1,
                  '--inicio': item.colunaInicio,
                  '--fim': item.colunaFim,
                }}
                onClick={() => aoClicar?.(item)}
                title={`${item.titulo} — ${item.dataInicio} a ${item.dataFim}`}
              >
                {item.status === STATUS.NO_AR ? (
                  <span className="tally" aria-hidden="true" />
                ) : null}
                <span>{item.titulo}</span>
              </button>
            ))
          )}
        </div>

        <Legenda />
      </div>
    </div>
  );
}

function Legenda() {
  return (
    <div className="linha linha--quebra mt-4" style={{ gap: 'var(--e-4)' }}>
      <Marca classe="barra--no-ar" texto="no ar" />
      <Marca classe="barra--programado" texto="programado" />
      <Marca classe="barra--aprovado" texto="aprovado, não programado" />
    </div>
  );
}

function Marca({ classe, texto }) {
  return (
    <span className="linha" style={{ gap: 'var(--e-2)' }}>
      <span
        className={`barra ${classe}`}
        style={{ width: 24, height: 12, padding: 0, display: 'inline-block' }}
        aria-hidden="true"
      />
      <span className="meta">{texto}</span>
    </span>
  );
}

function classeDoStatus(status) {
  if (status === STATUS.NO_AR) return 'no-ar';
  if (status === STATUS.PROGRAMADO) return 'programado';
  if (status === STATUS.APROVADO) return 'aprovado';
  return 'expirado';
}

/**
 * Empilha as barras em faixas para que duas nunca se sobreponham.
 * Guloso simples: cada item entra na primeira faixa onde couber.
 */
function distribuirEmFaixas(informativos, inicioJanela, fimJanela) {
  const posicionados = informativos
    .map((item) => {
      const inicio = item.dataInicio < inicioJanela ? inicioJanela : item.dataInicio;
      const fim = item.dataFim > fimJanela ? fimJanela : item.dataFim;
      return {
        ...item,
        colunaInicio: diferencaDias(inicioJanela, inicio) + 1,
        colunaFim: diferencaDias(inicioJanela, fim) + 2,
      };
    })
    .filter((i) => i.colunaFim > i.colunaInicio)
    .sort((a, b) => a.colunaInicio - b.colunaInicio);

  const faixas = [];

  for (const item of posicionados) {
    let alocado = false;
    for (const faixa of faixas) {
      const cabe = faixa.every(
        (existente) =>
          item.colunaInicio >= existente.colunaFim || item.colunaFim <= existente.colunaInicio
      );
      if (cabe) {
        faixa.push(item);
        alocado = true;
        break;
      }
    }
    if (!alocado) faixas.push([item]);
  }

  return faixas;
}

function diferencaDias(de, ate) {
  return Math.round((new Date(`${ate}T12:00:00Z`) - new Date(`${de}T12:00:00Z`)) / 86400000);
}
