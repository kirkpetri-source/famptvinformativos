import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { MOTIVO_RECUSA, DOMINIO_INSTITUCIONAL } from '../utils/dominio.js';
import Carregando from '../components/Carregando.jsx';
import Porta from '../components/Porta.jsx';

/**
 * Duas mensagens diferentes, porque a acao do usuario e diferente:
 * fora do dominio ele troca de conta; fora da whitelist ele pede autorizacao.
 *
 * Nao e erro do usuario, e a tela nao deve parecer erro.
 */
export default function NaoAutorizado() {
  const { carregando, user, acesso, sair } = useAuth();

  if (carregando) return <Carregando />;
  if (!user) return <Navigate to="/entrar" replace />;
  if (!acesso?.recusa) return <Navigate to="/enviar" replace />;

  const foraDoDominio = acesso.recusa === MOTIVO_RECUSA.DOMINIO;

  return (
    <Porta>
      <img src="/famp-logo.png" alt="FAMP — Faculdade Morgana Potrich" className="porta__logo" />

      {foraDoDominio ? (
        <>
          <h1 className="porta__titulo">Só e-mails institucionais</h1>
          <p className="porta__nota mt-4">
            Você entrou com <strong>{acesso.email}</strong>. Para usar o sistema, entre com
            seu e-mail <strong>{DOMINIO_INSTITUCIONAL}</strong>.
          </p>
          <button type="button" className="btn btn--primario btn--grande btn--bloco mt-8" onClick={sair}>
            Trocar de conta
          </button>
        </>
      ) : (
        <>
          <h1 className="porta__titulo">Acesso ainda não liberado</h1>
          <p className="porta__nota mt-4">
            O e-mail <strong>{acesso.email}</strong> é institucional, mas ainda não foi
            autorizado. Fale com a coordenação para pedir o acesso.
          </p>
          <button type="button" className="btn btn--secundario btn--grande btn--bloco mt-8" onClick={sair}>
            Sair
          </button>
        </>
      )}
    </Porta>
  );
}
