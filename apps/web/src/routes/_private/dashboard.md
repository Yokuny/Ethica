# **Guia essencial para construir bons dashboards e gráficos**

Um bom dashboard não é aquele que possui mais gráficos ou mais indicadores. É aquele que permite ao usuário **compreender uma situação rapidamente, identificar o que importa e tomar uma decisão sem precisar interpretar excessivamente os dados.**

Abaixo estão os principais conceitos que devem orientar a construção de qualquer BI, dashboard ou sistema de observabilidade.

## **1. Os principais pilares**

**1. Objetivo e contexto**

Todo gráfico deve responder a uma pergunta clara. Não criar gráficos apenas porque existem dados disponíveis.

**2. Hierarquia visual**

Organizar informações do mais importante para o menos importante. O usuário deve saber onde olhar primeiro.

**3. Escalas honestas**

Representar os valores proporcionalmente, evitando eixos truncados ou escalas que exagerem visualmente variações.

**4. Semântica de cores**

Toda cor deve ter significado consistente. Cores devem comunicar estados, categorias e prioridades, não apenas decorar.

**5. Progressive Disclosure / Drill-down**

Começar com a visão macro e permitir aprofundamento progressivo até os detalhes e evidências.

**6. Data Storytelling**

Transformar dados em uma narrativa: o que aconteceu, por que importa, qual impacto e o que fazer.

**7. Redução da carga cognitiva**

Facilitar a compreensão. Evitar exigir que o usuário calcule, memorize, compare ou interprete excessivamente.

**8. Acessibilidade**

Garantir legibilidade, contraste, clareza e que a informação não dependa exclusivamente das cores.

## **2. Hierarquia de leitura: Macro → Micro**

Um dashboard deve contar com uma hierarquia de aprofundamento.

Nível 1 — Visão macro

Estado geral, KPIs, saúde e principais alertas

Nível 2 — Área ou módulo

Onde está o problema?

Nível 3 — Indicador

Qual métrica apresenta desvio?

Nível 4 — Investigação

Logs, traces, eventos e detalhes

### **Progressive Disclosure**

Revelar complexidade somente quando ela for necessária.

### **Drill-down**

Permitir que o usuário clique em uma informação e aprofunde sua análise, mantendo o contexto, filtros e período.

**Regra:** a visão inicial deve ser simples, mas nunca esconder problemas importantes em componentes menores.

## **3. Escolha correta dos gráficos**

Cada tipo de gráfico deve ser escolhido conforme a pergunta que se deseja responder.

[Dashboard Design Best Practices: The Complete 2025 Guide | 5of10](https://images.openai.com/static-rsc-4/a7GxTfpwMrDxY24wo5mXyupA2vIwdSj0lj6r19oizMT2KSZqx-d4hx_XiEpQfbyq3mryI4jrOxbAobb7z57RF8xs9M6xPUM9rlPiscpTLK9jbh2SVhpbS9f2mtVIBMIEwS9dSdM7dGX6wy59tBEEHvB-lnLO2p2ARxYcmiFf5kw?purpose=inline)

**Linha**

Evolução ao longo do tempo, tendências e oscilações.

[Top Shopify Store Development & Design Services | Crawlapps](https://images.openai.com/static-rsc-4/npNFk2JBmg_TX1X86TQ0sfrxRDslqHuEsD-ryOvh5pGWRTPfKoSDdRkgFSglrk1s50vRcG68a0py6ArV_PHdFUBYRwWMotkYqJhs5PCGmhEOTRIfB_lBsrbvpPBZV3TSOzHrQ35xThhpluPjzmoaxgQjrAHZycCTolqj0_7RnOg?purpose=inline)

**Barras**

Comparação entre categorias, produtos, serviços ou períodos.

[Python Tufte-styled data visualization | by Vladimir Zhyvov | Medium](https://images.openai.com/static-rsc-4/bb5mj31FpfdLI2hTq6QbPlOyaQ3tFS7cUxRlrFQHaIbuDBv7-hcv27SVfxaEPrGIsCGUBvJRSgxPl8cJmhx5eti-j2Ow7O0dEhigoOVFtIzbwKrE7xg16SwG3zux_mnlu_55sGVtyyUwd3pqBAvNGryDsvPhLzjt9EdDFK1K-JQ?purpose=inline)

**Histograma**

Distribuição de valores, frequência e concentração.

[What is a Scatter Plot? Examples for Scatter Plot | PlainSignal](https://images.openai.com/static-rsc-4/8QRZtOP7r0XN67th_Ex4hLR4tgcTCVJGz7UZHtNfukNJ4OVNhKSWF7USvW4f71_6XnGRcB5lAkmX8mWSdD0J2WlkPcv8-umXvPXAMX9S_GeugyaV8uEsQguLo5QjjMoCz8IcnXV5PgRWAmQuxkqQxFLk2STOcbfumel_lJW2xuE?purpose=inline)

**Dispersão**

Relação entre duas variáveis e identificação de padrões.

[How to Make a Line Chart with AI: The Complete 2026 Guide to Design Rules | by Steven Cen | Mar, 2026 | Medium](https://images.openai.com/static-rsc-4/PZ298knrZKVtDkEFZ1MfqLwYRbQ09RuXnn4J9TGMRqDfuaCbjas4ypnfZNVdnHJdPGNINJgFXnYyopNVqTFC5dk0bhBnzzpK_dskWCyvZEVuM-n0RLbw4N4cIolYCom0snTtT1uSYpnMIuhB420Po1_s2AzXZxNezDu2iY1BXmE?purpose=inline)

**Área**

Composição e evolução de volumes acumulados.

[Calendar Heatmap | Holistics Docs (4.0)](https://images.openai.com/static-rsc-4/GmBQYj-CTiOOFmpDrLAuTNu4vGexLH0nO9z8LjlLkEHAa8nvihFxxeL6PDurOWFq_fguENKadB_SJRwE8_PGMaFHsO7Spiy0Ub7nwsj-8fXvdg76wrYVop35ufpwq3o_2R1azYzv9sVtkyyIk7ge9m6Z7MRr9k-XTYYVND7rYeQ?purpose=inline)

**Heatmap**

Intensidade, concentração, padrões e horários de ocorrência.

### **Regras práticas**

- Linha: evolução temporal.
- Barras: comparação entre categorias.
- Barras horizontais: rankings com nomes extensos.
- Dispersão: correlação e comportamento entre variáveis.
- Heatmap: intensidade e concentração.
- Tabela: valores exatos e consultas detalhadas.

Evite gráficos 3D, excesso de gráficos de pizza e visualizações que dificultem comparações.

## **4. Escalas e proporcionalidade**

Um dos princípios mais importantes para não induzir o usuário ao erro.

### **Percentuais com capacidade total conhecida**

CPU, memória e armazenamento, quando apresentados como utilização percentual da capacidade total, devem utilizar:

- Mínimo: 0%.
- Máximo: 100%.
- Escala consistente entre dashboards.
- Limites de atenção e criticidade claramente definidos.

Evitar — eixo truncado

[Truncating the Y-Axis: Threat or Menace? | by Michael Correll | Medium](https://images.openai.com/static-rsc-4/6a2U_nJLEDkrQxC-0GfPxoo0Lvr42xj9xcAqRvCO7Gaz8uKCmgiOxTtP2R2rlX0NxBITYgUSgLW0Ml_slrGoHwFu6iKdRWMtOt7VWfIW4CUvZhaF6XHwe-Cn1itnjHWnoieQWjPCK3t5FbgLZtQIvQQbwRylS98X05lEEE4DZX4?purpose=inline)

Amplifica visualmente variações pequenas.

Preferir — escala proporcional

[AWS Monitoring - Part 1: AWS CloudWatch - DEV Community](https://images.openai.com/static-rsc-4/UD9agUDVeQyx5uL3WlX1Svcl8OeYsvftX1_QSWmu6E3O6FNOhaRWDBOoyzyhDiXfxF63pMr2ppG-YBuky0i3uiiBQA8uj3g8MSrU8FXEwsKU6ai-DC3KIqKUYzOPsTyN87uk2hVCx_Vm-uFlx0cKkHh2nQutovl5hpHk0qF4FGs?purpose=inline)

Permite compreender a magnitude real.

### **Outras métricas**

Latência, faturamento, quantidade de requisições e volume de dados não precisam utilizar escala de 0 a 100.

A escala deve ser adequada ao indicador, sua unidade, contexto e finalidade.

**Princípio: não exagerar visualmente os dados e não esconder sua magnitude real.**

## **5. Psicologia e semântica das cores**

Cores devem formar uma linguagem visual consistente em todo o sistema.

| Cor             | Significado preferencial                   |
| --------------- | ------------------------------------------ |
| Verde           | Saudável, sucesso, dentro da meta          |
| Amarelo / Âmbar | Atenção, risco, alerta preventivo          |
| Vermelho        | Crítico, falha, impacto grave              |
| Azul            | Informativo, neutro, dados                 |
| Roxo            | Análise, projeção ou comparação específica |
| Cinza           | Inativo, indisponível, sem classificação   |

### **Regras de consistência**

- O mesmo significado deve possuir a mesma cor em todos os painéis.
- Não escolher cores aleatoriamente por gráfico.
- Separar cor de identificação de série da cor que representa estado.
- Não utilizar cores fortes em tudo.
- Reservar cores de alerta para situações que realmente exigem atenção.
- Utilizar texto, ícones e sinais além das cores.
- Validar contraste e legibilidade.
- Manter consistência entre temas claro e escuro.

**A cor deve ajudar o usuário a interpretar, não fazê-lo pensar.**

## **6. KPIs e indicadores**

Um bom KPI não é apenas um número.

Sempre que relevante, deve apresentar:

EXEMPLO DE KPI

# **98,4%**

**Taxa de sucesso**

+1,2 p.p. em relação ao período anterior

Meta: 99,5%

Período: últimas 24 horas

Estado: abaixo da meta

Todo KPI relevante deve possuir:

- Nome claro.
- Valor.
- Unidade.
- Contexto temporal.
- Meta ou referência.
- Comparação, quando útil.
- Estado.
- Interpretação, quando relevante.

Evitar indicadores isolados sem contexto.

## **7. Data Storytelling**

O dashboard deve contar uma história com os dados.

A sequência ideal é:

**1**

**Contexto**

O que estamos analisando?

**2**

**Diagnóstico**

O que aconteceu?

**3**

**Causa / hipótese**

Por que aconteceu?

**4**

**Impacto**

Qual a consequência?

**5**

**Ação**

O que devemos fazer?

### **Storytelling não é inventar uma história**

É organizar fatos em uma sequência que facilite a compreensão.

Exemplo:

- A latência aumentou.
- O aumento começou após determinado horário.
- O problema está concentrado em um serviço.
- Existem usuários afetados.
- Há correlação com um deploy.
- Recomenda-se investigar os traces dessa operação.

Fatos, hipóteses e recomendações devem estar claramente diferenciados.

## **8. Carga cognitiva**

O usuário não deve precisar fazer o trabalho que o dashboard deveria fazer.

Evite exigir que ele:

- Calcule diferenças manualmente.
- Compare gráficos distantes.
- Descubra sozinho se um número é bom ou ruim.
- Memorize cores ou unidades.
- Procure qual painel possui a informação.
- Interprete escalas inconsistentes.
- Entenda métricas sem contexto.

Prefira:

- Comparações calculadas.
- Metas visíveis.
- Legendas claras.
- Informações agrupadas.
- Destaques relevantes.
- Resumos.
- Navegação contextual.

O objetivo é reduzir o esforço mental necessário para tomar uma decisão.

## **9. Comparações e contexto temporal**

Dados isolados raramente explicam alguma coisa.

Comparar, quando fizer sentido:

- Período atual × anterior.
- Hoje × mesmo dia da semana anterior.
- Realizado × meta.
- Realizado × baseline.
- Atual × média histórica.
- Serviço A × Serviço B.
- Versão atual × versão anterior.

As comparações devem utilizar períodos equivalentes e considerar sazonalidade quando pertinente.

Evitar comparações que pareçam relevantes visualmente, mas não possuam equivalência estatística ou operacional.

## **10. Acessibilidade e legibilidade**

Todo dashboard deve:

- Ter contraste adequado.
- Utilizar textos legíveis.
- Evitar fontes pequenas.
- Não depender exclusivamente de cores.
- Possuir legendas compreensíveis.
- Evitar excesso de elementos.
- Utilizar formatos numéricos consistentes.
- Adaptar-se a diferentes resoluções.
- Manter hierarquia visual clara.

## **11. Alertas e anomalias**

Alertas devem representar situações relevantes.

Diferenciar:

- Normalidade.
- Atenção.
- Degradação.
- Criticidade.
- Indisponibilidade.
- Dados desconhecidos.

Não transformar qualquer variação em alerta.

Um indicador pode variar sem representar problema, assim como pode estar dentro de uma média aceitável e esconder uma falha grave em um componente.

Alertas devem ser baseados em limites, SLOs, tendências, condições e contexto, quando aplicável.

## **12. Checklist antes de publicar um dashboard**

**Checklist de qualidade**

0/15

O dashboard possui um objetivo claro?

Os gráficos respondem perguntas específicas?

A visão macro apresenta o que realmente importa?

Existe possibilidade de drill-down contextual?

As escalas representam os valores proporcionalmente?

Os eixos estão configurados adequadamente?

As cores possuem significado consistente?

O estado dos indicadores está claro?

Os KPIs possuem contexto, unidade e período?

As comparações são justas e relevantes?

Existe excesso de gráficos ou informações?

Os dados ausentes são tratados corretamente?

A informação é legível e acessível?

O usuário consegue identificar problemas rapidamente?

O dashboard ajuda a decidir ou agir?

Limpar checklist

# **13. Os princípios fundamentais — resumo**

## **Um bom dashboard deve:**

Ter um objetivo claro.

Mostrar primeiro o que importa.

Começar pelo macro e permitir aprofundamento.

Representar dados com escalas honestas.

Utilizar cores semanticamente consistentes.

Contextualizar os números.

Reduzir o esforço de interpretação.

Apresentar padrões e mudanças relevantes.

Diferenciar fatos de hipóteses.

Facilitar decisões e ações.

> **O melhor dashboard não é aquele que mostra mais dados. É aquele que faz o usuário entender mais, em menos tempo, com menos esforço e maior confiança.**

Esses conceitos constituem uma base para qualquer construção de BI, desde dashboards executivos e comerciais até observabilidade técnica no Grafana.