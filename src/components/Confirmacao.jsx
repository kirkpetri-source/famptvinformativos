import { useState, useEffect, useRef } from 'react';

/**
 * Modal de acao com motivo. Toda acao irreversivel nomeia o item na frase —
 * "Cancelar 'Semana da Enfermagem'?" e diferente de "Confirmar?".
 */
export default function Confirmacao({
  titulo,
  descricao,
  nomeDoItem,
  rotuloConfirmar = 'Confirmar',
  perigoso = false,
  exigeMotivo = false,
  opcoesMotivo = null,
  minimoObservacao = 10,
  aoConfirmar,
  aoCancelar,
}) {
  const [motivo, setMotivo] = useState(opcoesMotivo ? Object.keys(opcoesMotivo)[0] : null);
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const primeiro = useRef(null);

  useEffect(() => {
    primeiro.current?.focus();
    function aoTeclar(e) {
      if (e.key === 'Escape') aoCancelar();
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aoCancelar]);

  const observacaoOk = !exigeMotivo || observacao.trim().length >= minimoObservacao;

  async function confirmar() {
    if (!observacaoOk) return;
    setEnviando(true);
    try {
      await aoConfirmar({ motivo, observacao: observacao.trim() });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="modal-fundo" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="modal">
        <h2 style={{ fontSize: 'var(--tipo-20)' }}>{titulo}</h2>

        {nomeDoItem ? (
          <p className="mt-2" style={{ fontWeight: 600 }}>
            {nomeDoItem}
          </p>
        ) : null}

        {descricao ? <p className="secundario mt-2">{descricao}</p> : null}

        {opcoesMotivo ? (
          <div className="campo mt-6">
            <label className="rotulo" htmlFor="motivo">
              Motivo
            </label>
            <select
              id="motivo"
              ref={primeiro}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            >
              {Object.entries(opcoesMotivo).map(([chave, texto]) => (
                <option key={chave} value={chave}>
                  {texto}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {exigeMotivo ? (
          <div className="campo">
            <label className="rotulo" htmlFor="observacao">
              O que dizer a quem enviou
            </label>
            <textarea
              id="observacao"
              ref={opcoesMotivo ? null : primeiro}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Explique o que precisa ser corrigido. Este texto vai no e-mail."
            />
            <div className="campo__ajuda">
              <span>Mínimo de {minimoObservacao} caracteres.</span>
              <span className="campo__contador">{observacao.trim().length}</span>
            </div>
          </div>
        ) : null}

        <div className="modal__acoes">
          <button type="button" className="btn btn--secundario" onClick={aoCancelar}>
            Voltar
          </button>
          <button
            type="button"
            className={`btn ${perigoso ? 'btn--perigo' : 'btn--primario'}`}
            onClick={confirmar}
            disabled={!observacaoOk || enviando}
          >
            {enviando ? 'Aguarde…' : rotuloConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
