# Roadmap

Direção, não compromisso. Cada item vira `docs/features/<slug>/` quando começar (protocolo em `AGENTS.md`).

| Ordem | Item | Notas |
| --- | --- | --- |
| 1 | Validar a busca do Datajud com a chave real | Ajustar campos da consulta e mapeamento (AD-105) |
| 2 | Extração do PDF por IA no servidor | Hoje é por regras sobre o texto (`importacao-processos`, AD-114); IA trocaria só `extractMinutes`. Importação por CSV já existe |
| 6 | Vistorias com fotos e áudios (offline-first) | Feito em `campo-vistorias` (AD-128 a AD-132); falta a transcrição do áudio (AD-124) |
| 7 | Laudos automatizados | Modelos, editor e exportação PDF/Word já existem (`laudos`, AD-123 a AD-127); faltam IA de redação (AD-124) e fotos e anotações da vistoria |
| 8 | Notificações de vencimentos financeiros e push | Aviso de prazo por e-mail já existe (`prazos-recebimentos`, AD-110) |
| 9 | Rotas inteligentes para vistorias | Mapa do dia com vizinho mais próximo e OSRM público em `campo-vistorias` (AD-131); faltam ponto de partida por endereço e serviço de rota próprio |
| 10 | Monitoramento de movimentos no Datajud | Alertar nova movimentação nas perícias e oportunidades |
