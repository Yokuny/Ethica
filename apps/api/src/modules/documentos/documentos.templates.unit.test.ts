import { describe, expect, it } from 'vitest';
import type { FichaDados } from './documentos.schema.js';
import { checklistHtml, cronogramaHtml, fichaHtml, paradasHtml } from './documentos.templates.js';

const base = {
  identity: { name: 'Escritório Ribeiro' },
  perito: { name: 'Ana Perita', registroProfissional: 'CREA-SP 123', formacao: 'Engenharia de Segurança' },
  geradoEm: new Date('2026-10-31T15:00:00Z'),
};

const pericia: FichaDados['pericia'] = {
  id: 'p1',
  numeroProcesso: '0001234-56.2026.5.02.0001',
  justica: 'labor',
  papel: 'court_expert',
  tribunal: 'TRT2',
  objeto: 'Insalubridade <script>',
  partes: [],
  movimentacoes: [],
  status: 'inspection',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('documentos (DOC-02, DOC-03)', () => {
  it('cabeçalho e rodapé trocam os marcadores, escapam o texto e somem com o logo ausente', () => {
    const doc = fichaHtml({
      ...base,
      identity: {
        name: 'X',
        cabecalho: '[LOGO]\nPerito <b>[NOME_PERITO]</b>',
        rodape: 'Pág. [PAGINA_ATUAL]/[TOTAL_PAGINAS]',
      },
      pericia,
      prazos: [],
      compromissos: [],
    });
    expect(doc.headerTemplate).not.toContain('<img');
    expect(doc.headerTemplate).toContain('Perito &lt;b&gt;Ana Perita&lt;/b&gt;');
    expect(doc.headerTemplate.match(/<div>/g)).toHaveLength(1);
    expect(doc.footerTemplate).toContain('Pág. <span class="pageNumber"></span>/<span class="totalPages"></span>');
  });

  it('logo presente vira imagem; sem texto configurado o cabeçalho é o logo e o nome do escritório', () => {
    const doc = cronogramaHtml({
      ...base,
      identity: { name: 'Escritório Ribeiro', logoDataUrl: 'data:image/png;base64,AAAA' },
      prazos: [],
      hoje: '2026-10-31',
    });
    expect(doc.headerTemplate).toContain('<img src="data:image/png;base64,AAAA"');
    expect(doc.headerTemplate).toContain('Escritório Ribeiro');
    expect(doc.footerTemplate).toContain('Página <span class="pageNumber"></span> de <span class="totalPages"></span>');
  });

  it('ficha sem partes, prazos e compromissos identifica as seções vazias e escapa o conteúdo', () => {
    const { html } = fichaHtml({ ...base, pericia, prazos: [], compromissos: [] });
    expect(html).toContain('Nenhuma parte cadastrada.');
    expect(html).toContain('Nenhum prazo cadastrado.');
    expect(html).toContain('Nenhum compromisso cadastrado.');
    expect(html).toContain('Insalubridade &lt;script&gt;');
    expect(html).toContain('CREA-SP 123');
  });

  it('ficha só mostra o resumo financeiro quando recebe os valores (admin/manager)', () => {
    const semValores = fichaHtml({ ...base, pericia, prazos: [], compromissos: [] }).html;
    expect(semValores).not.toContain('Resumo financeiro');
    expect(semValores).not.toContain('R$');
    const comValores = fichaHtml({
      ...base,
      pericia,
      prazos: [],
      compromissos: [],
      financeiro: { honorariosCents: 300000, recebidoCents: 100000, saldoCents: 200000, despesasCents: 5000 },
    }).html;
    expect(comValores).toContain('Resumo financeiro');
    expect(comValores).toMatch(/R\$\s2\.000,00/);
  });

  it('checklist traz participantes, agentes, divergências com os polos trabalhistas e documentos', () => {
    const { html } = checklistHtml({
      ...base,
      pericia: {
        ...pericia,
        partes: [{ parteId: 'a', polo: 'plaintiff', tipo: 'party', nome: 'João Silva' }],
      },
    });
    for (const trecho of [
      'Participantes',
      'Assinatura',
      'Ruído',
      'Periculosidade',
      'Matriz de divergências',
      'Reclamada',
      'LTCAT',
      'Anotações',
    ]) {
      expect(html).toContain(trecho);
    }
    expect(html).toContain('João Silva');
  });

  it('cronograma marca "vence em breve" até 15 dias e vencido no passado', () => {
    const prazo = (vencimento: string) => ({
      id: vencimento,
      periciaId: 'p1',
      periciaNumero: pericia.numeroProcesso,
      titulo: 'Entrega do laudo',
      vencimento,
      status: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const { html } = cronogramaHtml({
      ...base,
      prazos: [prazo('2026-10-30'), prazo('2026-11-10'), prazo('2026-12-31')],
      hoje: '2026-10-31',
    });
    expect(html).toContain('Vencido há 1 dia');
    expect(html).toContain('Faltam 10 dias · vence em breve');
    expect(html).toContain('Faltam 61 dias</td>');
  });

  it('perícias paradas mostram a referência e os dias parados', () => {
    const { html } = paradasHtml({
      ...base,
      paradas: [
        {
          id: 'p1',
          numeroProcesso: pericia.numeroProcesso,
          status: 'inspection',
          tribunal: 'TRT2',
          objeto: 'x',
          referencia: '2026-08-01',
          origem: 'appointment',
          diasParada: 91,
        },
      ],
    });
    expect(html).toContain('01/08/2026 (nomeação, sem movimentação)');
    expect(html).toContain('>91<');
  });
});
