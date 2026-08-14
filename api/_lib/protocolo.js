import { db } from './firebaseAdmin.js';

/**
 * Protocolo sequencial por ano: FAMP-2026-0134.
 *
 * Atribuido EXCLUSIVAMENTE aqui, no servidor, dentro de uma transacao. O
 * cliente nao tem permissao de escrita em `configuracoes` — se a numeracao
 * fosse feita no navegador, todo envio falharia em producao.
 *
 * A transacao tambem garante que dois envios simultaneos nao recebam o mesmo
 * numero.
 */
export async function atribuirProtocolo(docId, quando = new Date()) {
  const ano = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
  }).format(quando);

  const configRef = db.collection('configuracoes').doc('sistema');
  const infoRef = db.collection('informativos').doc(docId);

  return db.runTransaction(async (tx) => {
    const [config, info] = await Promise.all([tx.get(configRef), tx.get(infoRef)]);

    if (!info.exists) throw new Error('Informativo nao encontrado.');

    // Ja tem protocolo: nao renumera. Protege contra duplo clique e reprocesso.
    if (info.data().protocolo) return info.data().protocolo;

    const contador = (config.exists && config.data().contadorProtocolo) || {};
    const proximo = (contador[ano] || 0) + 1;
    const protocolo = `FAMP-${ano}-${String(proximo).padStart(4, '0')}`;

    tx.set(
      configRef,
      { contadorProtocolo: { ...contador, [ano]: proximo } },
      { merge: true }
    );
    tx.update(infoRef, { protocolo });

    return protocolo;
  });
}
