# Field

Campo de texto e controle segmentado do Cadastro/Edição de hábito.

**O consumidor fornece:** rótulo, valor, ajuda opcional, mensagem de erro e opções do segmentado.

- Rótulo sempre visível acima do campo (13px, 600). Não use só placeholder.
- Campo com 48px de altura e texto de 16px (evita zoom no iOS), borda `line-strong`; em foco, borda `primary` com anel `focus`.
- Controle segmentado (`am-seg`) para escolhas curtas e exclusivas: regra de tempo (Livre, Dias específicos, Diário) e dificuldade (Fácil, Média, Difícil). A opção ativa usa `aria-pressed="true"`.
- Erro de validação: borda e texto de ajuda em `danger`, com uma frase que diz como corrigir.
