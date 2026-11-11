# ProgressHeader

Topo fixo da tela Hoje com nível, barra de XP, saldo de ouro e o acesso ao Modo Pausa. É a assinatura visual do app.

**O consumidor fornece:** nível atual, XP atual e meta do nível, saldo de ouro e o estado de pausa (o botão vira "Voltar" quando o app está pausado, e a faixa `PauseBanner` aparece logo abaixo).

- Fundo sempre `top` (ameixa), nos dois temas. Não troque por `canvas` em nenhuma tela.
- Pílula de nível em `level` com texto `on-level`, estilo `title-sm`.
- Ouro em `coin` com texto `gold`; números sempre em `num`/`num-sm` (JetBrains Mono).
- Barra de XP: trilho `top-track`, preenchimento em degradê de `gold` para `level`. É o único degradê do sistema.
- Fica fixo ao rolar. Na Loja e no Perfil, use o mesmo bloco para manter a marca.
- Não mostre XP negativo nem animação de perda: ao desmarcar, só os números mudam.
