import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { entrarComGoogle } from '../services/auth.js';
import { useAuth } from '../hooks/useAuth.jsx';
import Carregando from '../components/Carregando.jsx';
import Porta from '../components/Porta.jsx';
import { DOMINIO_INSTITUCIONAL } from '../utils/dominio.js';

export default function Login() {
  const { carregando, user, acesso, precisaCadastro, isAdmin, erroLogin } = useAuth();
  const [entrando, setEntrando] = useState(false);
  const [erroLocal, setErroLocal] = useState(null);

  // O erro do redirect vem do provedor, ja que a pagina foi recarregada.
  const erro = erroLocal ?? (erroLogin ? traduzirErro(erroLogin) : null);

  if (carregando) return <Carregando />;

  if (user) {
    if (acesso?.recusa) return <Navigate to="/acesso-negado" replace />;
    if (precisaCadastro) return <Navigate to="/primeiro-acesso" replace />;
    return <Navigate to={isAdmin ? '/programacao' : '/enviar'} replace />;
  }

  async function entrar() {
    setErroLocal(null);
    setEntrando(true);
    try {
      // No celular isto sai da pagina: nao ha estado para desligar depois.
      await entrarComGoogle();
    } catch (e) {
      setErroLocal(traduzirErro(e));
      setEntrando(false);
    }
  }

  return (
    <Porta>
      <img src="/famp-logo.png" alt="FAMP — Faculdade Morgana Potrich" className="porta__logo" />

      <h1 className="porta__titulo">TV Informativos</h1>
      <p className="porta__nota mt-2 mb-8">
        Envie seus informativos para as telas do campus.
      </p>

      {erro ? (
        <div className="aviso aviso--erro" role="alert">
          <span>{erro}</span>
        </div>
      ) : null}

      <button
        type="button"
        className="btn btn--primario btn--grande btn--bloco"
        onClick={entrar}
        disabled={entrando}
      >
        <IconeGoogle />
        {entrando ? 'Abrindo o Google…' : 'Entrar com e-mail institucional'}
      </button>

      <p className="porta__nota mt-4">
        Use seu e-mail <strong>{DOMINIO_INSTITUCIONAL}</strong>. O acesso é liberado pela
        coordenação.
      </p>

      <div className="porta__rodape">
        <Link to="/padroes" className="meta meta--nao-caixa">
          Padrões de mídia
        </Link>
        <Link to="/politica" className="meta meta--nao-caixa">
          Política de conteúdo
        </Link>
        <Link to="/privacidade" className="meta meta--nao-caixa">
          Privacidade
        </Link>
      </div>
    </Porta>
  );
}

/**
 * Erro tem que dizer o que aconteceu e o que fazer. "Tente de novo em alguns
 * instantes" nao ajuda ninguem quando a causa e configuracao do projeto.
 */
function traduzirErro(e) {
  const codigo = e?.code || '';

  if (codigo === 'auth/popup-closed-by-user' || codigo === 'auth/cancelled-popup-request') {
    return null;
  }
  if (codigo === 'auth/popup-blocked') {
    return 'O navegador bloqueou a janela do Google. Libere os pop-ups para este endereço e tente de novo.';
  }
  if (codigo === 'auth/operation-not-allowed') {
    return 'O login com Google ainda não foi habilitado neste projeto. Avise a coordenação.';
  }
  if (codigo === 'auth/unauthorized-domain') {
    return 'Este endereço não está autorizado no Firebase Authentication. Avise a coordenação.';
  }
  if (codigo === 'auth/redirect-cancelled-by-user' || codigo === 'auth/user-cancelled') {
    return null;
  }
  if (codigo === 'auth/web-storage-unsupported') {
    return 'Seu navegador está bloqueando os dados do site. Saia do modo anônimo ou libere os cookies para este endereço.';
  }
  if (codigo === 'auth/account-exists-with-different-credential') {
    return 'Já existe uma conta com este e-mail criada por outro método de login. Avise a coordenação.';
  }
  if (codigo === 'auth/network-request-failed') {
    return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
  }

  console.error('Falha no login:', codigo, e);
  return `Não foi possível entrar${codigo ? ` (${codigo})` : ''}. Avise a coordenação se persistir.`;
}

function IconeGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C39.9 35.7 44 30.4 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
