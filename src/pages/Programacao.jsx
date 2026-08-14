import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Download, ChevronRight, X, PackageCheck } from 'lucide-react';
import { useToast } from '../hooks/useToast.jsx';
import AgendaDoDia from '../components/AgendaDoDia.jsx';
import DadosParaCMS, { BotaoCopiar } from '../components/DadosParaCMS.jsx';
import MolduraTV from '../components/MolduraTV.jsx';
import PeriodoVeiculacao from '../components/ReguaTempo.jsx';
import { BadgeConformidade, BadgePrioridade, Protocolo } from '../components/Badges.jsx';
import EstadoVazio from '../components/EstadoVazio.jsx';
import { ListaSkeleton } from '../components/Carregando.jsx';
import {
  filaDeProgramacao,
  filaDeRetirada,
  porStatus,
  marcarProgramado,
  voltarParaPendente,
  confirmarRetirada,
} from '../services/informativos.js';
import { urlDoArquivo, baixarComNome } from '../services/storage.js';
import { carregarSistema, PADRAO_SISTEMA } from '../services/configuracoes.js';
import { nomePadronizado, nomeDaMidia } from '../utils/arquivos.js';
import { hojeISO, formatarData } from '../utils/datas.js';
import { STATUS } from '../utils/status.js';

/**
 * A tela onde o administrador trabalha. Primeiro item do menu, acima do painel.
 *
 * O e-mail avisa; esta tela entrega. Sem ela, o sistema resolveria a entrada e
 * abandonaria o operador na parte mais chata: baixar, renomear, transcrever
 * datas e lembrar de tirar do ar.
 */
export default function Programacao() {
  const toast = useToast();
  const [config, setConfig] = useState(PADRAO_SISTEMA);
  const [fila, setFila] = useState(null);
  const [retirada, setRetirada] = useState([]);
  const [noAr, setNoAr] = useState([]);
  const [foco, setFoco] = useState(null);
  const [selecionados, setSelecionados] = useState(new Set());

  const hoje = hojeISO();

  const carregar = useCallback(async () => {
    try {
      const [entrada, saida, ativos, cfg] = await Promise.all([
        filaDeProgramacao(),
        filaDeRetirada(),
        porStatus(STATUS.NO_AR, { ordenarPor: 'dataFim', direcao: 'asc' }),
        carregarSistema(),
      ]);
      setFila(entrada);
      setRetirada(saida);
      setNoAr(ativos);
      setConfig(cfg);
    } catch (e) {
      console.error(e);
      toast.erro('Não foi possível carregar a fila.');
      setFila([]);
    }
  }, [toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const atrasados = (fila || []).filter((i) => i.dataInicio < hoje);
  const entramHoje = noAr.filter((i) => i.dataInicio === hoje).length;
  const saemHoje = noAr.filter((i) => i.dataFim === hoje).length;

  if (foco) {
    const indice = fila.findIndex((i) => i.id === foco.id);
    return (
      <ModoFoco
        informativo={foco}
        posicao={indice + 1}
        total={fila.length}
        duracaoPadrao={config.duracaoExibicaoPadraoSegundos}
        aoFechar={() => setFoco(null)}
        aoConcluir={async () => {
          const proximo = fila[indice + 1] || null;
          await carregar();
          setFoco(proximo);
        }}
      />
    );
  }

  return (
    <>
      <div className="cabecalho-secao">
        <h1>Programação</h1>
        <Link to="/painel" className="btn btn--secundario">
          Ver a grade completa
        </Link>
      </div>

      <AgendaDoDia
        itens={[
          { rotulo: 'entram', valor: entramHoje },
          { rotulo: 'saem', valor: saemHoje },
          {
            rotulo: 'aguardando programação',
            valor: fila?.length ?? 0,
            alerta: atrasados.length > 0,
          },
          { rotulo: 'no ar', valor: noAr.length, alerta: noAr.length > config.limiteSimultaneos },
          ...(retirada.length
            ? [{ rotulo: 'a retirar', valor: retirada.length, alerta: true }]
            : []),
        ]}
      />

      {noAr.length > config.limiteSimultaneos ? (
        <div className="aviso aviso--alerta">
          <span>
            {noAr.length} informativos no ar ao mesmo tempo. Acima de{' '}
            {config.limiteSimultaneos} o rodízio fica longo e cada arte aparece menos
            vezes.
          </span>
        </div>
      ) : null}

      <section className="mb-8">
        <div className="cabecalho-secao">
          <h2>Fila de entrada</h2>
          {selecionados.size > 0 ? (
            <AcoesEmLote
              selecionados={[...selecionados].map((id) => fila.find((i) => i.id === id))}
              config={config}
              aoTerminar={() => {
                setSelecionados(new Set());
                carregar();
              }}
            />
          ) : null}
        </div>

        {fila === null ? (
          <ListaSkeleton />
        ) : fila.length === 0 ? (
          <EstadoVazio mensagem="Nada aprovado esperando programação." />
        ) : (
          <div className="lista-regua">
            {fila.map((item) => (
              <ItemFila
                key={item.id}
                item={item}
                atrasado={item.dataInicio < hoje}
                marcado={selecionados.has(item.id)}
                aoMarcar={(marcado) => {
                  const novo = new Set(selecionados);
                  if (marcado) novo.add(item.id);
                  else novo.delete(item.id);
                  setSelecionados(novo);
                }}
                aoProgramar={() => setFoco(item)}
              />
            ))}
          </div>
        )}
      </section>

      <FilaDeRetirada
        itens={retirada}
        aoConfirmar={async (id) => {
          await confirmarRetirada(id);
          toast.sucesso('Retirada confirmada.');
          carregar();
        }}
      />
    </>
  );
}

function ItemFila({ item, atrasado, marcado, aoMarcar, aoProgramar }) {
  return (
    <article className="item">
      <input
        type="checkbox"
        checked={marcado}
        onChange={(e) => aoMarcar(e.target.checked)}
        aria-label={`Selecionar ${item.titulo}`}
        style={{ width: 18, height: 18, minHeight: 0, marginTop: 4, accentColor: 'var(--famp-orange-dark)' }}
      />

      <div className="item__corpo">
        <div className="linha linha--quebra" style={{ gap: 'var(--e-2)' }}>
          <Protocolo valor={item.protocolo} />
          {atrasado ? <span className="badge badge--rejeitado">Atrasado</span> : null}
          <BadgePrioridade prioridade={item.prioridade} />
          <BadgeConformidade conformidade={item.conformidade} />
        </div>

        <h3 className="item__titulo">{item.titulo}</h3>

        <div className="linha linha--quebra">
          <PeriodoVeiculacao inicio={item.dataInicio} fim={item.dataFim} />
          <span className="meta meta--nao-caixa">
            {item.enviadoPor?.nome} · {item.enviadoPor?.cargo}
          </span>
        </div>
      </div>

      <div className="item__acoes">
        <button type="button" className="btn btn--primario" onClick={aoProgramar}>
          Programar
          <ChevronRight size={16} />
        </button>
      </div>
    </article>
  );
}

/**
 * Modo foco — um item por vez, com atalhos de teclado.
 * E trabalho repetitivo: tirar a mao do teclado a cada item custa caro.
 */
function ModoFoco({ informativo, posicao, total, duracaoPadrao, aoFechar, aoConcluir }) {
  const toast = useToast();
  const [url, setUrl] = useState(null);
  const [referencia, setReferencia] = useState(informativo.referenciaExterna || '');
  const [duracao, setDuracao] = useState(
    informativo.duracaoSegundos
      ? Math.ceil(informativo.duracaoSegundos)
      : informativo.duracaoExibicaoSegundos || duracaoPadrao
  );
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;
    urlDoArquivo(informativo.caminhoStorage)
      .then((u) => vivo && setUrl(u))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [informativo.caminhoStorage]);

  const baixar = useCallback(async () => {
    try {
      await baixarComNome(informativo.caminhoStorage, nomePadronizado(informativo));
    } catch (e) {
      toast.erro(e.message);
    }
  }, [informativo, toast]);

  const programar = useCallback(async () => {
    setSalvando(true);
    try {
      await marcarProgramado(informativo.id, {
        referenciaExterna: referencia,
        duracaoExibicaoSegundos: Number(duracao) || duracaoPadrao,
      });
      toast.sucesso(`${informativo.protocolo} marcado como programado.`);
      await aoConcluir();
    } catch (e) {
      console.error(e);
      toast.erro('Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }, [informativo, referencia, duracao, duracaoPadrao, toast, aoConcluir]);

  // Atalhos: D baixa, P programa, Esc sai.
  useEffect(() => {
    function aoTeclar(evento) {
      if (evento.target.matches('input, textarea, select')) return;
      const tecla = evento.key.toLowerCase();
      if (tecla === 'd') { evento.preventDefault(); baixar(); }
      if (tecla === 'p') { evento.preventDefault(); programar(); }
      if (evento.key === 'Escape') aoFechar();
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [baixar, programar, aoFechar]);

  return (
    <>
      <div className="cabecalho-secao">
        <div>
          <span className="meta">
            {posicao} de {total}
          </span>
          <h1 style={{ fontSize: 'var(--tipo-26)' }}>{informativo.titulo}</h1>
        </div>
        <button type="button" className="btn btn--secundario" onClick={aoFechar}>
          <X size={16} />
          Sair do modo foco
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 'var(--e-8)' }} className="foco-grade">
        <div>
          <MolduraTV
            url={url}
            tipo={informativo.tipoArquivo}
            analise={{
              largura: informativo.largura,
              altura: informativo.altura,
              duracaoSegundos: informativo.duracaoSegundos,
              conformidade: informativo.conformidade,
            }}
            nomeArquivo={informativo.nomeArquivo}
            tamanhoBytes={informativo.tamanhoBytes}
          />

          <div className="linha mt-6">
            <button type="button" className="btn btn--primario" onClick={baixar}>
              <Download size={16} />
              Baixar arquivo
            </button>
            <span className="meta meta--nao-caixa">{nomePadronizado(informativo)}</span>
          </div>
        </div>

        <div className="coluna" style={{ gap: 'var(--e-6)' }}>
          <DadosParaCMS informativo={informativo} duracaoExibicao={duracao} />

          <section className="bloco">
            <div className="campo">
              <label className="rotulo" htmlFor="duracao">
                Duração de exibição
              </label>
              <input
                id="duracao"
                type="number"
                min={3}
                max={120}
                value={duracao}
                onChange={(e) => setDuracao(e.target.value)}
              />
              <div className="campo__ajuda">
                <span>
                  {informativo.tipoArquivo === 'video/mp4'
                    ? 'Preenchido com a duração real do vídeo.'
                    : 'Quanto tempo a arte fica na tela a cada rodada.'}
                </span>
              </div>
            </div>

            <div className="campo" style={{ marginBottom: 0 }}>
              <label className="rotulo" htmlFor="referencia">
                Referência no CMS
              </label>
              <input
                id="referencia"
                type="text"
                value={referencia}
                placeholder="ID ou nome do layout"
                onChange={(e) => setReferencia(e.target.value)}
              />
              <div className="campo__ajuda">
                <span>Opcional. Ajuda a reencontrar a mídia depois.</span>
              </div>
            </div>
          </section>

          <div className="coluna">
            <button
              type="button"
              className="btn btn--primario btn--grande"
              onClick={programar}
              disabled={salvando}
            >
              {salvando ? 'Salvando…' : 'Marcar como programado'}
            </button>

            <button
              type="button"
              className="btn btn--secundario"
              onClick={async () => {
                await voltarParaPendente(informativo.id);
                toast.sucesso('Voltou para a fila de análise.');
                await aoConcluir();
              }}
            >
              Voltar para análise
            </button>
          </div>

          <p className="meta meta--nao-caixa">
            Atalhos: D baixar · P programar · Esc sair
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .foco-grade { grid-template-columns: minmax(0, 1fr) !important; }
        }
      `}</style>
    </>
  );
}

/**
 * A metade esquecida do trabalho, e a que entope o loop das TVs.
 * O sistema nao consegue remover nada do CMS — mas consegue nao deixar esquecer.
 */
function FilaDeRetirada({ itens, aoConfirmar }) {
  if (!itens.length) return null;

  return (
    <section>
      <div className="cabecalho-secao">
        <h2>Retirar do CMS</h2>
        <span className="meta">{itens.length} pendentes</span>
      </div>

      <div className="aviso aviso--alerta">
        <span>
          Estes informativos passaram da data de término. Remova a mídia no CMS das TVs e
          confirme aqui.
        </span>
      </div>

      <div className="lista-regua">
        {itens.map((item) => (
          <article key={item.id} className="item">
            <div className="item__corpo">
              <Protocolo valor={item.protocolo} />
              <h3 className="item__titulo">{item.titulo}</h3>
              <div className="linha linha--quebra">
                <span className="meta">terminou em {formatarData(item.dataFim)}</span>
                <span className="meta meta--nao-caixa">{nomeDaMidia(item)}</span>
                <BotaoCopiar texto={nomeDaMidia(item)} compacto />
              </div>
            </div>
            <div className="item__acoes">
              <button
                type="button"
                className="btn btn--secundario"
                onClick={() => aoConfirmar(item.id)}
              >
                <PackageCheck size={16} />
                Confirmar retirada
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AcoesEmLote({ selecionados, config, aoTerminar }) {
  const toast = useToast();
  const [ocupado, setOcupado] = useState(false);

  async function baixarTodos() {
    setOcupado(true);
    toast.sucesso(
      `Baixando ${selecionados.length} arquivos. O navegador pode pedir permissão na primeira vez.`
    );
    for (const item of selecionados) {
      try {
        await baixarComNome(item.caminhoStorage, nomePadronizado(item));
        // Espaco entre downloads: sem isso o navegador descarta os seguintes.
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        console.error(e);
      }
    }
    setOcupado(false);
  }

  function baixarManifesto() {
    const linhas = [
      ['Arquivo', 'Título', 'Duração exibição (s)', 'Início', 'Término', 'Remetente'],
      ...selecionados.map((i) => [
        nomePadronizado(i),
        i.titulo,
        i.duracaoSegundos
          ? Math.ceil(i.duracaoSegundos)
          : config.duracaoExibicaoPadraoSegundos,
        formatarData(i.dataInicio),
        formatarData(i.dataFim),
        i.enviadoPor?.nome,
      ]),
    ];

    const csv = linhas.map((l) => l.map(protegerCampo).join(';')).join('\r\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manifesto-programacao-${hojeISO()}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function programarTodos() {
    setOcupado(true);
    for (const item of selecionados) {
      await marcarProgramado(item.id, {
        referenciaExterna: null,
        duracaoExibicaoSegundos: item.duracaoSegundos
          ? Math.ceil(item.duracaoSegundos)
          : config.duracaoExibicaoPadraoSegundos,
      });
    }
    toast.sucesso(`${selecionados.length} marcados como programados.`);
    setOcupado(false);
    aoTerminar();
  }

  return (
    <div className="linha linha--quebra">
      <span className="meta">{selecionados.length} selecionados</span>
      <button type="button" className="btn btn--secundario" onClick={baixarTodos} disabled={ocupado}>
        <Download size={16} />
        Baixar
      </button>
      <button type="button" className="btn btn--secundario" onClick={baixarManifesto}>
        Manifesto CSV
      </button>
      <button type="button" className="btn btn--primario" onClick={programarTodos} disabled={ocupado}>
        Marcar programados
      </button>
    </div>
  );
}

/**
 * Campo iniciado por =, +, - ou @ e executado como formula ao abrir no Excel.
 * O prefixo com apostrofo neutraliza isso.
 */
function protegerCampo(valor) {
  const texto = String(valor ?? '');
  const perigoso = /^[=+\-@\t\r]/.test(texto);
  const limpo = (perigoso ? `'${texto}` : texto).replace(/"/g, '""');
  return `"${limpo}"`;
}
