import { Link } from 'react-router-dom';

/**
 * Uma frase e a acao seguinte. Sem ilustracao generica.
 * Tela vazia e convite para agir, nao momento de humor.
 */
export default function EstadoVazio({ mensagem, acao, para, aoClicar }) {
  return (
    <div className="vazio">
      <p>{mensagem}</p>
      {acao && para ? (
        <Link to={para} className="btn btn--primario">
          {acao}
        </Link>
      ) : acao && aoClicar ? (
        <button type="button" className="btn btn--primario" onClick={aoClicar}>
          {acao}
        </button>
      ) : null}
    </div>
  );
}
