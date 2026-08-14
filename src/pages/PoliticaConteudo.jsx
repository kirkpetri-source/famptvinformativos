import { Link } from 'react-router-dom';
import { Rodape } from '../components/Layout.jsx';

/**
 * Rota publica.
 *
 * Rejeitar um informativo "porque nao achei adequado" nao se sustenta numa
 * faculdade. Precisa existir regra publicada, e o motivo da rejeicao aponta
 * para ela.
 */
export default function PoliticaConteudo() {
  return (
    <>
      <header className="topbar">
        <div className="topbar__interno">
          <Link to="/" className="topbar__logo">
            <img src="/famp-logo.png" alt="FAMP — Faculdade Morgana Potrich" />
          </Link>
          <div className="crescer" />
          <Link to="/entrar" className="btn btn--secundario" style={{ minHeight: 32 }}>
            Entrar
          </Link>
        </div>
      </header>

      <main className="container container--estreito prosa">
        <h1>Política de conteúdo</h1>
        <p className="secundario mt-2 mb-8">
          As TVs dos campi são um canal institucional da FAMP. O que aparece nelas fala em
          nome da faculdade.
        </p>

        <h2>O que não pode ser exibido</h2>
        <ul>
          <li>
            <strong>Publicidade de terceiros.</strong> Conteúdo comercial de empresas sem
            convênio com a FAMP, incluindo divulgação de negócios próprios ou de
            familiares.
          </li>
          <li>
            <strong>Conteúdo político-partidário, religioso ou de campanha eleitoral.</strong>
          </li>
          <li>
            <strong>Dados pessoais de alunos, pacientes ou colaboradores</strong> — nome
            completo, matrícula, CPF, foto identificável sem autorização escrita, e
            qualquer informação de saúde.
          </li>
          <li>
            <strong>Material que se apresente como comunicado oficial sem ser</strong>, ou
            que não tenha identificação do setor responsável.
          </li>
          <li>
            <strong>Informação errada ou desatualizada</strong> — data de evento já
            passada, edital revogado, valor antigo.
          </li>
          <li>
            <strong>Material de terceiros sem licença</strong> — imagem de banco pago,
            trilha sonora, personagem ou marca registrada.
          </li>
        </ul>

        <h2>Como funciona a análise</h2>
        <p>
          Todo informativo passa por análise antes de ir para as telas. Se for recusado,
          você recebe um e-mail com o motivo e pode corrigir e enviar de novo pelo próprio
          sistema.
        </p>

        <h2>Motivos de recusa</h2>
        <ul>
          <li>
            <strong>Fora do padrão técnico</strong> — resolução, duração, áudio ou peso
            fora do especificado nos{' '}
            <Link to="/padroes" className="btn--texto">
              padrões de mídia
            </Link>
            .
          </li>
          <li>
            <strong>Contraria a política de conteúdo</strong> — algum dos itens listados
            acima.
          </li>
          <li>
            <strong>Período de veiculação inviável</strong> — datas no passado ou prazo
            insuficiente para programar.
          </li>
          <li>
            <strong>Informativo duplicado</strong> — o mesmo material já foi enviado.
          </li>
        </ul>

        <h2>Responsabilidade</h2>
        <p>
          Quem envia responde pelo conteúdo enviado. O sistema registra o autor, a data e
          o arquivo de cada envio, e esse registro é mantido para auditoria interna.
        </p>
      </main>

      <Rodape />
    </>
  );
}
