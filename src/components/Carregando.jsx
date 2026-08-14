export default function Carregando({ texto = 'Carregando' }) {
  return (
    <div className="centro" role="status" aria-live="polite">
      <p className="meta">{texto}</p>
    </div>
  );
}

export function Skeleton({ altura = 16, largura = '100%', className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ height: altura, width: largura }}
      aria-hidden="true"
    />
  );
}

export function ListaSkeleton({ itens = 3 }) {
  return (
    <div className="lista-regua" aria-hidden="true">
      {Array.from({ length: itens }, (_, i) => (
        <div key={i} className="item">
          <Skeleton altura={54} largura={96} />
          <div className="item__corpo coluna">
            <Skeleton altura={10} largura="30%" />
            <Skeleton altura={16} largura="60%" />
            <Skeleton altura={10} largura="45%" />
          </div>
        </div>
      ))}
    </div>
  );
}
