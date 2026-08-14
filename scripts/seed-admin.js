/**
 * Bootstrap do primeiro administrador.
 *
 * Sem isto ninguem entra: a whitelist so e editavel por admin e nasce vazia.
 * O Admin SDK ignora as security rules, o que resolve o problema do ovo e da
 * galinha.
 *
 * Uso:  npm run seed
 */

// Precisa vir antes de firebaseAdmin.js: o Admin SDK le process.env ao ser
// importado, e os imports do ESM sao avaliados nesta ordem.
import '../api/_lib/carregarEnv.js';
import { db, FieldValue } from '../api/_lib/firebaseAdmin.js';
import { dominioPermitido, normalizarEmail } from '../api/_lib/dominio.js';

const PADROES_MIDIA = `ESPECIFICACOES PARA AS TVs DO CAMPUS

Formato          1920 x 1080 pixels (Full HD, horizontal)
Imagem           JPG ou PNG, ate 15 MB (ideal: ate 3 MB)
Video            MP4 (H.264), ate 30 segundos, ate 70 MB (ideal: ate 20 MB)
PDF              Uma unica pagina, em paisagem, proporcao 16:9, ate 20 MB
Audio            O arquivo NAO pode ter audio. As TVs do campus nao reproduzem som.
Fala no video    Se houver narracao ou fala, ela precisa estar legendada na tela.
Legibilidade     Texto grande e de alto contraste — precisa ser lido a 3 metros.`;

const CONFIG_SISTEMA = {
  antecedenciaMinimaDias: 2,
  limiteSimultaneos: 10,
  limiteImagemMB: 15,
  limiteVideoMB: 70,
  limitePdfMB: 20,
  duracaoExibicaoPadraoSegundos: 15,
  retencaoArquivoDias: 45,
  limiteEnviosPorDia: 10,
  emailsNotificacao: [],
  contadorProtocolo: {},
};

async function main() {
  const email = normalizarEmail(process.env.BOOTSTRAP_ADMIN_EMAIL);

  if (!email) {
    console.error('BOOTSTRAP_ADMIN_EMAIL nao definido no .env.local.');
    process.exit(1);
  }

  if (!dominioPermitido(email)) {
    console.error(
      `"${email}" viola a politica de dominio. Use um e-mail institucional ou ` +
        'adicione a excecao em api/_lib/dominio.js, src/utils/dominio.js e nas rules.'
    );
    process.exit(1);
  }

  // 1. Administrador na whitelist
  const ref = db.collection('usuarios_autorizados').doc(email);
  const existente = await ref.get();

  await ref.set(
    {
      email,
      perfil: 'admin',
      ativo: true,
      adicionadoPor: 'seed',
      adicionadoEm: existente.exists
        ? existente.data().adicionadoEm
        : FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(
    existente.exists
      ? `Administrador atualizado: ${email}`
      : `Administrador criado: ${email}`
  );

  // 2. Configuracoes do sistema (nao sobrescreve valores ja ajustados)
  const sistemaRef = db.collection('configuracoes').doc('sistema');
  const sistema = await sistemaRef.get();

  if (!sistema.exists) {
    await sistemaRef.set(CONFIG_SISTEMA);
    console.log('configuracoes/sistema criado com os valores padrao.');
  } else {
    const faltando = Object.fromEntries(
      Object.entries(CONFIG_SISTEMA).filter(([chave]) => !(chave in sistema.data()))
    );
    if (Object.keys(faltando).length) {
      await sistemaRef.set(faltando, { merge: true });
      console.log(
        `configuracoes/sistema completado com: ${Object.keys(faltando).join(', ')}`
      );
    } else {
      console.log('configuracoes/sistema ja estava completo.');
    }
  }

  // 3. Texto publico dos padroes de midia (a pagina /padroes abre sem login)
  const publicoRef = db.collection('configuracoes').doc('publico');
  const publico = await publicoRef.get();

  if (!publico.exists) {
    await publicoRef.set({ textoPadroesMidia: PADROES_MIDIA });
    console.log('configuracoes/publico criado.');
  } else {
    console.log('configuracoes/publico ja existia.');
  }

  console.log('\nPronto. Entre no sistema com esse e-mail para concluir o cadastro.');
  process.exit(0);
}

main().catch((erro) => {
  console.error('Falha no seed:', erro.message);
  process.exit(1);
});
