import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import Carregando from './Carregando.jsx';

/**
 * Ordem das verificacoes, e ela importa:
 *   sessao -> dominio/whitelist -> cadastro concluido -> perfil exigido
 */
export default function RotaProtegida({ children, exigeAdmin = false }) {
  const { carregando, user, acesso, precisaCadastro, isAdmin, falhaInfra } = useAuth();
  const local = useLocation();

  if (falhaInfra) return <Navigate to="/manutencao" replace />;
  if (carregando) return <Carregando />;
  if (!user) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />;
  if (acesso?.recusa) return <Navigate to="/acesso-negado" replace />;
  if (precisaCadastro) return <Navigate to="/primeiro-acesso" replace />;

  if (exigeAdmin && !isAdmin) {
    return <Navigate to="/enviar" replace />;
  }

  return children;
}
