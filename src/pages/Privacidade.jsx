import { Link } from 'react-router-dom';
import { Rodape } from '../components/Layout.jsx';

export default function Privacidade() {
  return (
    <>
      <header className="topbar">
        <div className="topbar__interno">
          <Link to="/" className="topbar__logo">
            <img src="/famp-logo.png" alt="FAMP — Faculdade Morgana Potrich" />
          </Link>
          <div className="crescer" />
          <Link to="/entrar" className="btn btn--secundario" style={{ minHeight: 32 }}>
            Entrar
          </Link>
        </div>
      </header>

      <main className="container container--estreito prosa">
        <h1>Privacidade e tratamento de dados</h1>

        <h2>Quais dados são coletados</h2>
        <ul>
          <li>Nome completo, cargo ou função, e-mail institucional e telefone de WhatsApp.</li>
          <li>Foto do perfil da conta Google, quando existir.</li>
          <li>Data e hora de cada acesso e de cada envio.</li>
          <li>Os arquivos de mídia enviados e as informações técnicas deles.</li>
        </ul>

        <h2>Para que servem</h2>
        <p>
          A finalidade é exclusiva: identificar o responsável por cada informativo enviado
          para exibição nas TVs dos campi e permitir contato sobre esses envios. Os dados
          não são usados para nenhuma outra finalidade, não alimentam mala direta e não
          são compartilhados com terceiros.
        </p>

        <h2>Por quanto tempo ficam guardados</h2>
        <ul>
          <li>
            <strong>Arquivos de mídia:</strong> apagados automaticamente 45 dias após o
            fim da veiculação. O registro do envio permanece, mas o arquivo não.
          </li>
          <li>
            <strong>Registro dos envios:</strong> mantido enquanto durar o acesso ao
            sistema e por até 24 meses após o último envio, para auditoria interna.
          </li>
        </ul>

        <h2>Seus direitos</h2>
        <p>
          Você pode acessar, corrigir ou solicitar a exclusão dos seus dados a qualquer
          momento. Nome, cargo e WhatsApp podem ser editados por você mesmo em "Meu
          cadastro". Para os demais pedidos, entre em contato com a coordenação.
        </p>
        <p>
          A correção de dados não altera registros anteriores: cada informativo guarda uma
          cópia dos seus dados no momento do envio, e essa cópia é o que dá validade à
          auditoria.
        </p>

        <h2>Segurança</h2>
        <p>
          O acesso é restrito a e-mails institucionais autorizados pela coordenação. Cada
          pessoa vê apenas os próprios envios; a visão completa é exclusiva da
          administração do sistema. Os arquivos ficam em armazenamento privado, acessível
          apenas a quem enviou e à administração.
        </p>

        <hr className="divisor" />

        <p>
          Veja também a{' '}
          <Link to="/politica" className="btn--texto">
            política de conteúdo
          </Link>{' '}
          e os{' '}
          <Link to="/padroes" className="btn--texto">
            padrões de mídia
          </Link>
          .
        </p>
      </main>

      <Rodape />
    </>
  );
}
