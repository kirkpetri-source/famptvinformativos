import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Download, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import MolduraTV from '../components/MolduraTV.jsx';
import PeriodoVeiculacao from '../components/ReguaTempo.jsx';
import Confirmacao from '../components/Confirmacao.jsx';
import { BadgeStatus, BadgeConformidade, BadgePrioridade, Protocolo } from '../components/Badges.jsx';
import Carregando from '../components/Carregando.jsx';
import { notificarDecisao } from '../services/api.js';
import {
  buscarPorId,
  aprovar,
  rejeitar,
  cancelar,
  confirmarRetirada,
} from '../services/informativos.js';
import { urlDoArquivo, baixarComNome } from '../services/storage.js';
import { nomePadronizado, linkWhatsapp } from '../utils/arquivos.js';
import { formatarDataHora, formatarData, timecode } from '../utils/datas.js';
import { STATUS, STATUS_ATIVOS, MOTIVO_REJEICAO, TEXTO_STATUS } from '../utils/status.js';
import { formatarBytes } from '../utils/midia.js';

export default function DetalheInformativo() {
  const { id } = useParams();
  const { isAdmin, acesso, user } = useAuth();
  const toast = useToast();
  const navegar = useNavigate();

  const [info, setInfo] = useState(null);
  const [url, setUrl] = useState(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [acao, setAcao] = useState(null);

  const carregar = useCallback(async () => {
    try {
      const documento = await buscarPorId(id);
      if (!documento) return setNaoEncontrado(true);
      setInfo(documento);

      if (documento.caminhoStorage && !documento.arquivoExpurgadoEm) {
        urlDoArquivo(documento.caminhoStorage).then(setUrl).catch(() => {});
      }
    } catch (e) {
      console.error(e);
      setNaoEncontrado(true);
    }
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (naoEncontrado) {
    return (
      <div className="vazio">
        <p>Informativo não encontrado, ou você não tem acesso a ele.</p>
        <Link to={isAdmin ? '/informativos' : '/meus-envios'} className="btn btn--primario">
          Voltar
        </Link>
      </div>
    );
  }

  if (!info) return <Carregando />;

  const meu = info.enviadoPor?.uid === user?.uid;

  async function executar(tipo, dados) {
    try {
      if (tipo === 'aprovar') {
        await aprovar(info.id, acesso.email);
        notificarDecisao(info.id, 'aprovado').catch(console.error);
        toast.sucesso('Informativo aprovado.');
      } else if (tipo === 'rejeitar') {
        await rejeitar(info.id, acesso.email, dados);
        notificarDecisao(info.id, 'rejeitado').catch(console.error);
        toast.sucesso('Informativo recusado. O remetente foi avisado.');
      } else if (tipo === 'cancelar') {
        await cancelar(info.id, acesso.email, dados.observacao);
        notificarDecisao(info.id, 'cancelado').catch(console.error);
        toast.sucesso('Informativo cancelado.');
      } else if (tipo === 'retirada') {
        await confirmarRetirada(info.id);
        toast.sucesso('Retirada confirmada.');
      }
      setAcao(null);
      carregar();
    } catch (e) {
      console.error(e);
      toast.erro('Não foi possível concluir a ação.');
    }
  }

  return (
    <>
      <button type="button" className="btn btn--texto mb-6" onClick={() => navegar(-1)}>
        <ArrowLeft size={14} /> Voltar
      </button>

      <div className="linha linha--quebra mb-2" style={{ gap: 'var(--e-2)' }}>
        <Protocolo valor={info.protocolo} />
        <BadgeStatus status={info.status} />
        <BadgePrioridade prioridade={info.prioridade} />
        <BadgeConformidade conformidade={info.conformidade} />
      </div>

      <h1 className="mb-6">{info.titulo}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 'var(--e-8)' }} className="detalhe-grade">
        <div>
          {info.arquivoExpurgadoEm ? (
            <div className="aviso aviso--alerta">
              <span>
                O arquivo foi apagado em {formatarDataHora(info.arquivoExpurgadoEm)}, conforme
                a política de retenção. O registro do envio permanece.
              </span>
            </div>
          ) : (
            <MolduraTV
              url={url}
              tipo={info.tipoArquivo}
              analise={{
                largura: info.largura,
                altura: info.altura,
                duracaoSegundos: info.duracaoSegundos,
                conformidade: info.conformidade,
              }}
              nomeArquivo={info.nomeArquivo}
              tamanhoBytes={info.tamanhoBytes}
            />
          )}

          <section className="mt-8">
            <h2 style={{ fontSize: 'var(--tipo-16)' }}>Conteúdo</h2>
            <p className="mt-2" style={{ whiteSpace: 'pre-wrap' }}>
              {info.conteudo}
            </p>
          </section>

          {info.justificativaUrgencia ? (
            <section className="mt-6">
              <h2 style={{ fontSize: 'var(--tipo-16)' }}>Justificativa da urgência</h2>
              <p className="mt-2">{info.justificativaUrgencia}</p>
            </section>
          ) : null}

          {info.status === STATUS.REJEITADO ? (
            <div className="aviso aviso--erro mt-6">
              <div>
                <strong>{MOTIVO_REJEICAO[info.motivoRejeicao] || 'Recusado'}</strong>
                <p className="mt-2">{info.observacaoAdmin}</p>
                {meu ? (
                  <Link to={`/enviar?reenvioDe=${info.id}`} className="btn btn--primario mt-4" style={{ minHeight: 32 }}>
                    Reenviar corrigido
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}

          {info.status === STATUS.CANCELADO && info.observacaoAdmin ? (
            <div className="aviso aviso--alerta mt-6">
              <span>{info.observacaoAdmin}</span>
            </div>
          ) : null}
        </div>

        <aside className="coluna" style={{ gap: 'var(--e-6)' }}>
          <section className="bloco">
            <h2 style={{ fontSize: 'var(--tipo-16)' }} className="mb-4">
              Veiculação
            </h2>
            <PeriodoVeiculacao inicio={info.dataInicio} fim={info.dataFim} />
            <dl className="mt-4">
              <Dado rotulo="Início" valor={formatarData(info.dataInicio)} />
              <Dado rotulo="Término" valor={formatarData(info.dataFim)} />
              <Dado
                rotulo="Exibição"
                valor={info.duracaoExibicaoSegundos ? `${info.duracaoExibicaoSegundos} s` : '—'}
              />
              <Dado rotulo="Programado" valor={formatarDataHora(info.programadoEm)} />
              <Dado rotulo="Referência" valor={info.referenciaExterna || '—'} />
              <Dado rotulo="Retirado" valor={formatarDataHora(info.retiradoEm)} />
            </dl>
          </section>

          <section className="bloco">
            <h2 style={{ fontSize: 'var(--tipo-16)' }} className="mb-4">
              Remetente
            </h2>
            <dl>
              <Dado rotulo="Nome" valor={info.enviadoPor?.nome} />
              <Dado rotulo="Cargo" valor={info.enviadoPor?.cargo} />
              <Dado
                rotulo="E-mail"
                valor={
                  <a href={`mailto:${info.enviadoPor?.email}`} className="btn--texto">
                    {info.enviadoPor?.email}
                  </a>
                }
              />
              {info.enviadoPor?.whatsapp ? (
                <Dado
                  rotulo="WhatsApp"
                  valor={
                    <a
                      href={linkWhatsapp(info.enviadoPor.whatsapp)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn--texto"
                    >
                      {info.enviadoPor.whatsapp}
                    </a>
                  }
                />
              ) : null}
              <Dado rotulo="Enviado" valor={formatarDataHora(info.enviadoEm)} />
            </dl>
          </section>

          <section className="bloco">
            <h2 style={{ fontSize: 'var(--tipo-16)' }} className="mb-4">
              Arquivo
            </h2>
            <dl>
              <Dado rotulo="Nome" valor={info.nomeArquivo} />
              <Dado rotulo="Tipo" valor={info.tipoArquivo} />
              <Dado
                rotulo="Dimensões"
                valor={info.largura ? `${info.largura} × ${info.altura}` : '—'}
              />
              <Dado
                rotulo="Duração"
                valor={info.duracaoSegundos ? timecode(info.duracaoSegundos) : '—'}
              />
              <Dado rotulo="Tamanho" valor={formatarBytes(info.tamanhoBytes)} />
            </dl>

            {!info.arquivoExpurgadoEm ? (
              <button
                type="button"
                className="btn btn--secundario btn--bloco mt-4"
                onClick={async () => {
                  try {
                    await baixarComNome(info.caminhoStorage, nomePadronizado(info));
                  } catch (e) {
                    toast.erro(e.message);
                  }
                }}
              >
                <Download size={16} />
                Baixar
              </button>
            ) : null}
          </section>

          {isAdmin ? (
            <section className="bloco">
              <h2 style={{ fontSize: 'var(--tipo-16)' }} className="mb-4">
                Ações
              </h2>
              <div className="coluna">
                {info.status === STATUS.PENDENTE ? (
                  <>
                    <button type="button" className="btn btn--primario" onClick={() => executar('aprovar')}>
                      Aprovar
                    </button>
                    <button type="button" className="btn btn--secundario" onClick={() => setAcao('rejeitar')}>
                      Recusar
                    </button>
                  </>
                ) : null}

                {info.status === STATUS.APROVADO ? (
                  <Link to="/programacao" className="btn btn--primario">
                    Programar
                  </Link>
                ) : null}

                {info.dataFim < new Date().toISOString().slice(0, 10) &&
                !info.retiradoEm &&
                [STATUS.NO_AR, STATUS.EXPIRADO].includes(info.status) ? (
                  <button type="button" className="btn btn--secundario" onClick={() => executar('retirada')}>
                    Confirmar retirada do CMS
                  </button>
                ) : null}

                {STATUS_ATIVOS.includes(info.status) ? (
                  <button type="button" className="btn btn--perigo" onClick={() => setAcao('cancelar')}>
                    Tirar do ar agora
                  </button>
                ) : null}

                {info.decididoPor ? (
                  <p className="meta meta--nao-caixa mt-2">
                    {TEXTO_STATUS[info.status]} por {info.decididoPor} em{' '}
                    {formatarDataHora(info.decididoEm)}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      {acao === 'rejeitar' ? (
        <Confirmacao
          titulo="Recusar informativo"
          nomeDoItem={info.titulo}
          descricao="O remetente recebe um e-mail com o motivo e pode reenviar corrigido."
          rotuloConfirmar="Recusar e avisar"
          perigoso
          exigeMotivo
          opcoesMotivo={MOTIVO_REJEICAO}
          aoConfirmar={(dados) => executar('rejeitar', dados)}
          aoCancelar={() => setAcao(null)}
        />
      ) : null}

      {acao === 'cancelar' ? (
        <Confirmacao
          titulo="Tirar do ar agora"
          nomeDoItem={info.titulo}
          descricao="Isto não remove a mídia do CMS das TVs — faça isso lá também. O remetente é avisado."
          rotuloConfirmar="Tirar do ar"
          perigoso
          exigeMotivo
          aoConfirmar={(dados) => executar('cancelar', dados)}
          aoCancelar={() => setAcao(null)}
        />
      ) : null}

      <style>{`
        @media (max-width: 960px) {
          .detalhe-grade { grid-template-columns: minmax(0, 1fr) !important; }
        }
      `}</style>
    </>
  );
}

function Dado({ rotulo, valor }) {
  return (
    <div className="linha linha--topo" style={{ padding: '5px 0' }}>
      <dt className="meta" style={{ minWidth: 96, flexShrink: 0 }}>
        {rotulo}
      </dt>
      <dd className="crescer" style={{ fontSize: 'var(--tipo-14)', wordBreak: 'break-word' }}>
        {valor || '—'}
      </dd>
    </div>
  );
}
