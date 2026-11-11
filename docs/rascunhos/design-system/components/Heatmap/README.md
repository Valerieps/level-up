# Heatmap

Grade de dias por hábito (no Detalhe) e geral (no Perfil). Toque em um dia abre a folha Dia do heatmap.

**O consumidor fornece:** a lista de dias com o nível de 0 a 4 e o handler de toque.

- Colunas são semanas e linhas são dias da semana. Células de 14px com raio de 3px e espaço de 3px.
- Escala `heat-0` a `heat-4`, do vazio ao laranja escuro. Inclua sempre a legenda "Menos → Mais".
- Dias em pausa e dias não programados usam `heat-0`, sem destaque.
- O leitor de tela recebe um resumo em texto, não 112 células.
