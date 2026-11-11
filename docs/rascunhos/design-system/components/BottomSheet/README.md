# BottomSheet

Folha que sobe da base da tela para ações curtas e reversíveis: Subir a régua, Ajustar a régua, Pausar, Dia do heatmap e Recompensa.

**O consumidor fornece:** título, texto, conteúdo (opções, campos) e as ações.

- Fundo `surface-raised`, cantos superiores `radius-xl`, sombra `shadow-sheet`, alça `line-strong`.
- Título em `title-lg` (Sora). Uma ação principal e uma saída sem custo ("Agora não").
- Opções em `am-choice` com o XP novo já calculado (`am-xpdelta`, `gold-ink`).
- Nunca use modal bloqueante para convites. Modal é só para confirmar exclusão.
- Fecha arrastando para baixo, tocando fora ou no botão de saída. Dispensar nunca tem consequência.
