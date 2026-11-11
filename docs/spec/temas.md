# Temas

Eu escolho o visual do app entre temas com nome de jogo: cores, fontes, ícones e logo mudam; o que o app faz não muda.

- **Entra aqui:** o que um tema muda e o que nunca muda, onde e como eu escolho, a quem a escolha pertence e o que acontece sem escolha.
- **Não entra aqui:** os valores de cada tema (`src/ui/theme/` e `docs/UI.md`), como o tema é aplicado e guardado (ADR do tema, em `docs/adr/`) e a lista de telas (`spec/telas-e-feedback.md`).

## Em aberto

- [ ] Quais jogos viram tema depois do Stardew Valley, e em que ordem. Cada tema novo é um trabalho à parte: nome, paleta, fontes, ícones e logo.

## O que é um tema

- Um tema é um visual completo, com nome de um jogo. Eu escolho um por vez. *(1e)*
- Cada tema tem um único modo. Não existe modo escuro nem troca automática pelo tema do celular. *(1e)*
  Por quê: com um modo só, cada tema é desenhado uma vez e conferido uma vez.
- O tema padrão é o Ameixa, o visual de hoje. *(1e)*
- Os temas que existem: Ameixa e Stardew Valley (rústico e aconchegante: pergaminho, madeira, folha verde e pixel art). *(1e)*

## O que um tema muda

- **Cores:** fundo, texto, bordas, a cor das ações, o topo de progresso, o dourado do prêmio, os tons do heatmap e as sombras. *(1e)*
- **Fontes:** a dos títulos, a dos textos e a dos números de progresso. Os tamanhos de letra não mudam. *(1e)*
- **Ícones temáticos:** as abas (Hoje, Loja, Perfil), o marcador de feito, o "+", a estrela, o selo Automatizado e a moeda de ouro. *(1e)*
- **Logo:** a que aparece dentro do app e o ícone da aba do navegador. *(1e)*
- **Formas e movimento:** cantos mais quadrados ou mais redondos, espessura das bordas, o estilo das sombras, a forma do marcador e das células do heatmap, e o ritmo das animações. *(1e)*

## O que um tema nunca muda

- **Os textos e os termos.** XP, ouro, régua, Automatizado e todo o resto têm o mesmo nome em qualquer tema. *(1e)*
  Por quê: o glossário vale para o app inteiro; o tema é só visual.
- **Os ícones de função:** voltar, seta de abrir, subir e descer, editar, arquivar, pausar, retomar e configurações. *(1e)*
  Por quê: quem usa o app vários dias por semana reconhece a ação sem ler.
- **O vermelho de excluir e de erro de ação.** Cada tema ajusta o tom para ficar legível, mas ele continua sendo só isso. *(1e)*
- **A regra de zero punição.** Nenhum tema usa vermelho, alerta ou animação de perda por hábito não feito. *(1e)*
- **O dourado é do prêmio.** XP, ouro, estrelas e Prêmio de Domínio usam a família do dourado do tema, e nada mais usa. *(1e)*
- **Tamanhos que garantem o toque:** alvos de toque, espaçamento e a estrutura das telas. *(1e)*
- **Leitura:** em qualquer tema, o texto passa no contraste mínimo de acessibilidade (WCAG AA). *(1e)*

## Como eu escolho

- Eu escolho o tema no Perfil, numa seção "Tema" com cada tema mostrado com nome e uma amostra das cores. *(1e)*
- O tema muda na hora que eu toco, sem pedir confirmação. Eu posso voltar atrás quantas vezes quiser. *(1e)*
- Enquanto só existir o Ameixa, a seção "Tema" não aparece. *(1e)*
  Por quê: uma escolha com uma opção só é ruído.
- O tema é meu. Cada pessoa do grupo escolhe o dela e ninguém vê o tema de outra. *(1e)*
- Meu tema vale em qualquer aparelho em que eu entrar, e não só naquele em que eu escolhi. *(1e)*
- Quem nunca escolheu fica no Ameixa. *(1e)*
- A tela de entrada, antes do login, usa o último tema escolhido naquele aparelho; se não há, o Ameixa. *(1e)*

## O que não muda com o tema

- O ícone do app na tela inicial do celular é o do Ameixa em qualquer tema. *(1e)*
  Por quê: o celular guarda esse ícone quando o app é instalado, e o app não consegue trocá-lo depois.
