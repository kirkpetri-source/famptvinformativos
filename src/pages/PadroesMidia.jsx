import { Link } from 'react-router-dom';
import { Rodape } from '../components/Layout.jsx';

/**
 * Rota publica, curta de proposito.
 *
 * E a pagina que a coordenacao manda por WhatsApp para quem vai preparar uma
 * arte. Quem precisa das regras completas ja esta dentro do sistema, e la o
 * proprio envio mostra o que esta errado na hora certa.
 */
export default function PadroesMidia() {
  return (
    <>
      <header className="topbar">
        <div className="topbar__interno">
          <Link to="/" className="topbar__logo">
            <img src="/famp-logo.png" alt="FAMP — Faculdade Morgana Potrich" />
          </Link>
          <div className="crescer" />
          <Link to="/entrar" className="btn btn--secundario" style={{ minHeight: 34 }}>
            Entrar
          </Link>
        </div>
      </header>

      <main className="container container--estreito">
        <h1>Como preparar a arte</h1>
        <p className="secundario mt-2 mb-8">Para os informativos das TVs do campus.</p>

        <div className="ficha">
          <Linha rotulo="Tamanho" valor="1920 × 1080 pixels, deitado" />
          <Linha rotulo="Imagem" valor="JPG ou PNG, até 15 MB" />
          <Linha rotulo="Vídeo" valor="MP4, até 30 segundos e 70 MB" />
          <Linha rotulo="PDF" valor="Uma página, deitada, até 20 MB" />
        </div>

        <div className="aviso aviso--alerta mt-8">
          <span>
            <strong>As TVs não têm som.</strong> Se o vídeo tem fala, ela precisa aparecer
            escrita na tela.
          </span>
        </div>

        <p className="secundario mt-8">
          Texto grande e de alto contraste: quem passa no corredor lê de longe e de
          passagem.
        </p>
      </main>

      <Rodape />
    </>
  );
}

function Linha({ rotulo, valor }) {
  return (
    <div className="ficha__linha">
      <span className="meta">{rotulo}</span>
      <span className="ficha__valor">{valor}</span>
    </div>
  );
}
