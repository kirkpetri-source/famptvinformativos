import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { formatarData } from '../utils/datas.js';
import { nomeDaMidia } from '../utils/arquivos.js';

/**
 * O bloco que elimina a transcricao manual.
 *
 * Transcrever data na mao, olhando de uma tela para outra, e onde nascem os
 * erros de veiculacao. Aqui o operador copia e cola no CMS das TVs.
 */
export default function DadosParaCMS({ informativo, duracaoExibicao }) {
  const linhas = [
    { rotulo: 'Nome da mídia', valor: nomeDaMidia(informativo) },
    { rotulo: 'Duração exibição', valor: `${duracaoExibicao} s` },
    { rotulo: 'Início', valor: formatarData(informativo.dataInicio) },
    { rotulo: 'Término', valor: formatarData(informativo.dataFim) },
    {
      rotulo: 'Remetente',
      valor: `${informativo.enviadoPor?.nome} — ${informativo.enviadoPor?.cargo}`,
    },
  ];

  if (informativo.conteudo) {
    linhas.push({ rotulo: 'Observação', valor: informativo.conteudo });
  }

  const blocoCompleto = linhas
    .map((l) => `${l.rotulo.padEnd(18)} ${l.valor}`)
    .join('\n');

  return (
    <section className="bloco">
      <div className="linha linha--entre mb-4">
        <h3>Dados para o CMS</h3>
        <BotaoCopiar texto={blocoCompleto} rotulo="Copiar tudo" />
      </div>

      <dl>
        {linhas.map((linha) => (
          <div key={linha.rotulo} className="linha linha--topo" style={{ padding: '6px 0' }}>
            <dt className="meta" style={{ minWidth: 132, flexShrink: 0 }}>
              {linha.rotulo}
            </dt>
            <dd className="crescer" style={{ fontSize: 'var(--tipo-14)', wordBreak: 'break-word' }}>
              {linha.valor}
            </dd>
            <BotaoCopiar texto={linha.valor} compacto />
          </div>
        ))}
      </dl>
    </section>
  );
}

export function BotaoCopiar({ texto, rotulo, compacto = false }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // Clipboard API exige contexto seguro; o fallback cobre http local.
      const campo = document.createElement('textarea');
      campo.value = texto;
      campo.style.position = 'fixed';
      campo.style.opacity = '0';
      document.body.appendChild(campo);
      campo.select();
      document.execCommand('copy');
      campo.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1600);
  }

  return (
    <button
      type="button"
      className="btn btn--secundario"
      onClick={copiar}
      style={{ minHeight: compacto ? 26 : 32, padding: compacto ? '0 6px' : '0 12px' }}
      aria-label={`Copiar ${rotulo || 'valor'}`}
    >
      {copiado ? <Check size={14} color="var(--famp-success)" /> : <Copy size={14} />}
      {rotulo ? <span>{copiado ? 'Copiado' : rotulo}</span> : null}
    </button>
  );
}
