import { describe, it, expect } from 'vitest';
import {
  hojeISO,
  somarDiasISO,
  formatarData,
  diasDePeriodo,
  timecode,
  janelaDeDias,
  entre,
} from './datas.js';
import { slug, sanitizarNome, nomePadronizado, mascararWhatsapp, whatsappValido } from './arquivos.js';

/**
 * Testes onde eles pagam o custo: as funcoes puras onde erro de fuso e de
 * normalizacao nascem. O resto se verifica pelos criterios de aceite.
 */

describe('datas civis', () => {
  it('hojeISO devolve YYYY-MM-DD', () => {
    expect(hojeISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('soma dias sem cair no fuso', () => {
    expect(somarDiasISO('2026-08-14', 2)).toBe('2026-08-16');
    expect(somarDiasISO('2026-12-31', 1)).toBe('2027-01-01');
    expect(somarDiasISO('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('formata em pt-BR sem perder um dia', () => {
    // O bug classico: new Date('2026-08-15') em UTC-3 vira 14/08 as 21h.
    expect(formatarData('2026-08-15')).toBe('15/08/2026');
    expect(formatarData('2026-01-01')).toBe('01/01/2026');
  });

  it('conta o periodo incluindo o primeiro e o ultimo dia', () => {
    expect(diasDePeriodo('2026-08-15', '2026-08-15')).toBe(1);
    expect(diasDePeriodo('2026-08-15', '2026-08-29')).toBe(15);
  });

  it('compara datas civis por string', () => {
    expect(entre('2026-08-20', '2026-08-15', '2026-08-29')).toBe(true);
    expect(entre('2026-08-30', '2026-08-15', '2026-08-29')).toBe(false);
    expect('2026-08-09' < '2026-08-10').toBe(true);
  });

  it('timecode em mm:ss', () => {
    expect(timecode(18)).toBe('00:18');
    expect(timecode(75)).toBe('01:15');
    expect(timecode(null)).toBe('—');
  });

  it('monta a janela da grade', () => {
    const dias = janelaDeDias('2026-08-10', 21);
    expect(dias).toHaveLength(21);
    expect(dias[0].iso).toBe('2026-08-10');
    expect(dias[20].iso).toBe('2026-08-30');
  });
});

describe('nomes de arquivo', () => {
  it('remove acento e espaco', () => {
    expect(slug('Coordenação de Enfermagem — Aula Inaugural')).toBe(
      'coordenacao-de-enfermagem-aula-inaugural'
    );
  });

  it('sanitiza preservando a extensao', () => {
    const file = { name: 'Semana da Enfermagem 2026.PNG', type: 'image/png' };
    expect(sanitizarNome(file)).toBe('semana-da-enfermagem-2026.png');
  });

  it('monta o nome padronizado do CMS', () => {
    const info = {
      protocolo: 'FAMP-2026-0134',
      titulo: 'Semana da Enfermagem',
      nomeArmazenado: 'arte.mp4',
    };
    expect(nomePadronizado(info)).toBe('FAMP-2026-0134_semana-da-enfermagem.mp4');
  });
});

describe('whatsapp', () => {
  it('mascara celular e fixo', () => {
    expect(mascararWhatsapp('64999555364')).toBe('(64) 99955-5364');
    expect(mascararWhatsapp('6436612655')).toBe('(64) 3661-2655');
  });

  it('valida 10 ou 11 digitos', () => {
    expect(whatsappValido('(64) 99955-5364')).toBe(true);
    expect(whatsappValido('123')).toBe(false);
  });
});
