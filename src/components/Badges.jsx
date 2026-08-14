import { TEXTO_STATUS, CLASSE_STATUS, STATUS } from '../utils/status.js';
import { TEXTO_PROBLEMA } from '../utils/midia.js';

export function BadgeStatus({ status }) {
  const noAr = status === STATUS.NO_AR;
  return (
    <span className={`badge ${CLASSE_STATUS[status] || 'badge--neutro'}`}>
      {/* Tally light — o unico elemento vivo da interface. Nao replicar. */}
      {noAr ? <span className="tally" aria-hidden="true" /> : null}
      {TEXTO_STATUS[status] || status}
    </span>
  );
}

export function BadgeConformidade({ conformidade }) {
  if (!conformidade) return null;

  if (conformidade.conforme) {
    return <span className="badge badge--no-ar">Conforme</span>;
  }

  const titulo = (conformidade.problemas || [])
    .map((p) => TEXTO_PROBLEMA[p] || p)
    .join(' · ');

  return (
    <span className="badge badge--pendente" title={titulo}>
      Fora do padrão
    </span>
  );
}

export function BadgePrioridade({ prioridade }) {
  if (prioridade !== 'urgente') return null;
  return <span className="badge badge--rejeitado">Urgente</span>;
}

/** Protocolo — ancora visual de cada item, e o dado que vai para o CMS. */
export function Protocolo({ valor }) {
  return <span className="meta">{valor || 'sem protocolo'}</span>;
}
