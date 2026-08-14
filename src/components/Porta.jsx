import { useEffect, useState } from 'react';

/**
 * A fachada do sistema — login, primeiro acesso e acesso negado usam esta casca.
 *
 * Tela dividida: a esquerda e o campo marrom da marca com o letreiro; a direita
 * e o creme onde a logo da FAMP foi feita para viver.
 *
 * O elemento assinatura e o RODIZIO: cada informativo segura a tela do campus
 * por alguns segundos e passa a vez ao proximo. A barra faz exatamente isso —
 * enche, zera, avanca a legenda. E a unica coisa que se move aqui, e ela e
 * verdade sobre o produto, nao enfeite.
 */

const PASSOS = [
  'Sua arte entra no rodízio das telas do campus.',
  'Você escolhe o dia em que ela entra e o dia em que sai.',
  'A coordenação recebe tudo pronto para subir nas TVs.',
];

const DURACAO_MS = 7000;

export default function Porta({ children }) {
  const [passo, setPasso] = useState(0);

  useEffect(() => {
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduzido) return;

    const id = setInterval(() => {
      setPasso((atual) => (atual + 1) % PASSOS.length);
    }, DURACAO_MS);

    return () => clearInterval(id);
  }, []);

  return (
    <div className="porta">
      <aside className="porta__letreiro">
        <span className="porta__marca">Faculdade Morgana Potrich</span>

        <p className="porta__frase">
          O que aparece <em>nas TVs</em> do campus começa aqui.
        </p>

        <div className="rodizio">
          <p className="rodizio__legenda" aria-live="off">
            {PASSOS[passo]}
          </p>
          <div className="rodizio__trilhos" aria-hidden="true">
            {PASSOS.map((_, i) => (
              <span
                key={i}
                className={`rodizio__trilho ${
                  i === passo ? 'rodizio__trilho--ativo' : ''
                } ${i < passo ? 'rodizio__trilho--visto' : ''}`}
              >
                <span className="rodizio__preenchido" key={`${i}-${passo}`} />
              </span>
            ))}
          </div>
        </div>
      </aside>

      <main className="porta__acesso">
        <div className="porta__conteudo">{children}</div>
      </main>
    </div>
  );
}
