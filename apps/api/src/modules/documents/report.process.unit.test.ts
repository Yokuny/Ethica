import { describe, expect, it } from 'vitest';
import { applyProcess, extractProcess } from './report.process.js';

const PROCESS = `PODER JUDICIÁRIO
JUSTIÇA DO TRABALHO
PETIÇÃO INICIAL
O reclamante foi admitido em 05/07/2021, exercendo a função de operador de empilhadeira, e foi dispensado sem justa causa em 04/06/2026.
Trabalhava exposto a ruído excessivo e abastecia a empilhadeira com GLP, combustível inflamável.
Requer o pagamento do adicional de insalubridade e do adicional de periculosidade.
QUESITOS DO RECLAMANTE
1) O reclamante trabalhava exposto a ruído
acima do limite de tolerância?
2) Havia abastecimento de inflamáveis?
Termos em que pede deferimento.
CONTESTAÇÃO
Quesitos da reclamada:
1. Quais EPIs foram fornecidos?
2. Os EPIs neutralizavam o agente?
Nestes termos, pede deferimento.
DESPACHO
QUESITOS DO JUÍZO
1 - O ambiente de trabalho era insalubre?
QUESITOS DO RECLAMANTE
1) Pergunta repetida em outro documento?`;

describe('leitura do processo completo (LMO-03, AD-152)', () => {
  it('acha os quesitos por polo e do juízo, os dados do contrato e os pedidos', () => {
    const extraction = extractProcess(PROCESS);
    expect(extraction.questions).toEqual({
      plaintiff: [
        'O reclamante trabalhava exposto a ruído acima do limite de tolerância?',
        'Havia abastecimento de inflamáveis?',
      ],
      defendant: ['Quais EPIs foram fornecidos?', 'Os EPIs neutralizavam o agente?'],
      court: ['O ambiente de trabalho era insalubre?'],
    });
    expect(extraction.labor).toEqual({
      hireDate: '2021-07-05',
      terminationDate: '2026-06-04',
      claimantJob: 'operador de empilhadeira',
    });
    expect(extraction.claims).toEqual(['adicional de insalubridade', 'adicional de periculosidade']);
    expect(extraction.agents).toEqual(['ruído', 'inflamáveis']);
  });

  it('sem nada reconhecível, tudo vem vazio', () => {
    expect(extractProcess('Despacho. Intimem-se.')).toEqual({
      questions: { plaintiff: [], defendant: [], court: [] },
      labor: {},
      claims: [],
      agents: [],
    });
  });

  it('troca o texto-modelo dos quesitos, acrescenta ao texto do perito e põe os pedidos no objetivo', () => {
    const extraction = extractProcess(PROCESS);
    const sections = [
      { id: 'a', title: 'Objetivo', titleOnly: false, html: '<p>Objetivo.</p>' },
      { id: 'b', title: 'Quesitos', titleOnly: true, html: '' },
      {
        id: 'c',
        title: 'Quesitos pelo(a) Reclamante',
        titleOnly: false,
        html: '<p>Quesito 1: (transcrever o quesito).</p>',
      },
      { id: 'd', title: 'Quesitos pelo(a) Reclamada', titleOnly: false, html: '<p>Já respondido.</p>' },
      {
        id: 'e',
        title: 'Quesitos pelo Juízo',
        titleOnly: false,
        html: '<p>Não foram apresentados quesitos pelo Juízo.</p>',
      },
    ];
    const changed = applyProcess(sections, extraction);
    expect(changed.map((section) => section.id)).toEqual(['a', 'c', 'd', 'e']);
    expect(changed[0]?.html).toBe(
      '<p>Objetivo.</p><p>Pedidos da inicial: adicional de insalubridade e adicional de periculosidade, com alegação de ruído e inflamáveis.</p>',
    );
    expect(changed[1]?.html).toContain('<strong>Quesito 2:</strong> Havia abastecimento de inflamáveis?');
    expect(changed[1]?.html).not.toContain('transcrever');
    expect(changed[2]?.html.startsWith('<p>Já respondido.</p><p><strong>Quesito 1:</strong> Quais EPIs')).toBe(true);
    expect(changed[3]?.html).toContain('O ambiente de trabalho era insalubre?');
    // Already applied: the claims do not enter twice.
    expect(applyProcess([{ ...sections[0], html: changed[0]?.html ?? '' }], extraction)).toEqual([]);
  });
});
