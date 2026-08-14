import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatarData, formatarDataHora, timecode, diasDePeriodo } from './datas.js';
import { TEXTO_STATUS, MOTIVO_REJEICAO } from './status.js';
import { resumoConformidade } from './midia.js';

/**
 * O que aparece na tabela sem precisar abrir nada.
 *
 * Vinte e cinco colunas na tela nao sao auditoria, sao ruido: ninguem le uma
 * linha que rola de lado. Estas sete respondem "quem mandou o que, para
 * quando, e como esta". O resto abre no detalhe da linha, e a exportacao
 * continua levando tudo — la o excesso nao atrapalha.
 */
export const COLUNAS_PRINCIPAIS = [
  'numero',
  'protocolo',
  'enviadoEm',
  'nome',
  'titulo',
  'periodo',
  'status',
];

export const COLUNAS = [
  { chave: 'numero', titulo: 'Nº' },
  { chave: 'protocolo', titulo: 'Protocolo' },
  { chave: 'enviadoEm', titulo: 'Envio' },
  { chave: 'nome', titulo: 'Nome' },
  { chave: 'cargo', titulo: 'Cargo' },
  { chave: 'email', titulo: 'E-mail' },
  { chave: 'whatsapp', titulo: 'WhatsApp' },
  { chave: 'titulo', titulo: 'Título' },
  { chave: 'arquivo', titulo: 'Arquivo' },
  { chave: 'tipo', titulo: 'Tipo' },
  { chave: 'dimensoes', titulo: 'Dimensões' },
  { chave: 'duracao', titulo: 'Duração' },
  { chave: 'exibicao', titulo: 'Exibição' },
  { chave: 'conformidade', titulo: 'Conformidade' },
  { chave: 'inicio', titulo: 'Início' },
  { chave: 'termino', titulo: 'Término' },
  { chave: 'dias', titulo: 'Dias' },
  { chave: 'prioridade', titulo: 'Prioridade' },
  { chave: 'status', titulo: 'Status' },
  { chave: 'decididoPor', titulo: 'Decidido por' },
  { chave: 'decididoEm', titulo: 'Decidido em' },
  { chave: 'motivo', titulo: 'Motivo' },
  { chave: 'programadoEm', titulo: 'Programado em' },
  { chave: 'referencia', titulo: 'Referência' },
  { chave: 'retiradoEm', titulo: 'Retirado em' },
];

/** Rotulo de cada coluna, para o cabecalho e para o painel de detalhe. */
export const TITULO_COLUNA = Object.fromEntries(
  [...COLUNAS, { chave: 'periodo', titulo: 'Período' }].map((c) => [c.chave, c.titulo])
);

export function montarLinhas(informativos) {
  return informativos.map((i, indice) => ({
    id: i.id,
    numero: indice + 1,
    protocolo: i.protocolo || '',
    enviadoEm: formatarDataHora(i.enviadoEm),
    periodo: `${formatarData(i.dataInicio)} → ${formatarData(i.dataFim)}`,
    nome: i.enviadoPor?.nome || '',
    cargo: i.enviadoPor?.cargo || '',
    email: i.enviadoPor?.email || '',
    whatsapp: i.enviadoPor?.whatsapp || '',
    titulo: i.titulo || '',
    arquivo: i.nomeArquivo || '',
    tipo: i.tipoArquivo || '',
    dimensoes: i.largura ? `${i.largura}x${i.altura}` : '',
    duracao: i.duracaoSegundos ? timecode(i.duracaoSegundos) : '',
    exibicao: i.duracaoExibicaoSegundos ? `${i.duracaoExibicaoSegundos}s` : '',
    conformidade: resumoConformidade(i.conformidade),
    inicio: formatarData(i.dataInicio),
    termino: formatarData(i.dataFim),
    dias: diasDePeriodo(i.dataInicio, i.dataFim),
    prioridade: i.prioridade === 'urgente' ? 'Urgente' : 'Normal',
    status: TEXTO_STATUS[i.status] || i.status,
    decididoPor: i.decididoPor || '',
    decididoEm: formatarDataHora(i.decididoEm),
    motivo: MOTIVO_REJEICAO[i.motivoRejeicao] || '',
    programadoEm: formatarDataHora(i.programadoEm),
    referencia: i.referenciaExterna || '',
    retiradoEm: formatarDataHora(i.retiradoEm),
  }));
}

/**
 * Campo de texto livre iniciado por =, +, - ou @ e executado como formula ao
 * abrir no Excel. Prefixar com apostrofo neutraliza sem alterar a leitura.
 */
function protegerCampo(valor) {
  const texto = String(valor ?? '');
  const perigoso = /^[=+\-@\t\r]/.test(texto);
  const limpo = (perigoso ? `'${texto}` : texto).replace(/"/g, '""');
  return `"${limpo}"`;
}

/**
 * CSV para o Excel brasileiro: separador ponto e virgula e BOM UTF-8.
 * Sem o BOM, todo acento abre corrompido.
 */
export function exportarCSV(informativos, nomeArquivo) {
  const linhas = montarLinhas(informativos);

  const conteudo = [
    COLUNAS.map((c) => protegerCampo(c.titulo)).join(';'),
    ...linhas.map((linha) => COLUNAS.map((c) => protegerCampo(linha[c.chave])).join(';')),
  ].join('\r\n');

  const blob = new Blob([`﻿${conteudo}`], { type: 'text/csv;charset=utf-8' });
  baixar(blob, nomeArquivo);
}

/** PDF paisagem com o cabecalho institucional e os filtros aplicados. */
export async function exportarPDF(informativos, { filtros, nomeArquivo }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const linhas = montarLinhas(informativos);
  const largura = doc.internal.pageSize.getWidth();

  const logo = await carregarLogo();
  if (logo) doc.addImage(logo, 'PNG', 40, 28, 62, 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(45, 26, 6);
  doc.text('Relatório de Auditoria — TV Informativos', logo ? 116 : 40, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(91, 98, 112);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, logo ? 116 : 40, 58);

  const descricaoFiltros = descreverFiltros(filtros);
  doc.text(`Filtros: ${descricaoFiltros}`, logo ? 116 : 40, 70);
  doc.text(`${linhas.length} registro(s)`, largura - 40, 58, { align: 'right' });

  autoTable(doc, {
    startY: 86,
    head: [COLUNAS.map((c) => c.titulo)],
    body: linhas.map((linha) => COLUNAS.map((c) => String(linha[c.chave] ?? ''))),
    styles: { fontSize: 6, cellPadding: 3, textColor: [74, 44, 10], overflow: 'linebreak' },
    headStyles: { fillColor: [232, 148, 26], textColor: [45, 26, 6], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [253, 248, 242] },
    margin: { left: 40, right: 40 },
    didDrawPage: (dados) => {
      const pagina = doc.internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(91, 98, 112);
      doc.text(
        `Página ${dados.pageNumber} de ${pagina}`,
        largura - 40,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'right' }
      );
      doc.text(
        'Faculdade Morgana Potrich — documento interno',
        40,
        doc.internal.pageSize.getHeight() - 20
      );
    },
  });

  doc.save(nomeArquivo);
}

function descreverFiltros(filtros) {
  const partes = [];
  if (filtros.de) partes.push(`envio de ${formatarData(filtros.de)}`);
  if (filtros.ate) partes.push(`até ${formatarData(filtros.ate)}`);
  if (filtros.status) partes.push(`status ${TEXTO_STATUS[filtros.status]}`);
  if (filtros.prioridade) partes.push(`prioridade ${filtros.prioridade}`);
  if (filtros.remetenteNome) partes.push(`remetente ${filtros.remetenteNome}`);
  if (filtros.conformidade) partes.push(`conformidade: ${filtros.conformidade}`);
  return partes.length ? partes.join(' · ') : 'nenhum';
}

function carregarLogo() {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = '/famp-logo.png';
  });
}

function baixar(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
