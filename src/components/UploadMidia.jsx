import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X } from 'lucide-react';
import { analisarArquivo, ACCEPT_DROPZONE, formatarBytes } from '../utils/midia.js';
import { comprimirImagem } from '../utils/comprimirImagem.js';
import MolduraTV from './MolduraTV.jsx';

/**
 * Escolha do arquivo, com validacao ANTES de subir qualquer byte.
 *
 * Ordem: comprime imagem -> analisa -> mostra na moldura. A compressao vem
 * primeiro porque e o arquivo comprimido que sera enviado, e e dele que as
 * dimensoes precisam ser lidas.
 */
export default function UploadMidia({ aoEscolher, limites, erroExterno }) {
  const [arquivo, setArquivo] = useState(null);
  const [analise, setAnalise] = useState(null);
  const [url, setUrl] = useState(null);
  const [bloqueio, setBloqueio] = useState(null);
  const [otimizacao, setOtimizacao] = useState(null);
  const [processando, setProcessando] = useState(false);

  // A URL de objeto e liberada quando o arquivo muda ou o componente sai.
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const limpar = useCallback(() => {
    setArquivo(null);
    setAnalise(null);
    setBloqueio(null);
    setOtimizacao(null);
    setUrl((atual) => {
      if (atual) URL.revokeObjectURL(atual);
      return null;
    });
    aoEscolher(null);
  }, [aoEscolher]);

  const processar = useCallback(
    async (aceitos) => {
      const escolhido = aceitos[0];
      if (!escolhido) return;

      setProcessando(true);
      setBloqueio(null);
      setOtimizacao(null);

      try {
        const { arquivo: final, otimizado, tamanhoOriginal } = await comprimirImagem(escolhido);

        if (otimizado) {
          setOtimizacao(
            `Imagem otimizada de ${formatarBytes(tamanhoOriginal)} para ${formatarBytes(
              final.size
            )}.`
          );
        }

        const resultado = await analisarArquivo(final, limites);

        if (resultado.bloqueio) {
          setBloqueio(resultado.bloqueio);
          setArquivo(null);
          setAnalise(null);
          aoEscolher(null);
          return;
        }

        setUrl((atual) => {
          if (atual) URL.revokeObjectURL(atual);
          return URL.createObjectURL(final);
        });
        setArquivo(final);
        setAnalise(resultado);
        aoEscolher({ arquivo: final, analise: resultado });
      } finally {
        setProcessando(false);
      }
    },
    [aoEscolher, limites]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: processar,
    accept: ACCEPT_DROPZONE,
    multiple: false,
    maxFiles: 1,
  });

  return (
    <div>
      {!arquivo ? (
        <div
          {...getRootProps()}
          className={`upload ${isDragActive ? 'upload--ativo' : ''} ${
            bloqueio || erroExterno ? 'upload--erro' : ''
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud size={28} className="upload__icone" />
          <p style={{ fontWeight: 600 }}>
            {processando
              ? 'Analisando o arquivo…'
              : isDragActive
              ? 'Solte o arquivo aqui'
              : 'Arraste o arquivo ou clique para escolher'}
          </p>
          <p className="secundario mt-2">JPG, PNG, MP4 ou PDF · 1920 × 1080</p>
        </div>
      ) : (
        <div>
          <div className="linha linha--entre mb-4">
            <span className="meta meta--nao-caixa crescer" style={{ wordBreak: 'break-all' }}>
              {arquivo.name}
            </span>
            <button type="button" className="btn btn--secundario" onClick={limpar} style={{ minHeight: 32 }}>
              <X size={16} />
              Trocar
            </button>
          </div>

          <MolduraTV
            url={url}
            tipo={arquivo.type}
            analise={analise}
            nomeArquivo={arquivo.name}
            tamanhoBytes={arquivo.size}
          />
        </div>
      )}

      {bloqueio ? (
        <div className="aviso aviso--erro mt-4" role="alert">
          <span>{bloqueio}</span>
        </div>
      ) : null}

      {otimizacao ? (
        <p className="secundario mt-2">{otimizacao}</p>
      ) : null}

      {analise?.dicaPeso ? (
        <p className="secundario mt-2">{analise.dicaPeso}</p>
      ) : null}
    </div>
  );
}
