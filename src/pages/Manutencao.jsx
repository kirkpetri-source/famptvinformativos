/**
 * Falha de infraestrutura. Tela decente em vez de spinner infinito.
 */
export default function Manutencao() {
  return (
    <div className="centro">
      <div className="centro__card">
        <img
          src="/famp-logo.png"
          alt="FAMP — Faculdade Morgana Potrich"
          style={{ height: 36, marginBottom: 'var(--e-6)' }}
        />
        <h1 style={{ fontSize: 'var(--tipo-20)' }}>O sistema está fora do ar</h1>
        <p className="mt-4">
          Não foi possível conectar ao servidor. Isso costuma ser temporário — tente de
          novo em alguns minutos.
        </p>
        <button
          type="button"
          className="btn btn--primario btn--bloco mt-6"
          onClick={() => window.location.reload()}
        >
          Tentar de novo
        </button>
        <p className="secundario mt-4">
          Se continuar assim, avise a coordenação.
        </p>
      </div>
    </div>
  );
}
