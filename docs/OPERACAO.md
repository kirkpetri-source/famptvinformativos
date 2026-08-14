# Runbook — FAMP TV Informativos

O que fazer quando algo dá errado. Meia página por cenário, para que outra pessoa consiga
assumir o sistema.

---

## O e-mail de um envio não chegou

**Sintoma**: o professor diz que enviou, o informativo aparece no painel, mas nenhum
e-mail chegou.

1. Abra o informativo. Se o **protocolo estiver vazio**, a chamada à API falhou — o cron
   das 03:00 gera o protocolo e reenvia sozinho.
2. Confira `RESEND_API_KEY` e `RESEND_FROM` nas variáveis da Vercel.
3. Veja os logs da função em Vercel → Deployments → Functions → `notificar-envio`.
4. **Causa mais comum**: domínio não verificado no Resend. Sem verificação, o Resend só
   entrega para o e-mail dono da conta.
5. O envio em si não se perde nunca: o arquivo já está no Storage e o informativo está no
   painel. O e-mail é aviso, não canal de entrega.

## O professor não recebeu a resposta de aprovação ou recusa

Quase sempre é o mesmo problema do item anterior: domínio não verificado no Resend. Até a
verificação, avise o professor por WhatsApp — o número está no detalhe do informativo, com
link direto.

## O arquivo não subiu

**Sintoma**: o professor diz que enviou, mas nada aparece no painel.

1. O documento ficou como `rascunho` e é invisível de propósito — evita informativo sem
   arquivo na fila.
2. Peça para reenviar. O cron apaga rascunhos com mais de 24 horas junto com os arquivos.
3. Se acontecer sempre com a mesma pessoa: confira o tamanho do arquivo e a rede. Vídeo de
   70 MB em 4G instável falha com frequência.
4. Erro de permissão no console do navegador indica regra do Storage: confirme que o
   `firebase deploy --only storage` foi feito depois da última alteração em
   `storage.rules`.

## O cron não rodou

**Sintoma**: informativo com data de início de ontem continua como `programado`, ou o
resumo diário não chegou.

1. Vercel → Settings → Cron Jobs: confira se `/api/atualizar-status` está listado e
   habilitado.
2. Confira se `CRON_SECRET` existe nas variáveis de ambiente. Sem ela a função devolve
   401 e o cron falha silenciosamente.
3. No Firestore, a coleção `logs_sistema` tem um registro por execução, com data e
   contagens. É a forma mais rápida de saber se rodou.
4. Para rodar na mão:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://SEU-APP.vercel.app/api/atualizar-status
   ```
5. **Lembre**: plano gratuito da Vercel permite uma execução por dia, em horário
   aproximado. E o path do cron não pode ter query string — a Vercel ignora e a função
   nunca dispara.

## Um professor perdeu o acesso

1. Tela **Acessos**. Se o e-mail estiver como *Desativado*, clique em **Reativar**.
2. Se não estiver na lista, libere o acesso com o e-mail institucional e o perfil.
3. Se a pessoa vê "Este sistema aceita apenas e-mails institucionais", ela entrou com uma
   conta pessoal — peça para trocar de conta no Google.
4. Se vê "Seu acesso ainda não foi autorizado", o e-mail está certo mas fora da whitelist.

## Preciso mudar o padrão de mídia

**Configurações** → *Texto dos padrões de mídia*. O texto aparece na página pública
`/padroes` e no e-mail de recusa técnica. Não precisa de deploy.

Os **limites de tamanho** também são configuráveis na mesma tela. Acima de 80 MB é preciso
alterar `storage.rules` e publicar — a regra tem teto fixo porque não consegue ler
configuração.

## Preciso restaurar um backup

1. Backups: Google Cloud Console → Firestore → Import/Export.
2. Restaure sempre para um **projeto separado** primeiro e confira os dados antes de
   sobrescrever produção.
3. Arquivos do Storage não entram no export do Firestore. Um documento restaurado pode
   apontar para um arquivo já expurgado — nesse caso `arquivoExpurgadoEm` está preenchido
   e a interface já trata.
4. Backup nunca testado é backup que não existe: faça uma restauração de teste por ano.

## Um informativo errado foi para as TVs

1. Abra o informativo → **Tirar do ar agora**, com o motivo.
2. **Remova a mídia no CMS das TVs também.** O sistema não faz isso — ele registra a
   decisão e avisa o remetente.
3. O informativo fica como `cancelado` e continua no relatório de auditoria. Nada é
   apagado.

## O loop das TVs está longo demais

O painel avisa quando passa do limite configurado (padrão 10 simultâneos). Para reduzir:

1. **Programação** → veja a Grade de Exibição no painel: barras sobrepostas indicam
   concorrência no mesmo período.
2. Negocie o encurtamento do período com quem enviou, ou cancele o que já cumpriu o
   objetivo.
3. O limite do alerta fica em **Configurações**.

## O armazenamento cresceu demais

1. Firebase Console → Storage → Usage.
2. O cron apaga arquivos 45 dias após o fim da veiculação. Se estiver grande mesmo assim,
   reduza `retencaoArquivoDias` em Configurações — e **ajuste o texto da página
   /privacidade**, que informa esse prazo.
3. Confira se o cron está rodando (`logs_sistema`): expurgo parado é a causa mais provável.

## Alterei as regras de segurança e algo quebrou

```bash
firebase deploy --only firestore:rules,storage    # publica
firebase firestore:rules:release list             # histórico
```

Regra que está no repositório mas não em produção é falsa sensação de segurança. Sempre
publique depois de alterar, e teste com uma conta que **não** deveria ter acesso.
