# Switch

Interruptor liga/desliga para preferências que valem na hora, como "Mostrar concluídos" e "Pausar só este hábito".

**O consumidor fornece:** rótulo, estado e handler.

- A linha inteira (`am-toggle-row`) é o alvo de toque, com no mínimo 44px de altura.
- Desligado: trilho `track` com contorno `line-strong`. Ligado: trilho `primary` com bolinha `on-primary`.
- O rótulo descreve o que fica ligado, nunca uma pergunta.
