/**
 * Carrega as variaveis de ambiente para execucao LOCAL (seed, scripts, testes).
 *
 * Precisa existir como modulo separado porque os imports do ESM sao avaliados
 * na ordem em que aparecem: importar este arquivo antes de firebaseAdmin.js
 * garante que process.env ja esteja preenchido quando o Admin SDK inicializa.
 *
 * `import 'dotenv/config'` sozinho NAO resolve: ele le apenas `.env`, e as
 * credenciais deste projeto ficam em `.env.local` (que e o arquivo ignorado
 * pelo git).
 *
 * Na Vercel isto e inofensivo — os arquivos nao existem e as variaveis vem da
 * plataforma.
 */

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
