# Estado do projeto

Última atualização: **16/08/2026**

Status: **no ar em produção, em fase de teste dos fluxos**

---

## Onde está

| | |
|---|---|
| Produção | https://famptvinformativos.vercel.app |
| Repositório | https://github.com/kirkpetri-source/famptvinformativos (privado) |
| Firebase | projeto `famp-tv-informativos`, conta kirkpetri@gmail.com |
| Vercel | projeto `famptvinformativos`, org lion-techs-projects |
| Local | `C:\Users\Predator\Documents\Sistemas construidos\famp-tv-informativos` |
| Dev local | porta **5190** (`strictPort`) |

Credenciais existem, mas não estão neste arquivo nem no vault. A chave do Admin
SDK fica em `C:\Users\Predator\Documents\credenciais\`; as variáveis de produção
estão só na Vercel, como *Sensitive*.

---

## Concluído e verificado

**Infraestrutura**
- Projeto Firebase criado, plano Blaze, Firestore e Storage em `southamerica-east1`
- Google Sign-In ativo; domínio da Vercel autorizado
- Regras de Firestore e Storage publicadas; 12 índices compostos
- Deploy na Vercel com 15 variáveis de ambiente
- Cron diário agendado para 03:00 de Brasília

**Fluxo de quem envia**
- Login com Google, trava de domínio, whitelist, primeiro acesso com LGPD e política de conteúdo
- Validação de mídia no navegador antes do upload: dimensão, orientação, duração, faixa de áudio
- Compressão automática de imagem acima de 1,5 MB
- Moldura de TV com área segura; upload com progresso; declarações por tipo de arquivo
- Histórico próprio e reenvio corrigido

**Fluxo de quem recebe**
- Fila de Programação com modo foco, atalhos de teclado e bloco de dados para o CMS
- Download com nome padronizado, ações em lote e manifesto CSV
- Fila de retirada, Grade de Exibição, lista completa e detalhe
- Relatório de auditoria com 7 colunas e detalhe expansível; exportação CSV e PDF

**Notificações** (verificadas em produção, HTTP 200)
- Colaborador envia: recebe confirmação de recebimento
- Colaborador envia: administração recebe o aviso com anexo ou link assinado
- Administração decide: colaborador recebe aprovação, recusa ou cancelamento
- Resumo diário no cron, que não envia quando não há nada a fazer

**Segurança verificada com token de usuário real**
- Upload do dono na própria pasta: 200
- Upload de colaborador na pasta de outro: 403
- Cron sem token: 401
- Claim `admin` ausente em colaborador

---

## Pendente

**Do Kirk**
- **Ativar o login por redirect na mesma origem** (o que faz o celular funcionar
  em Safari e Firefox). Dois passos, nesta ordem:
  1. Google Cloud Console → APIs e serviços → Credenciais → cliente OAuth 2.0 do
     projeto → URIs de redirecionamento autorizados → acrescentar
     `https://famptvinformativos.vercel.app/__/auth/handler`. Não remover o
     `https://famp-tv-informativos.firebaseapp.com/__/auth/handler`.
  2. Na Vercel, trocar `VITE_FIREBASE_AUTH_DOMAIN` para
     `famptvinformativos.vercel.app` e redeployar.
  O proxy de `/__/auth` já está no `vercel.json`. Sem o passo 1 o login para com
  `redirect_uri_mismatch`.
- Passar pelos seis passos do fluxo real em produção e reportar o que quebrar
- Tirar do spam o remetente `informativos@envios.liontechti.com.br` e criar filtro
  no Gmail com "Nunca enviar para Spam" e "Sempre marcar como importante" — é o
  que faz a notificação chegar no celular
- Decidir se substitui a logo por uma versão oficial em vetor (a atual foi
  recortada de um JPG 900x900)

**Antes de entregar à FAMP**
- Remover a conta de teste `liontech.sup@gmail.com`: `grep -r "REMOVER ANTES" .`
  acha os quatro pontos, depois `firebase deploy --only firestore:rules,storage`
  e `node scripts/acesso.js remover liontech.sup@gmail.com`
- Liberar os e-mails reais dos colaboradores em Acessos
- Avaliar trocar o remetente para um subdomínio da FAMP
  (`informativos.fampfaculdade.com.br`), que depende da TI da faculdade

**Qualidade de produção, da seção 20 do prompt, ainda não feita**
- Projeto Firebase separado para desenvolvimento (hoje preview e produção
  apontam para o mesmo)
- Testes automatizados das security rules no emulador
- Deploy das regras por CI ao dar merge na `main`
- Export agendado do Firestore, com restauração testada uma vez
- Captura de erro do cliente e das funções em algum lugar que se olha

---

## Decisões tomadas

- **16/08/2026** — Login no celular passa a usar `signInWithRedirect`; popup fica
  só no desktop. Popup depende de `postMessage` entre abas, que o
  Cross-Origin-Opener-Policy da página do Google corta — no celular a aba ficava
  branca. Removido também o parâmetro `hd`, que o Google trata como filtro e que
  travava as contas de exceção.
- **14/08/2026** — Remetente dos e-mails fica em `envios.liontechti.com.br`.
  Autorizado pelo Kirk: a associação com a Lion Tech confirma a parceria com a
  FAMP no mesmo serviço.
- **14/08/2026** — Sem notificação por WhatsApp. CallMeBot tem cota gratuita
  baixa demais, e a API oficial da Meta exige conta comercial com número
  dedicado e cobra por mensagem. Fica só e-mail. Código do provedor removido em
  vez de deixado desligado; está no histórico do Git se valer retomar.
- **14/08/2026** — Vídeo até 70 MB, imagem 15 MB, PDF 20 MB, teto do Storage 80 MB.
- **14/08/2026** — Arquivo apagado 45 dias após o fim da veiculação; o registro
  do envio permanece. Prazo escrito na página de privacidade.
- **14/08/2026** — Sem segmentação por campus. O fluxo é direto.
- **14/08/2026** — Removido o "teste de 3 metros" da moldura de TV.

---

## Referências

- `CLAUDE.md` — contexto técnico e armadilhas já pagas
- `README.md` — instalação e implantação
- `docs/OPERACAO.md` — runbook: o que fazer quando algo dá errado
- Prompt de origem: `C:\Users\Predator\Desktop\prompt-sistema-famp-tv-v2.md`
