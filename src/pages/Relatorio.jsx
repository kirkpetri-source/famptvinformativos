import { useEffect, useState, useMemo, Fragment } from 'react';
import { FileDown, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../hooks/useToast.jsx';
import EstadoVazio from '../components/EstadoVazio.jsx';
import { ListaSkeleton } from '../components/Carregando.jsx';
import { listarInformativos } from '../services/informativos.js';
import { listarRemetentes } from '../services/usuarios.js';
import {
  exportarCSV,
  exportarPDF,
  montarLinhas,
  COLUNAS,
  COLUNAS_PRINCIPAIS,
  TITULO_COLUNA,
} from '../utils/exportar.js';
import { hojeISO } from '../utils/datas.js';
import { STATUS_VISIVEIS, TEXTO_STATUS } from '../utils/status.js';

const POR_PAGINA = 25;

export default function Relatorio() {
  const toast = useToast();
  const [todos, setTodos] = useState(null);
  const [remetentes, setRemetentes] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [exportando, setExportando] = useState(false);
  const [aberta, setAberta] = useState(null);

  const [filtros, setFiltros] = useState({
    de: '',
    ate: '',
    status: '',
    prioridade: '',
    remetente: '',
    conformidade: '',
  });

  useEffect(() => {
    Promise.all([carregarTudo(), listarRemetentes()])
      .then(([itens, pessoas]) => {
        setTodos(itens);
        setRemetentes(pessoas);
      })
      .catch((e) => {
        console.error(e);
        toast.erro('Não foi possível carregar o relatório.');
        setTodos([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Os filtros são aplicados em memória sobre a base carregada.
   * No volume deste sistema (dezenas por mês) isso é mais simples e mais
   * rápido do que uma consulta por combinação — e não exige um índice novo
   * a cada filtro que a administração pedir.
   */
  const filtrados = useMemo(() => {
    if (!todos) return [];
    return todos.filter((i) => {
      const dataEnvio = i.enviadoEm?.toDate?.()?.toISOString().slice(0, 10) || '';
      if (filtros.de && dataEnvio < filtros.de) return false;
      if (filtros.ate && dataEnvio > filtros.ate) return false;
      if (filtros.status && i.status !== filtros.status) return false;
      if (filtros.prioridade && i.prioridade !== filtros.prioridade) return false;
      if (filtros.remetente && i.enviadoPor?.uid !== filtros.remetente) return false;
      if (filtros.conformidade === 'conforme' && !i.conformidade?.conforme) return false;
      if (filtros.conformidade === 'fora' && i.conformidade?.conforme !== false) return false;
      return true;
    });
  }, [todos, filtros]);

  const linhas = useMemo(() => montarLinhas(filtrados), [filtrados]);
  const totalPaginas = Math.max(1, Math.ceil(linhas.length / POR_PAGINA));
  const visiveis = linhas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const nomeRemetente = remetentes.find((r) => r.uid === filtros.remetente)?.nome;

  function alterar(campo, valor) {
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
    setPagina(1);
  }

  async function baixarPDF() {
    setExportando(true);
    try {
      await exportarPDF(filtrados, {
        filtros: { ...filtros, remetenteNome: nomeRemetente },
        nomeArquivo: `relatorio-tv-informativos-${hojeISO()}.pdf`,
      });
    } catch (e) {
      console.error(e);
      toast.erro('Não foi possível gerar o PDF.');
    } finally {
      setExportando(false);
    }
  }

  return (
    <>
      <div className="cabecalho-secao">
        <h1>Relatório de auditoria</h1>
        <div className="linha">
          <button
            type="button"
            className="btn btn--secundario"
            disabled={!filtrados.length}
            onClick={() =>
              exportarCSV(filtrados, `relatorio-tv-informativos-${hojeISO()}.csv`)
            }
          >
            <FileDown size={16} />
            CSV
          </button>
          <button
            type="button"
            className="btn btn--primario"
            disabled={!filtrados.length || exportando}
            onClick={baixarPDF}
          >
            <FileText size={16} />
            {exportando ? 'Gerando…' : 'PDF'}
          </button>
        </div>
      </div>

      <div className="bloco mb-6">
        <div className="linha linha--quebra" style={{ gap: 'var(--e-4)' }}>
          <Campo rotulo="Envio de">
            <input type="date" value={filtros.de} onChange={(e) => alterar('de', e.target.value)} />
          </Campo>
          <Campo rotulo="Envio até">
            <input type="date" value={filtros.ate} onChange={(e) => alterar('ate', e.target.value)} />
          </Campo>
          <Campo rotulo="Status">
            <select value={filtros.status} onChange={(e) => alterar('status', e.target.value)}>
              <option value="">Todos</option>
              {STATUS_VISIVEIS.map((s) => (
                <option key={s} value={s}>
                  {TEXTO_STATUS[s]}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Remetente">
            <select value={filtros.remetente} onChange={(e) => alterar('remetente', e.target.value)}>
              <option value="">Todos</option>
              {remetentes.map((r) => (
                <option key={r.uid} value={r.uid}>
                  {r.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Prioridade">
            <select value={filtros.prioridade} onChange={(e) => alterar('prioridade', e.target.value)}>
              <option value="">Todas</option>
              <option value="normal">Normal</option>
              <option value="urgente">Urgente</option>
            </select>
          </Campo>
          <Campo rotulo="Conformidade">
            <select
              value={filtros.conformidade}
              onChange={(e) => alterar('conformidade', e.target.value)}
            >
              <option value="">Todas</option>
              <option value="conforme">Conforme</option>
              <option value="fora">Fora do padrão</option>
            </select>
          </Campo>
        </div>
      </div>

      {todos === null ? (
        <ListaSkeleton itens={4} />
      ) : linhas.length === 0 ? (
        <EstadoVazio mensagem="Nenhum registro para esses filtros." />
      ) : (
        <>
          <p className="meta mb-4">
            {linhas.length} registro{linhas.length === 1 ? '' : 's'} · página {pagina} de{' '}
            {totalPaginas}
          </p>

          <div className="tabela-rolagem">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <span className="so-leitor">Detalhes</span>
                  </th>
                  {COLUNAS_PRINCIPAIS.map((chave) => (
                    <th key={chave}>{TITULO_COLUNA[chave]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visiveis.map((linha) => (
                  <Fragment key={linha.numero}>
                    <tr>
                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            setAberta(aberta === linha.numero ? null : linha.numero)
                          }
                          aria-expanded={aberta === linha.numero}
                          aria-label={`Detalhes de ${linha.titulo}`}
                          style={{ display: 'flex', padding: 4, color: 'var(--famp-gray)' }}
                        >
                          {aberta === linha.numero ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </button>
                      </td>
                      {COLUNAS_PRINCIPAIS.map((chave) => (
                        <td
                          key={chave}
                          style={{
                            whiteSpace: chave === 'titulo' ? 'normal' : 'nowrap',
                            minWidth: chave === 'titulo' ? 200 : undefined,
                            fontFamily:
                              chave === 'protocolo' ? 'var(--fonte-meta)' : undefined,
                          }}
                        >
                          {String(linha[chave] ?? '')}
                        </td>
                      ))}
                    </tr>

                    {aberta === linha.numero ? (
                      <tr>
                        <td colSpan={COLUNAS_PRINCIPAIS.length + 1} style={{ padding: 0 }}>
                          <Detalhe linha={linha} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 ? (
            <div className="linha mt-4" style={{ justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn--secundario"
                disabled={pagina === 1}
                onClick={() => setPagina((p) => p - 1)}
              >
                Anterior
              </button>
              <span className="meta">
                {pagina} / {totalPaginas}
              </span>
              <button
                type="button"
                className="btn btn--secundario"
                disabled={pagina === totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
              >
                Próxima
              </button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}

function Campo({ rotulo, children }) {
  return (
    <div>
      <span className="rotulo">{rotulo}</span>
      {children}
    </div>
  );
}

/**
 * Tudo que nao cabe na linha. Aparece so quando o auditor pede, e continua
 * saindo por completo no CSV e no PDF — onde o excesso nao atrapalha.
 */
function Detalhe({ linha }) {
  const escondidas = COLUNAS.filter(
    (c) => !COLUNAS_PRINCIPAIS.includes(c.chave) && String(linha[c.chave] ?? '') !== ''
  );

  return (
    <div className="detalhe-linha">
      <dl className="detalhe-linha__grade">
        {escondidas.map((c) => (
          <div key={c.chave}>
            <dt className="meta">{c.titulo}</dt>
            <dd>{String(linha[c.chave])}</dd>
          </div>
        ))}
      </dl>

      {linha.id ? (
        <Link to={`/informativos/${linha.id}`} className="btn btn--secundario mt-4">
          Abrir o informativo
        </Link>
      ) : null}
    </div>
  );
}

/** Puxa a base em paginas ate o fim, para os filtros rodarem em memoria. */
async function carregarTudo() {
  const acumulado = [];
  let cursor = null;

  for (let volta = 0; volta < 40; volta += 1) {
    const resultado = await listarInformativos({ pagina: 100, cursor });
    acumulado.push(...resultado.itens);
    if (resultado.fim || !resultado.ultimo) break;
    cursor = resultado.ultimo;
  }

  return acumulado;
}
