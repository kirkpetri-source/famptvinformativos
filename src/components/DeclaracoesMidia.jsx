import { declaracoesExigidas, TEXTO_DECLARACAO } from '../utils/midia.js';

/**
 * As declaracoes variam por tipo de arquivo.
 *
 * Imagem nao pede nada: JPG nao tem audio nem fala, e pedir confirmacao disso
 * ensina o usuario a marcar caixa sem ler — o que estraga as declaracoes que
 * realmente importam.
 */
export default function DeclaracoesMidia({ categoria, valores, aoMudar }) {
  const exigidas = declaracoesExigidas(categoria);

  if (!exigidas.length) return null;

  return (
    <div className="campo">
      <span className="rotulo">Confirmações obrigatórias</span>
      <div className="coluna">
        {exigidas.map((chave) => (
          <label
            key={chave}
            className={`declaracao ${valores[chave] ? 'declaracao--marcada' : ''}`}
          >
            <input
              type="checkbox"
              checked={Boolean(valores[chave])}
              onChange={(e) => aoMudar({ ...valores, [chave]: e.target.checked })}
            />
            <span>{TEXTO_DECLARACAO[chave]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function declaracoesCompletas(categoria, valores) {
  return declaracoesExigidas(categoria).every((chave) => valores[chave] === true);
}
