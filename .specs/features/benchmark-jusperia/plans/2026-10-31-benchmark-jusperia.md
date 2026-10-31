# Benchmark funcional da Jusperia — plano

**Data**: 2026-10-31 · **Branch**: `docs/benchmark-jusperia` · **Slug**: `benchmark-jusperia`

Engenharia reversa de **comportamento** do app da Jusperia (`https://app.jusperia.com.br`), concorrente
na gestão de perícias judiciais, para inventariar as funcionalidades e comparar com o Ethica.
Nada é implementado no Ethica nesta etapa.

## Escopo

- Navegar o menu inteiro (operação, cadastros, administração, relatórios, configurações).
- Para cada tela: propósito, rota, quem usa, campos, validações, fluxos/status, cálculos, listagens,
  documentos gerados, integrações (pelas requisições de rede), notificações e automações.
- Criar e editar registros com dados verossímeis (sem prefixo de teste) para exercitar os fluxos.
  Não alterar nem excluir registros que já existiam na conta.
- Registrar a evidência de cada conclusão; inferência marcada como **não confirmado**.

## Método

1. Chrome headless com perfil temporário e CDP local; cookie de sessão fornecido pelo usuário.
2. REA (`list_browser_targets`, `inspect_web_page`, `capture_browser_scenario`) para evidência de
   página e rede; extração de DOM/formulários/scripts por CDP para o inventário de campos.
3. Leitura dos JS servidos pelo app (`*.js` e scripts inline) para endpoints e regras de cliente.
4. Fluxos exercitados com criação de registros; log de registros criados/removidos no inventário.

## Entregáveis

- `.specs/features/benchmark-jusperia/2026-10-31-jusperia-inventario.md`
- `.specs/features/benchmark-jusperia/2026-10-31-jusperia-gap-analysis.md`

## Limites

- Comportamento observável apenas: não há acesso a código de servidor; regra de servidor é inferida
  pela resposta.
- Se a sessão expirar, parar e pedir cookie novo; não contornar login.
- Dados pessoais da conta (nome, e-mail, partes reais, números de processo reais) **não** entram nos
  documentos: são anonimizados.
