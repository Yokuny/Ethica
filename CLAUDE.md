@AGENTS.md

## Claude Code

- As regras do projeto ficam em `AGENTS.md` (importado acima), compartilhado com Codex, Gemini e outros agentes. Edite lá, não aqui. Aqui só o que é específico do Claude Code.
- **Princípio fundamental**: programar sempre com a intenção de diminuir a complexidade (excluir estruturas antigas, fazer de forma nova, limpa e direta, sem criar abstrações para "agrupar processos"). Definido no topo de `AGENTS.md`; vale em todo contexto.
- **Planos**: `.claude/settings.json` define `plansDirectory: .specs/plans`, então todo plano do plan mode já nasce dentro do repo. Ao concluir, arquive-o em `.specs/features/<slug>/plans/` (skill `ethica-docs`). O nome auto-gerado do arquivo não carrega identidade — renomeie.
- **Início de sessão**: o hook `SessionStart` roda `pnpm docs:context` e injeta o resumo do gateway. Ele não substitui a descoberta: leia os `feature.md`/planos relacionados à tarefa.
- Quem conversa com você é a perita, sem formação em programação (AGENTS.md, "Com quem você trabalha"). Não há gate de pergunta para documentar ou commitar: com o passo 3 do protocolo verde, commite e faça push na `main` sem perguntar (AD-143). Use a ferramenta de perguntas (AskUserQuestion) só para dúvidas de **comportamento** do sistema, juntando-as numa rodada, com opções descritas pelo efeito na tela.
- Para validar na tela, use o navegador pelo Playwright quando disponível; mostre à perita só o resultado, não o script.
- Ao finalizar toda tarefa (passo 3, item 7 do protocolo): sistema no ar → apresente `http://localhost:15173`; parado → pergunte com AskUserQuestion se ela quer que você o suba e, com o sim, suba e apresente o endereço.
- A memória automática do Claude é pessoal e fica fora do repo. Decisão, ajuste ou lição que outra sessão (ou outro LLM) precise saber vai para o repo (`feature.md`, `STATE.md`), não só para a memória.
