import { useEffect, useState } from 'react';
import { useToast } from '../hooks/useToast.jsx';
import Carregando from '../components/Carregando.jsx';
import {
  carregarSistema,
  salvarSistema,
  carregarPadroesMidia,
  salvarPadroesMidia,
  TETO_STORAGE_MB,
} from '../services/configuracoes.js';

export default function Configuracoes() {
  const toast = useToast();
  const [valores, setValores] = useState(null);
  const [padroes, setPadroes] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    Promise.all([carregarSistema({ recarregar: true }), carregarPadroesMidia()])
      .then(([sistema, texto]) => {
        setValores(sistema);
        setPadroes(texto);
      })
      .catch(() => toast.erro('Não foi possível carregar as configurações.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!valores) return <Carregando />;

  const acimaDoTeto = [valores.limiteImagemMB, valores.limiteVideoMB, valores.limitePdfMB].some(
    (v) => Number(v) > TETO_STORAGE_MB
  );

  function alterar(campo, valor) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvar(evento) {
    evento.preventDefault();
    setSalvando(true);
    try {
      await salvarSistema({
        antecedenciaMinimaDias: Number(valores.antecedenciaMinimaDias),
        limiteSimultaneos: Number(valores.limiteSimultaneos),
        limiteImagemMB: Number(valores.limiteImagemMB),
        limiteVideoMB: Number(valores.limiteVideoMB),
        limitePdfMB: Number(valores.limitePdfMB),
        duracaoExibicaoPadraoSegundos: Number(valores.duracaoExibicaoPadraoSegundos),
        retencaoArquivoDias: Number(valores.retencaoArquivoDias),
        limiteEnviosPorDia: Number(valores.limiteEnviosPorDia),
      });
      await salvarPadroesMidia(padroes);
      toast.sucesso('Configurações salvas.');
    } catch (e) {
      console.error(e);
      toast.erro('Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="container--estreito">
      <div className="cabecalho-secao">
        <h1>Configurações</h1>
      </div>

      <section className="bloco mb-6">
        <h2 style={{ fontSize: 'var(--tipo-16)' }} className="mb-4">
          Envio
        </h2>

        <div className="grade-2">
          <Numero
            id="antecedencia"
            rotulo="Antecedência mínima (dias)"
            ajuda="Prazo entre o envio e a data de início. Urgente ignora."
            valor={valores.antecedenciaMinimaDias}
            aoMudar={(v) => alterar('antecedenciaMinimaDias', v)}
          />
          <Numero
            id="envios"
            rotulo="Envios por pessoa por dia"
            ajuda="Contém o clique repetido quando a rede está ruim."
            valor={valores.limiteEnviosPorDia}
            aoMudar={(v) => alterar('limiteEnviosPorDia', v)}
          />
        </div>
      </section>

      <section className="bloco mb-6">
        <h2 style={{ fontSize: 'var(--tipo-16)' }} className="mb-4">
          Limites de arquivo
        </h2>

        <div className="grade-2">
          <Numero
            id="imagem"
            rotulo="Imagem (MB)"
            valor={valores.limiteImagemMB}
            aoMudar={(v) => alterar('limiteImagemMB', v)}
          />
          <Numero
            id="video"
            rotulo="Vídeo (MB)"
            valor={valores.limiteVideoMB}
            aoMudar={(v) => alterar('limiteVideoMB', v)}
          />
          <Numero
            id="pdf"
            rotulo="PDF (MB)"
            valor={valores.limitePdfMB}
            aoMudar={(v) => alterar('limitePdfMB', v)}
          />
        </div>

        {acimaDoTeto ? (
          <div className="aviso aviso--alerta mt-4">
            <span>
              A regra do Storage tem teto fixo de {TETO_STORAGE_MB} MB e prevalece sobre
              qualquer valor maior configurado aqui. Para passar disso é preciso alterar
              storage.rules e publicar de novo.
            </span>
          </div>
        ) : null}

        <p className="secundario mt-4">
          Imagens acima de 1,5 MB são reamostradas no navegador antes do envio, então o
          limite de imagem raramente é alcançado.
        </p>
      </section>

      <section className="bloco mb-6">
        <h2 style={{ fontSize: 'var(--tipo-16)' }} className="mb-4">
          Exibição e retenção
        </h2>

        <div className="grade-2">
          <Numero
            id="duracao"
            rotulo="Duração padrão de exibição (s)"
            ajuda="Usada em imagem e PDF. Vídeo usa a duração real."
            valor={valores.duracaoExibicaoPadraoSegundos}
            aoMudar={(v) => alterar('duracaoExibicaoPadraoSegundos', v)}
          />
          <Numero
            id="simultaneos"
            rotulo="Alerta de simultâneos no ar"
            ajuda="Acima disso o rodízio fica longo e cada arte aparece menos."
            valor={valores.limiteSimultaneos}
            aoMudar={(v) => alterar('limiteSimultaneos', v)}
          />
          <Numero
            id="retencao"
            rotulo="Retenção do arquivo (dias)"
            ajuda="Depois disso o arquivo é apagado. O registro do envio permanece."
            valor={valores.retencaoArquivoDias}
            aoMudar={(v) => alterar('retencaoArquivoDias', v)}
          />
        </div>

        <div className="aviso aviso--info mt-4">
          <span>
            Mudar a retenção altera o que está escrito na política de privacidade. Se
            aumentar ou reduzir, ajuste também o texto da página /privacidade.
          </span>
        </div>
      </section>

      <section className="bloco mb-6">
        <h2 style={{ fontSize: 'var(--tipo-16)' }} className="mb-4">
          Texto dos padrões de mídia
        </h2>
        <p className="secundario mb-4">
          Aparece na página pública /padroes e no e-mail de recusa técnica. Editável aqui
          para não precisar de deploy quando o padrão mudar.
        </p>
        <textarea
          value={padroes}
          onChange={(e) => setPadroes(e.target.value)}
          style={{ minHeight: 240, fontFamily: 'var(--fonte-meta)', fontSize: 'var(--tipo-14)' }}
        />
      </section>

      <button type="submit" className="btn btn--primario btn--grande" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar configurações'}
      </button>
    </form>
  );
}

function Numero({ id, rotulo, ajuda, valor, aoMudar }) {
  return (
    <div className="campo">
      <label className="rotulo" htmlFor={id}>
        {rotulo}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
      />
      {ajuda ? (
        <div className="campo__ajuda">
          <span>{ajuda}</span>
        </div>
      ) : null}
    </div>
  );
}
