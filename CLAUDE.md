@AGENTS.md

## Claude Code

- As regras do projeto ficam em `AGENTS.md` (importado acima); edite lá. Aqui só o que é específico do Claude Code.
- **Planos**: `.claude/settings.json` define `plansDirectory: .specs/plans`, então todo plano do plan mode já nasce dentro do repo. Ao concluir, arquive-o em `.specs/features/<slug>/plans/` (skill `ethica-docs`). O nome auto-gerado do arquivo não carrega identidade — renomeie.
- **Início de sessão**: o hook `SessionStart` roda `pnpm docs:context` e injeta o resumo do gateway. Ele não substitui a descoberta: leia os `feature.md`/planos relacionados à tarefa.
- AskUserQuestion só para dúvidas de **comportamento** do sistema, numa rodada, com opções descritas pelo efeito na tela. Documentar, commitar e enviar não passam por pergunta (AGENTS.md, passo 3).
- A memória automática do Claude é pessoal e fica fora do repo. Decisão, ajuste ou lição que outra sessão (ou outro LLM) precise saber vai para o repo (`feature.md`, `STATE.md`), não só para a memória.
