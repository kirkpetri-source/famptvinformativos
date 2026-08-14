/**
 * A linha que responde "o que eu preciso fazer agora".
 *
 * Numeros em mono, numa linha so. Sem fileira de KPI cards — quatro caixas
 * grandes com um numero dentro e a assinatura mais reconhecivel de painel
 * gerado automaticamente, e nao comunicam nada que esta linha nao comunique.
 */
export default function AgendaDoDia({ itens }) {
  return (
    <div className="agenda" role="group" aria-label="Resumo do dia">
      <span className="meta meta--forte">Hoje</span>
      {itens.map((item, i) => (
        <span key={item.rotulo} style={{ display: 'contents' }}>
          <span className="agenda__separador" aria-hidden="true">
            ·
          </span>
          {item.aoClicar ? (
            <button
              type="button"
              className={`agenda__item ${item.alerta ? 'agenda__item--alerta' : ''}`}
              onClick={item.aoClicar}
            >
              <strong>{item.valor}</strong> {item.rotulo}
            </button>
          ) : (
            <span className={`agenda__item ${item.alerta ? 'agenda__item--alerta' : ''}`}>
              <strong>{item.valor}</strong> {item.rotulo}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
