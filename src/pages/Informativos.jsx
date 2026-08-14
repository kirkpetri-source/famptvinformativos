import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useToast } from '../hooks/useToast.jsx';
import PeriodoVeiculacao from '../components/ReguaTempo.jsx';
import { BadgeStatus, BadgeConformidade, BadgePrioridade, Protocolo } from '../components/Badges.jsx';
import EstadoVazio from '../components/EstadoVazio.jsx';
import { ListaSkeleton } from '../components/Carregando.jsx';
import { listarInformativos, buscarPorTitulo } from '../services/informativos.js';
import { formatarDataHora } from '../utils/datas.js';
import { STATUS_VISIVEIS, TEXTO_STATUS, PRIORIDADE } from '../utils/status.js';

export default function Informativos() {
  const toast = useToast();
  const [itens, setItens] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [fim, setFim] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [filtros, setFiltros] = useState({ status: '', prioridade: '' });
  const [termo, setTermo] = useState('');
  const [buscando, setBuscando] = useState(false);

  const carregar = useCallback(
    async (proximaPagina = false) => {
      try {
        const resultado = await listarInformativos({
          status: filtros.status || null,
          prioridade: filtros.prioridade || null,
          cursor: proximaPagina ? cursor : null,
        });
        setItens((atual) => (proximaPagina ? [...(atual || []), ...resultado.itens] : resultado.itens));
        setCursor(resultado.ultimo);
        setFim(resultado.fim);
      } catch (e) {
        console.error(e);
        toast.erro('Não foi possível carregar a lista.');
        setItens([]);
      }
    },
    [filtros, cursor, toast]
  );

  useEffect(() => {
    setItens(null);
    setCursor(null);
    carregar(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.status, filtros.prioridade]);

  /**
   * A busca limpa os filtros de propósito: combinar as duas coisas exigiria
   * um índice composto para cada combinação possível.
   */
  async function buscar(evento) {
    evento.preventDefault();
    if (termo.trim().length < 3) return;
    setBuscando(true);
    setFiltros({ status: '', prioridade: '' });
    try {
      setItens(await buscarPorTitulo(termo));
      setFim(true);
    } catch (e) {
      console.error(e);
      toast.erro('Falha na busca.');
    } finally {
      setBuscando(false);
    }
  }

  function limparBusca() {
    setTermo('');
    setBuscando(false);
    setItens(null);
    setCursor(null);
    carregar(false);
  }

  return (
    <>
      <div className="cabecalho-secao">
        <h1>Informativos</h1>
        <Link to="/relatorio" className="btn btn--secundario">
          Relatório de auditoria
        </Link>
      </div>

      <div className="linha linha--quebra mb-6">
        <form onSubmit={buscar} className="linha crescer" style={{ maxWidth: 360 }}>
          <input
            type="search"
            value={termo}
            placeholder="Buscar por título"
            onChange={(e) => setTermo(e.target.value)}
            aria-label="Buscar por título"
          />
          <button type="submit" className="btn btn--secundario" disabled={termo.trim().length < 3}>
            <Search size={16} />
          </button>
        </form>

        <select
          value={filtros.status}
          onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
          aria-label="Filtrar por status"
          style={{ width: 'auto' }}
          disabled={Boolean(termo && buscando)}
        >
          <option value="">Todos os status</option>
          {STATUS_VISIVEIS.map((s) => (
            <option key={s} value={s}>
              {TEXTO_STATUS[s]}
            </option>
          ))}
        </select>

        <select
          value={filtros.prioridade}
          onChange={(e) => setFiltros({ ...filtros, prioridade: e.target.value })}
          aria-label="Filtrar por prioridade"
          style={{ width: 'auto' }}
        >
          <option value="">Todas as prioridades</option>
          <option value={PRIORIDADE.NORMAL}>Normal</option>
          <option value={PRIORIDADE.URGENTE}>Urgente</option>
        </select>

        {termo ? (
          <button type="button" className="btn btn--texto" onClick={limparBusca}>
            Limpar busca
          </button>
        ) : null}
      </div>

      {termo && itens ? (
        <p className="secundario mb-4">
          Resultados para "{termo}". A busca encontra o começo do título, não trechos no
          meio.
        </p>
      ) : null}

      {itens === null ? (
        <ListaSkeleton itens={5} />
      ) : itens.length === 0 ? (
        <EstadoVazio mensagem="Nenhum informativo encontrado com esses filtros." />
      ) : (
        <>
          <div className="lista-regua">
            {itens.map((item) => (
              <article key={item.id} className="item">
                <div className="item__corpo">
                  <div className="linha linha--quebra" style={{ gap: 'var(--e-2)' }}>
                    <Protocolo valor={item.protocolo} />
                    <BadgeStatus status={item.status} />
                    <BadgePrioridade prioridade={item.prioridade} />
                    <BadgeConformidade conformidade={item.conformidade} />
                  </div>

                  <h2 className="item__titulo">
                    <Link to={`/informativos/${item.id}`}>{item.titulo}</Link>
                  </h2>

                  <div className="linha linha--quebra">
                    <PeriodoVeiculacao inicio={item.dataInicio} fim={item.dataFim} />
                    <span className="meta meta--nao-caixa">
                      {item.enviadoPor?.nome} · {item.enviadoPor?.cargo}
                    </span>
                    <span className="meta">{formatarDataHora(item.enviadoEm)}</span>
                  </div>
                </div>

                <div className="item__acoes">
                  <Link to={`/informativos/${item.id}`} className="btn btn--secundario">
                    Abrir
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {!fim ? (
            <div className="mt-6" style={{ textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn--secundario"
                disabled={carregandoMais}
                onClick={async () => {
                  setCarregandoMais(true);
                  await carregar(true);
                  setCarregandoMais(false);
                }}
              >
                {carregandoMais ? 'Carregando…' : 'Carregar mais'}
              </button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
