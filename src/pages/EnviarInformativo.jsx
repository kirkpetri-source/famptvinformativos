import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import UploadMidia from '../components/UploadMidia.jsx';
import DeclaracoesMidia, { declaracoesCompletas } from '../components/DeclaracoesMidia.jsx';
import EspecificacoesMidia from '../components/PainelPadroes.jsx';
import { carregarSistema, PADRAO_SISTEMA } from '../services/configuracoes.js';
import { criarRascunho, concluirEnvio, buscarPorId } from '../services/informativos.js';
import { enviarArquivo } from '../services/storage.js';
import { notificarEnvio } from '../services/api.js';
import { sanitizarNome, caminhoStorage } from '../utils/arquivos.js';
import { hojeISO, somarDiasISO, periodoExtenso } from '../utils/datas.js';
import { PRIORIDADE } from '../utils/status.js';

const MAX_DIAS = 90;

export default function EnviarInformativo() {
  const { user, cadastro } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const idOriginal = params.get('reenvioDe');

  const [config, setConfig] = useState(PADRAO_SISTEMA);
  const [midia, setMidia] = useState(null);
  const [declaracoes, setDeclaracoes] = useState({});
  const [erros, setErros] = useState({});
  const [progresso, setProgresso] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(null);

  const [form, setForm] = useState({
    titulo: '',
    conteudo: '',
    dataInicio: '',
    dataFim: '',
    prioridade: PRIORIDADE.NORMAL,
    justificativaUrgencia: '',
  });

  const hoje = hojeISO();
  const minimoNormal = somarDiasISO(hoje, config.antecedenciaMinimaDias);
  const urgente = form.prioridade === PRIORIDADE.URGENTE;
  const minimoInicio = urgente ? hoje : minimoNormal;

  useEffect(() => {
    carregarSistema().then(setConfig);
  }, []);

  // Reenvio corrigido: reaproveita texto e datas, mas exige arquivo novo.
  useEffect(() => {
    if (!idOriginal) return;
    buscarPorId(idOriginal).then((original) => {
      if (!original) return;
      setForm((atual) => ({
        ...atual,
        titulo: original.titulo,
        conteudo: original.conteudo,
        dataInicio: original.dataInicio >= hoje ? original.dataInicio : '',
        dataFim: original.dataFim >= hoje ? original.dataFim : '',
        prioridade: original.prioridade,
      }));
    });
  }, [idOriginal, hoje]);

  const aoEscolherMidia = useCallback((escolha) => {
    setMidia(escolha);
    setDeclaracoes({});
  }, []);

  const categoria = midia?.analise?.categoria || null;
  const declaracoesOk = categoria ? declaracoesCompletas(categoria, declaracoes) : false;
  const podeEnviar = Boolean(midia) && declaracoesOk && !enviando;

  function alterar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: null }));
  }

  function validar() {
    const novos = {};

    if (!form.titulo.trim()) novos.titulo = 'Informe um título.';
    else if (form.titulo.length > 80) novos.titulo = 'Máximo de 80 caracteres.';

    if (!form.conteudo.trim()) novos.conteudo = 'Descreva o informativo.';
    else if (form.conteudo.length > 600) novos.conteudo = 'Máximo de 600 caracteres.';

    if (!form.dataInicio) novos.dataInicio = 'Informe a data de início.';
    else if (form.dataInicio < minimoInicio) {
      novos.dataInicio = urgente
        ? 'A data de início não pode ser no passado.'
        : `Com ${config.antecedenciaMinimaDias} dias de antecedência, o mais cedo é ${minimoNormal
            .split('-')
            .reverse()
            .join('/')}.`;
    }

    if (!form.dataFim) novos.dataFim = 'Informe a data de término.';
    else if (form.dataFim < form.dataInicio) {
      novos.dataFim = 'O término não pode ser antes do início.';
    } else if (diasEntre(form.dataInicio, form.dataFim) > MAX_DIAS) {
      novos.dataFim = `O período máximo é de ${MAX_DIAS} dias.`;
    }

    if (urgente && !form.justificativaUrgencia.trim()) {
      novos.justificativaUrgencia = 'Explique por que é urgente.';
    }

    if (!midia) novos.arquivo = 'Escolha o arquivo do informativo.';

    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (!validar() || !podeEnviar) return;

    setEnviando(true);
    setProgresso(0);

    let id = null;

    try {
      // 1. Documento primeiro: gera o id e evita arquivo orfao se a rede cair.
      id = await criarRascunho({
        dados: { ...form, reenvioDe: idOriginal },
        usuario: user,
        cadastro,
      });

      // 2. Upload com progresso real.
      const nomeArmazenado = sanitizarNome(midia.arquivo);
      const caminho = caminhoStorage(user.uid, id, nomeArmazenado);

      const { promessa } = enviarArquivo({
        caminho,
        arquivo: midia.arquivo,
        aoProgredir: setProgresso,
      });
      await promessa;

      // 3. So agora o informativo entra na fila do admin.
      await concluirEnvio(id, {
        arquivo: {
          nomeOriginal: midia.arquivo.name,
          nomeArmazenado,
          tipo: midia.arquivo.type,
          tamanho: midia.arquivo.size,
        },
        analise: midia.analise,
        declaracoes,
        caminho,
      });

      // 4. Protocolo e e-mail. Falhar aqui NAO invalida o envio.
      let protocolo = null;
      try {
        protocolo = await notificarEnvio(id);
      } catch (e) {
        console.error('Notificação falhou; o cron reprocessa.', e);
      }

      setConcluido({ id, protocolo, ...form });
    } catch (e) {
      console.error(e);
      toast.erro(e.message || 'Não foi possível enviar. Tente de novo.');
      setEnviando(false);
      setProgresso(null);
    }
  }

  if (concluido) {
    return <Confirmacao dados={concluido} />;
  }

  return (
    <>
      <div className="cabecalho-secao">
        <h1>Enviar informativo</h1>
        {idOriginal ? <span className="badge badge--pendente">Reenvio corrigido</span> : null}
      </div>

      {idOriginal ? (
        <div className="aviso aviso--info">
          <span>
            Os textos e as datas do envio anterior foram mantidos. Escolha o arquivo
            corrigido para enviar de novo.
          </span>
        </div>
      ) : null}

      <div className="container--estreito" style={{ padding: 0 }}>
        <form onSubmit={enviar} noValidate>
          <div className="campo">
            <label className="rotulo" htmlFor="titulo">
              Título do informativo
            </label>
            <input
              id="titulo"
              type="text"
              maxLength={80}
              value={form.titulo}
              onChange={(e) => alterar('titulo', e.target.value)}
              aria-invalid={Boolean(erros.titulo)}
              placeholder="Semana da Enfermagem 2026"
            />
            <div className="campo__ajuda">
              <span>Nome interno do informativo. Não é o texto da arte.</span>
              <span className={`campo__contador ${form.titulo.length > 75 ? 'campo__contador--limite' : ''}`}>
                {form.titulo.length}/80
              </span>
            </div>
            {erros.titulo ? <p className="campo__erro">{erros.titulo}</p> : null}
          </div>

          <div className="campo">
            <label className="rotulo" htmlFor="conteudo">
              Conteúdo e observações
            </label>
            <textarea
              id="conteudo"
              maxLength={600}
              value={form.conteudo}
              onChange={(e) => alterar('conteudo', e.target.value)}
              aria-invalid={Boolean(erros.conteudo)}
              placeholder="Descreva o informativo e qualquer instrução para a administração."
            />
            <div className="campo__ajuda">
              <span />
              <span className={`campo__contador ${form.conteudo.length > 570 ? 'campo__contador--limite' : ''}`}>
                {form.conteudo.length}/600
              </span>
            </div>
            {erros.conteudo ? <p className="campo__erro">{erros.conteudo}</p> : null}
          </div>

          <div className="campo">
            <span className="rotulo">Arquivo</span>
            <EspecificacoesMidia limites={config} />
            <UploadMidia aoEscolher={aoEscolherMidia} limites={config} erroExterno={erros.arquivo} />
            {erros.arquivo ? <p className="campo__erro">{erros.arquivo}</p> : null}
          </div>

          <DeclaracoesMidia
            categoria={categoria}
            valores={declaracoes}
            aoMudar={setDeclaracoes}
          />

          <div className="grade-2">
            <div className="campo">
              <label className="rotulo" htmlFor="inicio">
                Data de início
              </label>
              <input
                id="inicio"
                type="date"
                min={minimoInicio}
                value={form.dataInicio}
                onChange={(e) => alterar('dataInicio', e.target.value)}
                aria-invalid={Boolean(erros.dataInicio)}
              />
              {erros.dataInicio ? <p className="campo__erro">{erros.dataInicio}</p> : null}
            </div>

            <div className="campo">
              <label className="rotulo" htmlFor="fim">
                Data de término
              </label>
              <input
                id="fim"
                type="date"
                min={form.dataInicio || minimoInicio}
                value={form.dataFim}
                onChange={(e) => alterar('dataFim', e.target.value)}
                aria-invalid={Boolean(erros.dataFim)}
              />
              {erros.dataFim ? <p className="campo__erro">{erros.dataFim}</p> : null}
            </div>
          </div>

          <div className="campo">
            <label className="rotulo" htmlFor="prioridade">
              Prioridade
            </label>
            <select
              id="prioridade"
              value={form.prioridade}
              onChange={(e) => alterar('prioridade', e.target.value)}
            >
              <option value={PRIORIDADE.NORMAL}>Normal</option>
              <option value={PRIORIDADE.URGENTE}>Urgente</option>
            </select>
            <div className="campo__ajuda">
              <span>
                {urgente
                  ? 'Urgente libera a antecedência mínima e destaca o e-mail da administração.'
                  : `Envios normais precisam de ${config.antecedenciaMinimaDias} dias de antecedência.`}
              </span>
            </div>
          </div>

          {urgente ? (
            <div className="campo">
              <label className="rotulo" htmlFor="justificativa">
                Por que é urgente
              </label>
              <textarea
                id="justificativa"
                maxLength={300}
                value={form.justificativaUrgencia}
                onChange={(e) => alterar('justificativaUrgencia', e.target.value)}
                aria-invalid={Boolean(erros.justificativaUrgencia)}
                style={{ minHeight: 64 }}
              />
              {erros.justificativaUrgencia ? (
                <p className="campo__erro">{erros.justificativaUrgencia}</p>
              ) : null}
            </div>
          ) : null}

          {progresso !== null ? (
            <div className="mb-4">
              <div className="linha linha--entre">
                <span className="meta">Enviando o arquivo</span>
                <span className="meta meta--forte">{progresso}%</span>
              </div>
              <div className="progresso">
                <div className="progresso__barra" style={{ width: `${progresso}%` }} />
              </div>
            </div>
          ) : null}

          <button type="submit" className="btn btn--primario btn--grande" disabled={!podeEnviar}>
            {enviando ? 'Enviando…' : 'Enviar informativo'}
          </button>

          {midia && !declaracoesOk ? (
            <p className="secundario mt-2">
              Marque as confirmações acima para liberar o envio.
            </p>
          ) : null}
        </form>
      </div>
    </>
  );
}

function Confirmacao({ dados }) {
  return (
    <div className="container--estreito">
      <div className="linha mb-4">
        <CheckCircle2 size={28} color="var(--famp-success)" />
        <h1>Informativo enviado</h1>
      </div>

      <div className="bloco">
        <p className="meta mb-2">Protocolo</p>
        <p className="destaque-numero" style={{ fontSize: 'var(--tipo-26)' }}>
          {dados.protocolo || 'sendo gerado…'}
        </p>

        <hr className="divisor" />

        <p className="meta mb-2">Título</p>
        <p className="mb-4">{dados.titulo}</p>

        <p className="meta mb-2">Período de veiculação</p>
        <p>{periodoExtenso(dados.dataInicio, dados.dataFim)}</p>
      </div>

      {!dados.protocolo ? (
        <div className="aviso aviso--alerta mt-4">
          <span>
            O envio foi registrado. O protocolo aparece em "Meus envios" assim que o
            sistema terminar de processar.
          </span>
        </div>
      ) : null}

      <div className="linha mt-6">
        <Link to="/meus-envios" className="btn btn--primario">
          Ver meus envios
        </Link>
        <Link to="/enviar" className="btn btn--secundario" reloadDocument>
          Enviar outro
        </Link>
      </div>
    </div>
  );
}

function diasEntre(a, b) {
  if (!a || !b) return 0;
  return Math.round((new Date(b) - new Date(a)) / 86400000) + 1;
}
