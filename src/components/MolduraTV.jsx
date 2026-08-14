import { useState } from 'react';
import { FileText, ExternalLink, Grid2x2 } from 'lucide-react';
import { timecode } from '../utils/datas.js';
import { formatarBytes, TEXTO_PROBLEMA } from '../utils/midia.js';

/**
 * Elemento assinatura B — "Como vai aparecer na TV".
 *
 * O preview vive dentro de uma moldura 16:9 preta. Arquivo fora do padrao
 * aparece encaixado como apareceria de fato na tela, com as tarjas pretas
 * visiveis: o professor ve as tarjas e entende sozinho, sem ler instrucao.
 *
 * Traz do vocabulario de broadcast a area segura (title safe, 90%): a faixa
 * onde o texto pode ficar sem risco de encostar na borda e sumir de longe.
 *
 * Esta e a unica parte do sistema onde existe preto. Ela e a TV.
 */
export default function MolduraTV({
  url,
  tipo,
  analise,
  nomeArquivo,
  tamanhoBytes,
  compacta = false,
}) {
  const [areaSegura, setAreaSegura] = useState(false);

  const ehImagem = tipo?.startsWith('image/');
  const ehVideo = tipo === 'video/mp4';
  const ehPdf = tipo === 'application/pdf';

  const conforme = analise?.conformidade?.conforme;
  const problemas = analise?.conformidade?.problemas || [];
  const naoVerificavel = problemas.includes('nao_verificavel');

  return (
    <div className="tv">
      <div className="tv__tela">
        {!url ? (
          <p className="tv__vazio">O preview aparece aqui depois que você escolher o arquivo.</p>
        ) : ehImagem ? (
          <img src={url} alt="Pré-visualização do informativo" />
        ) : ehVideo ? (
          // Sem autoplay e sem som: as TVs nao reproduzem audio, e o preview
          // nao deve sugerir que reproduzem.
          <video src={url} controls muted playsInline preload="metadata" />
        ) : ehPdf ? (
          <div className="tv__pdf">
            <FileText size={32} aria-hidden="true" />
            <p className="meta meta--nao-caixa" style={{ color: 'inherit' }}>
              {nomeArquivo}
            </p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="btn btn--secundario"
              style={{ background: 'rgba(255,255,255,.1)', borderColor: 'rgba(255,255,255,.3)', color: '#fff' }}
            >
              <ExternalLink size={16} />
              Abrir PDF
            </a>
          </div>
        ) : null}

        {areaSegura && url ? <div className="tv__area-segura" /> : null}
      </div>

      {url && !compacta ? (
        <div className="tv__controles">
          <button
            type="button"
            className="btn btn--secundario"
            aria-pressed={areaSegura}
            onClick={() => setAreaSegura((v) => !v)}
            style={{ minHeight: 34 }}
          >
            <Grid2x2 size={16} />
            Área segura
          </button>
        </div>
      ) : null}

      {analise ? (
        <div
          className={`tv__estado ${
            conforme ? 'tv__estado--conforme' : 'tv__estado--problema'
          }`}
        >
          <span
            className={`tv__veredito ${
              conforme ? 'tv__veredito--conforme' : 'tv__veredito--problema'
            }`}
          >
            {conforme
              ? 'Dentro do padrão das TVs'
              : naoVerificavel && problemas.length === 1
              ? 'Formato não verificável automaticamente — confirme abaixo'
              : problemas.map((p) => TEXTO_PROBLEMA[p] || p).join(' · ')}
          </span>

          <FichaTecnica
            analise={analise}
            tipo={tipo}
            tamanhoBytes={tamanhoBytes}
          />
        </div>
      ) : null}
    </div>
  );
}

export function FichaTecnica({ analise, tipo, tamanhoBytes }) {
  const dados = [];

  if (analise?.largura && analise?.altura) {
    dados.push(`${analise.largura} × ${analise.altura}`);
  }
  if (tipo) dados.push(extensaoLegivel(tipo));
  if (analise?.duracaoSegundos) dados.push(timecode(analise.duracaoSegundos));
  if (tamanhoBytes) dados.push(formatarBytes(tamanhoBytes));
  if (analise?.temAudio === true) dados.push('COM ÁUDIO');
  else if (analise?.temAudio === false) dados.push('SEM ÁUDIO');

  if (!dados.length) return null;

  return <span className="meta">{dados.join('  ·  ')}</span>;
}

function extensaoLegivel(tipo) {
  if (tipo === 'image/jpeg') return 'JPG';
  if (tipo === 'image/png') return 'PNG';
  if (tipo === 'video/mp4') return 'MP4';
  if (tipo === 'application/pdf') return 'PDF';
  return tipo;
}
