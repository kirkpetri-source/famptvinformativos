# FAMP TV Informativos

Sistema interno da Faculdade Morgana Potrich para envio e gerenciamento dos informativos
exibidos nas TVs dos campi.

O sistema tem dois lados. **Quem envia**: professores e colaboradores mandam a arte,
identificam-se e definem o período de veiculação, dentro de um padrão técnico que o
sistema ensina e verifica. **Quem recebe**: a administração é avisada por e-mail e
trabalha numa fila de programação — baixa o arquivo já renomeado no padrão, copia os
metadados prontos para o CMS das TVs, marca como programado e é lembrada de retirar no fim
do período.

O sistema não integra com o CMS das TVs e não publica nada automaticamente. Ele é um canal
de entrada organizado e auditável.

---

## Padrão das mídias

| | |
|---|---|
| Formato | 1920 × 1080 pixels (Full HD, horizontal) |
| Imagem | JPG ou PNG, até 15 MB |
| Vídeo | MP4 (H.264), até 30 segundos, até 70 MB |
| PDF | Uma única página, em paisagem, até 20 MB |
| Áudio | Não pode ter. As TVs não reproduzem som. |
| Fala no vídeo | Precisa estar legendada na imagem |

Imagens acima de 1,5 MB são reamostradas no navegador antes do envio.

## Acesso

Apenas e-mails `@fampfaculdade.com.br`, mais uma exceção nominal para a conta da
administração. Estar no domínio não basta: o acesso precisa ser liberado na tela de
Acessos. As duas camadas são aplicadas no cliente, nas regras do Firestore, nas regras do
Storage e nas funções da API.

---

## Rodando localmente

```bash
npm install
cp .env.example .env.local     # preencha os valores
npm run seed                   # cria o primeiro administrador
npm run dev
```

### Com os emuladores do Firebase

Desenvolver contra produção polui a auditoria real. Para trabalhar isolado:

```bash
firebase emulators:start       # auth, firestore e storage
# em .env.local: VITE_USAR_EMULADORES=true
```

### Testes

```bash
npm test                       # funções puras de data, arquivo e mídia
```

---

## Implantação

1. **Firebase** — crie o projeto (dev e prod separados). O Storage exige plano Blaze,
   mesmo dentro da franquia gratuita; configure um alerta de orçamento de R$ 5 no Google
   Cloud.
2. **Autenticação** — habilite o provedor Google e adicione o domínio de produção em
   *Authorized domains*.
3. **Regras e índices**:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```
   Sem os índices, todos os filtros do painel falham em produção.
4. **Seed** — `npm run seed` com `BOOTSTRAP_ADMIN_EMAIL` preenchido. Sem isso ninguém
   entra: a whitelist só é editável por admin e nasce vazia.
5. **Resend** — verifique um domínio próprio. Sem domínio verificado, o Resend só entrega
   para o dono da conta: o aviso à administração funciona, mas o e-mail de decisão **não
   chega ao professor**.
6. **Vercel** — conecte o repositório e configure as variáveis de ambiente. Aponte o
   ambiente *Preview* para o projeto Firebase de desenvolvimento.
7. **Logo** — substitua `public/famp-logo.png` pela versão oficial para fundo claro
   (laranja sobre transparente). A logo atual é a de fundo escuro.

---

## Estrutura

```
src/
  components/   Layout, MolduraTV, GradeExibicao, ReguaTempo, UploadMidia…
  pages/        Login, EnviarInformativo, Programacao, Dashboard, Relatorio…
  services/     firebase, auth, informativos, storage, usuarios, configuracoes, api
  utils/        dominio, datas, midia, arquivos, comprimirImagem, exportar, status
api/
  _lib/         firebaseAdmin, autenticar, protocolo, email, emailTemplates, escapar
  notificar-envio.js      protocolo + e-mail à administração
  notificar-decisao.js    e-mail ao remetente
  atualizar-status.js     cron diário: transições, expurgo e resumo
scripts/
  seed-admin.js           bootstrap do primeiro administrador
```

## Ciclo de vida de um informativo

```
rascunho → pendente → aprovado → programado → no_ar → expirado
                   ↘ rejeitado
qualquer status ativo → cancelado
```

`programado` existe porque o sistema não fala com o CMS das TVs. Sem esse passo, "no ar"
seria uma suposição por data e a auditoria mentiria.

## Stack

React 18 + Vite · Firebase (Auth, Firestore, Storage) · Vercel Functions · Resend

## Operação

Consulte [docs/OPERACAO.md](docs/OPERACAO.md) para o que fazer quando algo dá errado.
