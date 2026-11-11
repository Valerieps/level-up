# HabitItem

Linha de hábito das listas Hoje, Hábitos livres e Concluídos. Tem uma única ação de registro: o marcador.

**O consumidor fornece:** nome, regra de tempo, meta e contagem do dia, streak ou ritmo, selo e estrelas, estado (normal, feito, pausado) e os handlers de toque, toque longo e abertura do Detalhe.

**Zonas de toque**
- Toque no marcador (`.am-mark`): feito, ou avança o contador. Área de toque de 44px (o marcador visual tem 32px).
- Toque longo no marcador: "Fiz a versão mínima: <texto>", se houver versão mínima.
- Toque no corpo: abre o Detalhe.

**Estados**
- Normal: marcador com contorno `primary` sobre `surface`.
- Contador (meta > 1): anel de progresso `primary` sobre `track`, com "3/8" em `num-sm`.
- Feito (só na lista "Mostrar concluídos"): marcador cheio, nome riscado em `ink-muted`, ganho em `num-sm` e "Desfazer" em `primary-ink`.
- Pausado: borda tracejada, sem fundo, pílula "opcional". Sem cor de alerta.
- Livre parado há 10+ dias: pílula "Faz tempo" (`faz-soft`/`faz`) e "Última vez".
- Domínio: pílula "Automatizado", estrelas em `star` e o botão redondo Subir a régua (`gold-soft`/`gold-ink`). O convite aparece só como esse ícone, nunca como banner.

**Não faça**
- Botão de menos, contador negativo ou qualquer vermelho no item.
- Mostrar taxa de conclusão ou comparação.
- Usar opacidade para "apagar" itens: troque a cor do texto, para manter o contraste AA.
