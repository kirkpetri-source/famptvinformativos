/**
 * O que o professor precisa saber na hora de escolher o arquivo, e nada mais:
 * formatos aceitos, resolucao e peso maximo.
 *
 * O resto — por que nao pode ter audio, por que 16:9 — o sistema mostra no
 * momento certo, quando ele ja escolheu o arquivo e ve o resultado na
 * moldura. Explicacao antes da hora vira parede de texto que ninguem le.
 */
export default function EspecificacoesMidia({ limites }) {
  const maior = Math.max(limites.limiteImagemMB, limites.limiteVideoMB, limites.limitePdfMB);

  return (
    <div className="especificacoes">
      <Chip rotulo="Formatos" valor="JPG · PNG · MP4 · PDF" />
      <Chip rotulo="Tamanho da tela" valor="1920 × 1080" />
      <Chip rotulo="Peso máximo" valor={`${maior} MB`} />
    </div>
  );
}

function Chip({ rotulo, valor }) {
  return (
    <div className="especificacoes__chip">
      <span className="especificacoes__rotulo">{rotulo}</span>
      <span className="especificacoes__valor">{valor}</span>
    </div>
  );
}
