import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function NaoEncontrado() {
  const { autorizado, isAdmin } = useAuth();
  const destino = autorizado ? (isAdmin ? '/programacao' : '/enviar') : '/entrar';

  return (
    <div className="centro">
      <div className="centro__card">
        <p className="meta mb-4">Erro 404</p>
        <h1 style={{ fontSize: 'var(--tipo-20)' }}>Esta página não existe</h1>
        <p className="mt-4">O endereço pode ter mudado ou o link estar incompleto.</p>
        <Link to={destino} className="btn btn--primario btn--bloco mt-6">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
