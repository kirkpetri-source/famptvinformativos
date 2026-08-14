# FAMP TV Informativos — contexto do projeto

Sistema interno da **Faculdade Morgana Potrich (FAMP)**, em Mineiros-GO, para
professores e colaboradores enviarem informativos (arte ou vídeo) que vão para as
TVs dos campi, e para a administração programá-los no CMS das telas.

Construído pela Lion Tech no contexto da parceria de mídia indoor com a FAMP.

Leia também `ESTADO.md` para saber onde o projeto está agora.

---

## O que o sistema é

Dois lados de um mesmo fluxo:

- **Quem envia** (colaborador da FAMP): identifica-se, anexa a arte dentro do
  padrão das TVs e define o período de veiculação.
- **Quem recebe** (administração): é avisada por e-mail e trabalha na Fila de
  Programação — baixa o arquivo já renomeado no padrão, copia os metadados
  prontos para o CMS, marca como programado e é lembrada de retirar no fim.

**O que ele NÃO faz**: não integra com o CMS das TVs (Xibo), não publica nada
automaticamente e não segmenta por campus. É um canal de entrada organizado e
auditável.

---

## Regras duras

- **Nada de "Lion Tech" na interface.** Para o usuário final, este é um sistema
  da FAMP. A única exceção autorizada é o domínio do remetente de e-mail
  (`envios.liontechti.com.br`), decidida pelo Kirk em 14/08/2026.
- **Auditoria é imutável.** Nenhuma tela apaga informativo. Para tirar do ar
  existe o status `cancelado`. Exclusão só por script do Admin SDK, e o
  `limpar-teste.js` se recusa a apagar envio real.
- **Contas de teste** estão marcadas com `REMOVER ANTES DE ENTREGAR` em quatro
  arquivos. `grep -r "REMOVER ANTES" .` acha todos.
- Não subir credencial para o Git. `.env.local` está no `.gitignore`.

---

## Decisões de arquitetura que não são óbvias

**Datas de veiculação são string `YYYY-MM-DD`, não timestamp.** São datas civis.
Como timestamp, `new Date('2026-08-15')` em UTC-3 vira 14/08 às 21h e o
informativo entra ou sai do ar no dia errado. Comparação lexicográfica de
`YYYY-MM-DD` é cronologicamente correta.

**O status `programado` existe porque o sistema não fala com o CMS.** Sem esse
passo manual, "no ar" seria suposição por data e a auditoria mentiria. Só
`programado` vira `no_ar` pelo cron.

**O uid está no caminho do Storage** (`informativos/{uid}/{ano}/{mes}/{docId}/`).
A versão anterior perguntava ao Firestore de quem era a pasta via
`firestore.get()` nas regras do Storage: regras cruzadas exigem uma permissão IAM
no agente de serviço do Cloud Storage que não vem habilitada, e o upload falhava
com 403 sem explicação.

**O perfil de admin viaja no token como custom claim**, porque as regras do
Storage não conseguem ler o Firestore. A whitelist continua sendo a fonte de
verdade; o claim é espelho, escrito só por `api/_lib/claims.js`. Rebaixar revoga
os tokens na hora; promover não derruba a sessão.

**A URL do arquivo nunca é gravada no banco.** `getDownloadURL()` devolve um
token que não expira e ignora as regras. Resolver sob demanda no cliente; no
servidor, Signed URL V4.

---

## Acesso: duas camadas com papéis diferentes

1. **Domínio** define quem pode existir: `@fampfaculdade.com.br` mais exceções
   nominais.
2. **Whitelist** (`usuarios_autorizados`) define quem pode usar.

Aplicado em quatro lugares, porque cada um sozinho é contornável: cliente,
regras do Firestore, regras do Storage e funções da API. Ao mudar a política,
mude em `src/utils/dominio.js`, `api/_lib/dominio.js`, `firestore.rules` e
`storage.rules`.

---

## Armadilhas já pagas neste projeto

- `dotenv/config` lê só `.env`, nunca `.env.local`. Use `api/_lib/carregarEnv.js`,
  importado **antes** de `firebaseAdmin.js` — a ordem dos imports ESM importa.
- `vercel env add` com `spawnSync({input})` grava a variável **vazia**. Use
  redirecionamento de arquivo: `vercel env add NOME production < arquivo`.
- A chave privada do Firebase precisa ir para a Vercel com **quebras de linha
  reais**. Com `\n` literal dá `Invalid PEM formatted message`.
- Variáveis criadas como *Sensitive* não voltam no `vercel env pull` — vir vazio
  ali não significa que estão vazias.
- Há outros Vite nesta máquina em 5173-5176. Este projeto usa **5190** com
  `strictPort`, para não abrir o sistema errado por engano.
- Índices do Firestore que só falham em execução real (cron e API), nunca no
  build: já estão em `firestore.indexes.json`. Ao criar consulta nova, rode o
  cron e confira `erros`.
- CSV: BOM `﻿` e prefixo `'` em campo iniciado por `=`, `+`, `-`, `@`.
- E-mail: escapar HTML de tudo que vem do banco.

---

## Comandos

```bash
npm run dev            # porta 5190
npm run build
npm test               # datas, arquivos e mídia

npm run seed           # primeiro admin + configurações padrão

node scripts/acesso.js listar
node scripts/acesso.js liberar fulano@fampfaculdade.com.br colaborador
node scripts/acesso.js remover email@teste.com

node scripts/diagnostico-upload.js <email>        # isola 403 no Storage
node scripts/diagnostico-notificacao.js <email>   # testa a cadeia de e-mails
node scripts/limpar-teste.js --todos-os-testes

firebase deploy --only firestore:rules,firestore:indexes,storage
vercel deploy --prod --yes
```

---

## Estilo

- Português do Brasil na interface e nos comentários.
- Sem emoji em lugar nenhum.
- Interface: sem sidebar, hierarquia por régua de 1px e espaço, sombra só no que
  flutua, botões em pílula. A lista completa de proibições está em `src/index.css`.
- Tipografia: Nunito (display, ecoa o logotipo da FAMP), Inter (corpo),
  IBM Plex Mono (dados técnicos).
- Cores amostradas do arquivo da logo: laranja `#F09820`, marrom `#300800`.
