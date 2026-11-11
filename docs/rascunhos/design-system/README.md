Ameixa é o sistema visual do app de hábitos gamificados: um app calmo, limpo e sem punição, em que a recompensa tem cor própria. Leia este guia antes de desenhar ou programar qualquer tela.

## Princípios

- **Calma por padrão, brilho no prêmio.** A interface é neutra (`canvas` branco, `ink` ameixa). A cor forte fica em três lugares: o topo `top`, o laranja `primary` das ações e o dourado `gold` das recompensas.
- **Zero punição também no visual.** Nada de vermelho, ícone de alerta ou animação de perda por hábito não feito. `danger` existe só para excluir e para erros de ação.
- **Uma ação por item.** O marcador é o único controle de registro. Todo o resto abre detalhe ou folha.
- **Números com cara de painel.** Todo número de progresso usa JetBrains Mono (`num`, `num-sm`, `num-lg`).

## Voz e texto

- Português do Brasil, frases curtas, segunda pessoa informal ("Quer subir a régua?").
- Use o vocabulário controlado: Hábito, Hoje, Hábitos livres, Feito, Concluídos, Versão mínima, Streak, Ritmo, Última vez, Automatizado, Régua, Subir a régua, Ajustar a régua, Estrela de Coragem, Modo Pausa, Pausar, Voltar, Loja, Recompensa, Resgatar, Faz tempo.
- Palavras proibidas em qualquer tela: falhou, perdeu, atrasado, quebrou, penalidade, dias perdidos.
- Botões dizem o que acontece: "Salvar hábito", "Resgatar", "Voltar". Toasts confirmam no passado ou acolhem: "Boa escolha. Hábito do tamanho certo é hábito que fica."
- Sem emoji na interface. Exclamação só em celebrações.

## Cor

- Fundo das telas: `canvas` (branco puro no claro, `#100a12` no escuro). Nunca use off-white tingido.
- Cartões: `surface` com borda `line`. Folhas e diálogos: `surface-raised` com `shadow-sheet`.
- Texto: `ink` para o principal, `ink-muted` para metadados. Os dois passam AA sobre `canvas` e `surface` nos dois temas.
- Marca: `top` (ameixa) é o fundo do topo de progresso e das celebrações, igual nos dois temas. `primary` é o laranja de marcadores, do botão principal e do "+"; texto em laranja usa `primary-ink`.
- Prêmio: `gold` sobre `top`/`coin`, `gold-ink` sobre `gold-soft`. Ouro, XP, estrelas e Prêmio de Domínio usam essa família, e nada mais usa.
- Estados: `success`, `warning`, `neutral` e `danger`, cada um com seu `-soft`, sempre em pílula com texto. "Faz tempo" usa o lilás `faz`/`faz-soft`, que é lembrete, não alerta.
- Heatmap: `heat-0` a `heat-4`. Dias em pausa usam `heat-0`.

## Tipografia

- Títulos em Sora (`display`, `title-lg`, `title`, `title-sm`); texto em Inter (`body-lg`, `body`, `item`, `meta`, `label`); números em JetBrains Mono (`num-lg`, `num`, `num-sm`). As três vêm do Google Fonts.
- Nome de hábito em `item` (15px, 600). Corpo nunca abaixo de 15px; metadados em `meta` (13px). Nada abaixo de 12px.
- Cabeçalhos de seção ("Hoje", "Hábitos livres") em `title`.

## Espaço e forma

- Margem lateral das telas: `space-4`. Entre itens: `space-2`. Entre seções: `space-6`.
- Raios: `radius-md` em itens, cartões, campos e botões; `radius-sm` em pílulas; `radius-lg` no "+" e nas celebrações; `radius-xl` no topo das folhas; `radius-full` em marcadores e barras.
- Bordas finas (1px `line`) em vez de sombras. Sombra só no "+", nas folhas e nos toasts.
- Alvos de toque com no mínimo 44px.

## Movimento

- Marcar hábito: o marcador preenche em 150ms, o chip `am-gain` sobe 4px e some em cerca de 1s, e o item sai da lista em 200ms.
- Celebrações: entrada em até 300ms, sem confete contínuo.
- Com `prefers-reduced-motion`, troque deslocamentos por fade simples.

## Iconografia

- Tabler Icons, contorno, grade de 24px, traço 2, cantos arredondados. Tamanho de 20px nas abas e nos botões, 16px dentro de pílulas.
- Os ícones herdam a cor do texto (`currentColor`). Nunca use emoji como ícone.
- O conjunto foi escolhido para este sistema, e não veio de uma marca existente. Ainda não há logo: o nome aparece em Sora.

## Acessibilidade

- Contraste AA em todo texto, nos dois temas. Bordas de controle, foco e ícones com significado têm no mínimo 3:1.
- Foco visível: anel `focus` de 2px sólido com 2px de afastamento.
- Estado nunca depende só de cor: há sempre texto ou ícone junto.
- O marcador tem rótulo para leitor de tela ("Marcar Ler 30 minutos como feito"; "Avançar contador, 3 de 8").
