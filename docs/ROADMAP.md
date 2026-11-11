# Roadmap

O que ainda não está pronto.

- **Entra aqui:** o que falta construir, onde o código ainda não segue o spec, o que foi adiado de
  propósito e as lacunas do spec que o agente decidiu sozinho.
- **Não entra aqui:** o que já está pronto (quando uma linha fica pronta, ela sai daqui; o git e as
  issues fechadas guardam o histórico), bugs e débito técnico (issues do GitHub) e as regras (`spec/`).

## Falta construir

| Feature | Fase | Spec | Observação |
| --- | --- | --- | --- |
| Navegação em três abas (Hoje, Loja, Perfil) e Configurações | 1a | `spec/telas-e-feedback.md` | Substitui as abas do template e a tela `Home` de exemplo |
| Cadastro, edição, arquivar, reativar e excluir hábito | 1a | `spec/habitos.md` | |
| Hoje: marcar, contador de meta, Hábitos livres, concluídos e desmarcar | 1a | `spec/registrar-o-dia.md` | Resposta na hora na tela, sem esperar o servidor |
| XP, ouro, nível e celebração de nível | 1a | `spec/progressao.md` | |
| Subir e baixar a régua, sem estrelas | 1a | `spec/regua.md` | |
| Virada do dia pelo fuso do aparelho | 1a | `spec/registrar-o-dia.md` | ADR-009 |
| Detalhe do hábito e Perfil (nível e arquivados) | 1a | `spec/telas-e-feedback.md` | |
| Versão mínima | 1b | `spec/habitos.md` | |
| Streak, ritmo e "Faz tempo" | 1b | `spec/streak-e-dominio.md` | |
| Modo Pausa | 1b | `spec/modo-pausa.md` | |
| Domínio, selo Automatizado e Prêmio de Domínio | 1c | `spec/streak-e-dominio.md` | |
| Estrelas de Coragem e convites de subir e de ajustar a régua | 1c | `spec/regua.md` | |
| Conquistas e celebrações | 1c | `spec/conquistas.md` | |
| Heatmap por hábito, geral e folha do dia | 1d | `spec/heatmap.md` | |
| Loja de recompensas | 1d | `spec/loja.md` | |

## O código ainda não segue o spec

- Cada um com o seu (ADR-008) — o `Group` avisa todos os apps abertos a cada mudança; quando houver
  dados por membro, o aviso tem de ir só para os aparelhos do próprio membro.
- Identidade Ameixa (ADR-010) — as fontes Sora, Inter e JetBrains Mono ainda não estão empacotadas
  em `public/`; até lá o app usa as fontes do sistema.

## Adiado

- Funcionar sem internet (UC-81 do documento de casos de uso) — a dona escolheu um app online na
  fase 1; volta quando o uso mostrar que faz falta.
- Login com Apple e com e-mail — só Google no MVP.
- Interação entre as pessoas do grupo — fase 2, como uma quarta aba.

## Revisar as lacunas que o agente decidiu

- [ ] Subir e baixar a régua (sem estrelas) entram já na fase 1a, porque a edição não muda
  dificuldade, meta nem dias (`spec/regua.md`, `spec/habitos.md`).
- [ ] Se a gravação de uma marcação não der certo, o app avisa e o item volta para a lista
  (`spec/registrar-o-dia.md`).
- [ ] O admin chega a Membros e Convites por Configurações (`spec/telas-e-feedback.md`).
- [ ] Em um diário com meta, a ocorrência conta para o domínio quando a meta foi atingida ou a
  versão mínima foi marcada (`spec/streak-e-dominio.md`).
- [ ] Excluir um hábito também não retira conquistas (`spec/conquistas.md`).
