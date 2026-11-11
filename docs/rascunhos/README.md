# Rascunhos

Rascunhos de tela e briefs de implementação.

- **Entra aqui:** rascunhos de tela (HTML, imagens) e briefs, com o status de cada um na tabela abaixo.
- **Não entra aqui:** regras (o spec vence o rascunho quando eles divergem).

Quando a tela de um rascunho fica pronta, o rascunho é apagado: o código passa a ser a referência.

| Rascunho | Status |
| --- | --- |
| `design-system/` (Ameixa) | Guia e componentes da identidade (ADR-010). Os valores já estão em `src/ui/theme/tokens.css`; o guia continua valendo para desenhar componentes novos. O modo escuro do guia (e o rascunho `telas/Hoje-escuro`) não vale mais: cada tema tem um modo só (ADR-012) |
| `telas/` (24 telas do MVP) | Rascunhos de todas as telas, desenhados antes do bootstrap. As telas da fase 1a já estão no código, que passa a ser a referência para o que elas têm; o mesmo vale para as partes das fases 1b (versão mínima, streak, ritmo, Modo Pausa), 1c (selo, estrelas, convites, folhas de régua, celebrações, conquistas) e 1d (heatmap, folha do dia, Loja; os rascunhos só dessas telas já foram apagados). Divergências conhecidas, em que vale o spec: a Entrada só tem "Continuar com Google" (`spec/acesso-e-membros.md`); Configurações › Conta não tem "Excluir conta" nem o estado da sincronização, e tem Membros e Convites para o admin (`spec/telas-e-feedback.md`) |
