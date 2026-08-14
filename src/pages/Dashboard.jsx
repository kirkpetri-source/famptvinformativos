import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import GradeExibicao from '../components/GradeExibicao.jsx';
import AgendaDoDia from '../components/AgendaDoDia.jsx';
import PeriodoVeiculacao from '../components/ReguaTempo.jsx';
import { BadgeConformidade, BadgePrioridade, Protocolo } from '../components/Badges.jsx';
import EstadoVazio from '../components/EstadoVazio.jsx';
import { ListaSkeleton } from '../components/Carregando.jsx';
import Confirmacao from '../components/Confirmacao.jsx';
import { naJanela, porStatus, aprovar, rejeitar } from '../services/informativos.js';
import { urlDoArquivo } from '../services/storage.js';
import { notificarDecisao } from '../services/api.js';
import { hojeISO, somarDiasISO, formatarDataHora } from '../utils/datas.js';
import { STATUS, MOTIVO_REJEICAO } from '../utils/status.js';

export default function Dashboard() {
  const { acesso } = useAuth();
  const toast = useToast();
  const navegar = useNavigate();

  const [grade, setGrade] = useState(null);
  const [pendentes, setPendentes] = useState(null);
  const [rejeitando, setRejeitando] = useState(null);

  const hoje = hojeISO();

  const carregar = useCallback(async () => {
    try {
      const [naGrade, fila] = await Promise.all([
        naJanela(somarDiasISO(hoje, -7), somarDiasISO(hoje, 14)),
        porStatus(STATUS.PENDENTE),
      ]);
      setGrade(naGrade);
      setPendentes(ordenarFila(fila));
    } catch (e) {
      console.error(e);
      toast.erro('Não foi possível carregar o painel.');
      setGrade([]);
      setPendentes([]);
    }
  }, [hoje, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const noAr = (grade || []).filter((i) => i.status === STATUS.NO_AR);
  const expirandoEm7 = noAr.filter((i) => i.dataFim <= somarDiasISO(hoje, 7)).length;
  const naoProgramados = (grade || []).filter(
    (i) => i.status === STATUS.APROVADO && i.dataInicio < hoje
  );

  async function decidir(item, decisao, dados) {
    try {
      if (decisao === 'aprovado') await aprovar(item.id, acesso.email);
      else await rejeitar(item.id, acesso.email, dados);

      notificarDecisao(item.id, decisao).catch((e) =>
        console.error('Notificação de decisão falhou:', e)
      );

      toast.sucesso(
        decisao === 'aprovado'
          ? `${item.protocolo} aprovado.`
          : `${item.protocolo} recusado. O remetente foi avisado.`
      );
      setRejeitando(null);
      carregar();
    } catch (e) {
      console.error(e);
      toast.erro('Não foi possível salvar a decisão.');
    }
  }

  return (
    <>
      <div className="cabecalho-secao">
        <h1>Grade de exibição</h1>
        <Link to="/programacao" className="btn btn--primario">
          Ir para a programação
        </Link>
      </div>

      {grade === null ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : (
        <GradeExibicao
          informativos={grade}
          aoClicar={(item) => navegar(`/informativos/${item.id}`)}
        />
      )}

      <div className="mt-8">
        <AgendaDoDia
          itens={[
            { rotulo: 'aguardando análise', valor: pendentes?.length ?? 0 },
            { rotulo: 'no ar', valor: noAr.length },
            { rotulo: 'expiram em 7 dias', valor: expirandoEm7 },
            ...(naoProgramados.length
              ? [{ rotulo: 'atrasados', valor: naoProgramados.length, alerta: true }]
              : []),
          ]}
        />
      </div>

      {naoProgramados.length ? (
        <div className="aviso aviso--alerta">
          <span>
            {naoProgramados.length}{' '}
            {naoProgramados.length === 1 ? 'informativo aprovado passou' : 'informativos aprovados passaram'}{' '}
            da data de início sem serem marcados como programados.{' '}
            <Link to="/programacao" className="btn--texto">
              Abrir a fila
            </Link>
          </span>
        </div>
      ) : null}

      <section className="mt-8">
        <div className="cabecalho-secao">
          <h2>Aguardando análise</h2>
        </div>

        {pendentes === null ? (
          <ListaSkeleton />
        ) : pendentes.length === 0 ? (
          <EstadoVazio mensagem="Nenhum informativo aguardando análise." />
        ) : (
          <div className="lista-regua">
            {pendentes.map((item) => (
              <ItemPendente
                key={item.id}
                item={item}
                aoAprovar={() => decidir(item, 'aprovado')}
                aoRejeitar={() => setRejeitando(item)}
              />
            ))}
          </div>
        )}
      </section>

      {rejeitando ? (
        <Confirmacao
          titulo="Recusar informativo"
          nomeDoItem={rejeitando.titulo}
          descricao="O remetente recebe um e-mail com o motivo e pode reenviar corrigido."
          rotuloConfirmar="Recusar e avisar"
          perigoso
          exigeMotivo
          opcoesMotivo={MOTIVO_REJEICAO}
          aoConfirmar={(dados) => decidir(rejeitando, 'rejeitado', dados)}
          aoCancelar={() => setRejeitando(null)}
        />
      ) : null}
    </>
  );
}

function ItemPendente({ item, aoAprovar, aoRejeitar }) {
  const [thumb, setThumb] = useState(null);

  useEffect(() => {
    if (!item.tipoArquivo?.startsWith('image/')) return;
    let vivo = true;
    urlDoArquivo(item.caminhoStorage)
      .then((u) => vivo && setThumb(u))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [item.caminhoStorage, item.tipoArquivo]);

  return (
    <article className="item">
      <div className="item__miniatura">{thumb ? <img src={thumb} alt="" /> : null}</div>

      <div className="item__corpo">
        <div className="linha linha--quebra" style={{ gap: 'var(--e-2)' }}>
          <Protocolo valor={item.protocolo} />
          <BadgePrioridade prioridade={item.prioridade} />
          <BadgeConformidade conformidade={item.conformidade} />
        </div>

        <h3 className="item__titulo">
          <Link to={`/informativos/${item.id}`}>{item.titulo}</Link>
        </h3>

        <div className="linha linha--quebra">
          <PeriodoVeiculacao inicio={item.dataInicio} fim={item.dataFim} />
          <span className="meta meta--nao-caixa">
            {item.enviadoPor?.nome} · {item.enviadoPor?.cargo}
          </span>
          <span className="meta">{formatarDataHora(item.enviadoEm)}</span>
        </div>
      </div>

      <div className="item__acoes">
        <button type="button" className="btn btn--secundario" onClick={aoRejeitar}>
          Recusar
        </button>
        <button type="button" className="btn btn--primario" onClick={aoAprovar}>
          Aprovar
        </button>
      </div>
    </article>
  );
}

/** Urgente primeiro; dentro de cada grupo, o mais antigo primeiro. */
function ordenarFila(itens) {
  return [...itens].sort((a, b) => {
    if (a.prioridade !== b.prioridade) return a.prioridade === 'urgente' ? -1 : 1;
    const ta = a.enviadoEm?.seconds || 0;
    const tb = b.enviadoEm?.seconds || 0;
    return ta - tb;
  });
}

