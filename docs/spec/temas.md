# Temas

Eu escolho o visual do app entre temas, quase todos com nome de jogo: cores, fontes, ícones e logo mudam; o que o app faz não muda.

- **Entra aqui:** o que um tema muda e o que nunca muda, onde e como eu escolho, a quem a escolha pertence e o que acontece sem escolha.
- **Não entra aqui:** os valores de cada tema (`src/ui/theme/` e `docs/UI.md`), como o tema é aplicado e guardado (ADR do tema, em `docs/adr/`) e a lista de telas (`spec/telas-e-feedback.md`).

## Em aberto

- [ ] Quais jogos viram tema depois do Stardew Valley, do Ocarina e do Uppertale, e em que ordem. Cada tema novo é um trabalho à parte: nome, paleta, fontes, ícones e logo.

## O que é um tema

- Um tema é um visual completo, em geral com nome de um jogo. Eu escolho um por vez. *(1e)*
  O Arco Iro é a exceção: não vem de jogo nenhum.
- Cada tema tem um único modo. Não existe modo escuro nem troca automática pelo tema do celular. *(1e)*
  Por quê: com um modo só, cada tema é desenhado uma vez e conferido uma vez.
- O tema padrão é o Ameixa, o visual de hoje. *(1e)*
- No app instalado no Android, a barra de navegação do celular (a de baixo) é preta em todos os
  temas. *(1e)*
  Por quê: o Android grava essa cor quando o app é instalado e não troca quando eu mudo de tema;
  o preto some no Uppertale e parece a moldura do celular nos temas claros.

## Os temas que existem

- **Ameixa**, o padrão: o visual próprio do LevelUp. *(1e)*
- **Stardew Valley**: rústico e aconchegante: pergaminho, madeira, folha verde e pixel art. *(1e)*
- **Ocarina**, de *The Legend of Zelda: Ocarina of Time*: a floresta Kokiri de dia (fundo verde-sálvia
  claro, painéis creme e barras verde-floresta), ações e nível no verde da túnica e títulos na letra
  do jogo. *(1e)*
  Por quê: o primeiro Ocarina, escuro como a noite da floresta, era ruim de navegar.
  - Do menu de pausa do jogo: a aba atual é uma placa escura de borda clara, como as abas laterais;
    os botões têm um filete claro por dentro; as trilhas de conquista do Perfil são medalhões, com
    aro escuro e brilho. *(1e)*
  - Hoje é um pergaminho, a Loja um baú, o Perfil um escudo de cavaleiro, o feito um visto de pena,
    o "+" uma cruz de brasão, a estrela uma faísca de fada e o logo uma ocarina.
  - A moeda de ouro é uma Rupee verde, sempre verde, qualquer que seja o valor. O número do ouro
    continua dourado.
  - O selo Automatizado é a paródia da Triforce: três losangos onde o jogo tem três triângulos.
- **Uppertale**, paródia de *Undertale*: a tela preta do jogo com caixas de diálogo de borda
  branca, ações em branco, o amarelo puro do jogo só no prêmio, títulos em letra de pixel e as abas
  como os botões do menu de batalha. *(1e)*
  - O feito é uma alma: um coração de pixel vazio que se preenche quando eu marco o hábito. Ele é
    branco, nunca vermelho, porque o vermelho é só de excluir e de erro.
  - Hoje é uma caixa de diálogo com "* ...", a Loja um saco de itens, o Perfil uma silhueta, a
    estrela o brilho de um ponto de salvar, o Automatizado um coração cheio de determinação, a
    moeda uma moeda dourada com "G" e o logo um coração.
- **Arco Iro**, o tema da minha irmã: um unicórnio com personalidade demais, fofo sem ser de
  menininha, um arco-íris levado quase como piada. Papel creme, tinta quase preta, ações em violeta,
  rosa forte nos detalhes (o foco, a borda do marcador, a aba atual), sombras macias rosa e roxas e
  tudo arredondado. Títulos numa letra redonda e gordinha. *(1e)*
  - O feito é uma cabeça de unicórnio de perfil: vazia, só o contorno rosa; quando eu marco o
    hábito, o arco-íris sobe por dentro dela e solta uma explosão de brilhos.
  - O arco-íris aparece em todo canto: na faixa do topo de progresso, na barra de XP, no botão
    principal, no "+", na aba atual e no heatmap, que vai do amarelo ao roxo.
  - Hoje é um arco-íris, a Loja um sorvete, o Perfil a cabeça de unicórnio, a estrela um brilho de
    quatro pontas, o Automatizado um chifre e o logo o unicórnio de óculos escuros.

## Quão perto do jogo um tema chega

- Um tema fica o mais perto possível do jogo no visual, e muda só o mínimo para não ser uma cópia. *(1e)*
  Por quê: o app é privado e restrito às pessoas que eu convido; o que eu quero é sentir que estou no jogo.
- **Pode:** a paleta, o clima e o estilo das telas do jogo; o nome do jogo no tema; fontes de fã que
  imitam a letra do jogo, mesmo sem licença clara; símbolos do jogo redesenhados por nós, com o
  mesmo formato e a mesma cor. *(1e)*
- **Não pode:** copiar a arte do jogo: o logo, os brasões, os personagens, sprites, ícones ou fontes
  tirados do jogo. *(1e)*
- Quando um símbolo é tão marcante que redesenhá-lo seria copiá-lo, a primeira opção é uma
  paródia: o mesmo arranjo com outra forma, como os três losangos no lugar da Triforce. *(1e)*

## O que um tema muda

- **Cores:** fundo, texto, bordas, a cor das ações, o topo de progresso, o dourado do prêmio, os tons do heatmap e as sombras. *(1e)*
- **Fontes:** a dos títulos, a dos textos e a dos números de progresso. Os tamanhos de letra não mudam. *(1e)*
- **Ícones temáticos:** as abas (Hoje, Loja, Perfil), o marcador de feito, o "+", a estrela, o selo Automatizado e a moeda de ouro. *(1e)*
- **Logo:** a que aparece dentro do app e o ícone da aba do navegador. *(1e)*
- **Formas e movimento:** cantos mais quadrados ou mais redondos, espessura das bordas, o estilo das sombras, a forma do marcador e das células do heatmap, e o ritmo das animações. *(1e)*
- **Detalhes de menu:** a placa da aba atual, o filete dos botões e os medalhões das conquistas no Perfil. *(1e)*

## O que um tema nunca muda

- **Os textos e os termos.** XP, ouro, régua, Automatizado e todo o resto têm o mesmo nome em qualquer tema. *(1e)*
  Por quê: o glossário vale para o app inteiro; o tema é só visual.
- **Os ícones de função:** voltar, seta de abrir, subir e descer, editar, arquivar, pausar, retomar e configurações. *(1e)*
  Por quê: quem usa o app vários dias por semana reconhece a ação sem ler.
- **O vermelho de excluir e de erro de ação.** Cada tema ajusta o tom para ficar legível, mas ele continua sendo só isso. *(1e)*
- **A regra de zero punição.** Nenhum tema usa vermelho, alerta ou animação de perda por hábito não feito. *(1e)*
- **O dourado é do prêmio.** XP, ouro, estrelas e Prêmio de Domínio usam a família do dourado do tema, e nada mais usa. *(1e)*
  A exceção é o ícone da moeda: ele pode ter a cor da moeda do jogo (a Rupee verde no Ocarina). O
  número do ouro continua dourado.
  Outra exceção é o arco-íris do Arco Iro: ele tem amarelo e vermelho, mas é só decoração (o marcador,
  as barras, os botões, o heatmap). Nenhum texto fica em cima dele, e ele nunca avisa nem pune
  nada. *(1e)*
- **Tamanhos que garantem o toque:** alvos de toque, espaçamento e a estrutura das telas. *(1e)*
- **Leitura:** em qualquer tema, o texto passa no contraste mínimo de acessibilidade (WCAG AA). *(1e)*

## Como eu escolho

- Eu escolho o tema no Perfil, numa seção "Tema" com cada tema mostrado só pelo nome, o atual marcado. *(1e)*
  Por quê: a amostra das cores e o texto explicativo amontoavam a seção; o tema muda na hora, então tocar já mostra como ele fica.
- O tema muda na hora que eu toco, sem pedir confirmação. Eu posso voltar atrás quantas vezes quiser. *(1e)*
- Enquanto só existir o Ameixa, a seção "Tema" não aparece. *(1e)*
  Por quê: uma escolha com uma opção só é ruído.
- O tema é meu. Cada pessoa do grupo escolhe o dela e ninguém vê o tema de outra. *(1e)*
- Meu tema vale em qualquer aparelho em que eu entrar, e não só naquele em que eu escolhi. *(1e)*
- Quem nunca escolheu fica no tema que o admin escolheu no convite; sem escolha, no Ameixa. *(1e)*
- A tela de entrada, antes do login, usa o último tema escolhido naquele aparelho; se não há, o Ameixa. *(1e)*

## O que não muda com o tema

- O ícone do app na tela inicial do celular é o do Ameixa em qualquer tema. *(1e)*
  Por quê: o celular guarda esse ícone quando o app é instalado, e o app não consegue trocá-lo depois.
