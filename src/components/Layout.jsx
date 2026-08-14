import { NavLink, Link, Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';

/**
 * Barra superior fina e coluna central. Sem sidebar.
 *
 * Sidebar escura com icones coloridos e a assinatura visual mais reconhecivel
 * de painel gerado automaticamente, e aqui ha no maximo seis destinos — cabem
 * numa linha.
 */

const NAV_COLABORADOR = [
  { para: '/enviar', texto: 'Enviar informativo' },
  { para: '/meus-envios', texto: 'Meus envios' },
  { para: '/padroes', texto: 'Padrões de mídia' },
];

const NAV_ADMIN = [
  { para: '/programacao', texto: 'Programação' },
  { para: '/painel', texto: 'Painel' },
  { para: '/informativos', texto: 'Informativos' },
  { para: '/relatorio', texto: 'Relatório' },
  { para: '/usuarios', texto: 'Usuários' },
  { para: '/configuracoes', texto: 'Configurações' },
];

export default function Layout() {
  const { cadastro, isAdmin, sair } = useAuth();
  const itens = isAdmin ? NAV_ADMIN : NAV_COLABORADOR;

  return (
    <>
      <header className="topbar">
        <div className="topbar__interno">
          <Link to={isAdmin ? '/programacao' : '/enviar'} className="topbar__logo">
            <img src="/famp-logo.png" alt="FAMP — Faculdade Morgana Potrich" />
            <span className="so-leitor">TV Informativos</span>
          </Link>

          <nav className="topbar__nav" aria-label="Navegação principal">
            {itens.map((item) => (
              <NavLink key={item.para} to={item.para} className="topbar__link">
                {item.texto}
              </NavLink>
            ))}
          </nav>

          <div className="topbar__usuario">
            {cadastro?.foto ? (
              <img className="topbar__avatar" src={cadastro.foto} alt="" />
            ) : null}
            <Link to="/meu-cadastro" className="meta meta--nao-caixa">
              {primeiroNome(cadastro?.nome)}
            </Link>
            <button
              type="button"
              onClick={sair}
              className="btn btn--secundario"
              style={{ minHeight: 32, padding: '0 10px' }}
            >
              <LogOut size={16} />
              <span className="so-leitor">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>

      <Rodape />
    </>
  );
}

function primeiroNome(nome) {
  if (!nome) return '';
  return nome.trim().split(/\s+/)[0];
}

export function Rodape() {
  return (
    <footer className="container" style={{ paddingTop: 0 }}>
      <hr className="divisor" />
      <div className="linha linha--quebra linha--entre">
        <p className="meta meta--nao-caixa">
          TV Informativos · Faculdade Morgana Potrich
        </p>
        <nav className="linha linha--quebra" style={{ gap: 'var(--e-4)' }}>
          <Link to="/padroes" className="meta meta--nao-caixa">
            Padrões de mídia
          </Link>
          <Link to="/politica" className="meta meta--nao-caixa">
            Política de conteúdo
          </Link>
          <Link to="/privacidade" className="meta meta--nao-caixa">
            Privacidade
          </Link>
        </nav>
      </div>
      <p className="meta meta--nao-caixa mt-2">
        Problemas com o sistema? Fale com a coordenação.
      </p>
    </footer>
  );
}
