import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { listarMeusEnvios } from '../services/informativos.js';
import { urlDoArquivo } from '../services/storage.js';
import { BadgeStatus, BadgeConformidade, BadgePrioridade, Protocolo } from '../components/Badges.jsx';
import PeriodoVeiculacao from '../components/ReguaTempo.jsx';
import EstadoVazio from '../components/EstadoVazio.jsx';
import { ListaSkeleton } from '../components/Carregando.jsx';
import { formatarDataHora } from '../utils/datas.js';
import { STATUS, MOTIVO_REJEICAO } from '../utils/status.js';

export default function MeusEnvios() {
  const { user } = useAuth();
  const [itens, setItens] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!user) return;
    listarMeusEnvios(user.uid)
      .then(setItens)
      .catch((e) => {
        console.error(e);
        setErro('Não foi possível carregar seus envios.');
        setItens([]);
      });
  }, [user]);

  return (
    <>
      <div className="cabecalho-secao">
        <h1>Meus envios</h1>
        <Link to="/enviar" className="btn btn--primario">
          Enviar informativo
        </Link>
      </div>

      {erro ? (
        <div className="aviso aviso--erro" role="alert">
          <span>{erro}</span>
        </div>
      ) : null}

      {itens === null ? (
        <ListaSkeleton />
      ) : itens.length === 0 ? (
        <EstadoVazio
          mensagem="Você ainda não enviou nenhum informativo."
          acao="Enviar o primeiro"
          para="/enviar"
        />
      ) : (
        <div className="lista-regua">
          {itens.map((item) => (
            <ItemEnvio key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}

function ItemEnvio({ item }) {
  const [thumb, setThumb] = useState(null);

  useEffect(() => {
    if (!item.caminhoStorage || !item.tipoArquivo?.startsWith('image/')) return;
    if (item.arquivoExpurgadoEm) return;
    let vivo = true;
    urlDoArquivo(item.caminhoStorage)
      .then((u) => vivo && setThumb(u))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [item.caminhoStorage, item.tipoArquivo, item.arquivoExpurgadoEm]);

  return (
    <article className="item">
      <div className="item__miniatura">
        {thumb ? <img src={thumb} alt="" /> : null}
      </div>

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
          <span className="meta">enviado {formatarDataHora(item.enviadoEm)}</span>
        </div>

        {item.status === STATUS.REJEITADO ? (
          <div className="aviso aviso--erro mt-4">
            <div>
              <strong>
                {MOTIVO_REJEICAO[item.motivoRejeicao] || 'Informativo recusado'}
              </strong>
              {item.observacaoAdmin ? <p className="mt-2">{item.observacaoAdmin}</p> : null}
              <Link
                to={`/enviar?reenvioDe=${item.id}`}
                className="btn btn--primario mt-4"
                style={{ minHeight: 32 }}
              >
                Reenviar corrigido
              </Link>
            </div>
          </div>
        ) : null}

        {item.status === STATUS.CANCELADO && item.observacaoAdmin ? (
          <div className="aviso aviso--alerta mt-4">
            <span>{item.observacaoAdmin}</span>
          </div>
        ) : null}
      </div>
    </article>
  );
}
