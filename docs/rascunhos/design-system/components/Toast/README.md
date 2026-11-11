# Toast

Mensagens curtas que não interrompem: o ganho ao marcar um hábito, ajuste feito, retorno da pausa e falhas de ação.

**O consumidor fornece:** texto, duração e uma ação opcional.

- Ganho (`am-gain`): chip `gold` com texto `top`, em `num-sm`, ao lado do item marcado, por cerca de 1 segundo.
- Toast (`am-toast`): fundo `toast`, texto `on-toast`, base da tela acima das abas, por cerca de 4 segundos.
- Falhas sempre aparecem: uma ação que não deu certo vira toast com "Tentar de novo". Nunca falhe em silêncio para uma lista vazia.
- Desmarcar e descer de nível não geram mensagem; só os números mudam.
- Use as frases do produto ("Que bom te ver! Tudo continua de onde parou."). Nunca use as palavras proibidas.
