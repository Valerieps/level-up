# Interface

Regras visuais e de uso que valem para toda tela do app.

- **Entra aqui:** as regras de interface que valem para todas as telas, e onde cada uma é conferida.
- **Não entra aqui:** os valores (cores, tamanhos: ficam em `src/ui/theme/tokens.css`), o que cada
  tela faz (`docs/spec/`) e rascunhos de tela (`docs/rascunhos/`).

## O que o build confere

`src/ui/theme/tokens.test.ts` roda no `npm test` e no `npm run build`, e falha quando uma regra
abaixo é quebrada. Ao corrigir, use um token. Se nenhum servir, crie um no `tokens.css` (num token
de tema, em todos os temas). Nunca afrouxe o teste.

1. **Nenhum valor solto fora do `tokens.css`:** cor (hex, `rgb()`, `white`), comprimento (`px`,
   `rem`, `em`), duração, tamanho, peso ou altura de linha de fonte. Isso vale para CSS, para TSX e
   para `style={{}}` (percentagens podem).
2. **Só tokens que existem:** um `var(--x)` sem definição falha.
3. **Escala tipográfica:** cada tamanho é de 1,125 a 1,5 vez o anterior. Os tamanhos
   `--font-size-display*` (um número em destaque, o título de uma tela de abertura) podem saltar
   mais. Nada abaixo de 12px. O texto corrido tem pelo menos 16px.
4. **Espaçamento na grade de 4px.**
5. **Contraste AA em todos os temas:** texto com 4,5:1 sobre o fundo em que aparece. Borda de
   controle, anel de foco e ícone com 3:1. Uma cor nova que leva texto ou marca um controle entra na
   lista de pares do teste.
6. **Todo tema define os mesmos tokens** que o padrão (Ameixa), e nenhum redefine os fixos
   (escala tipográfica, `--space-*`, `--size-*`, anel de foco). Cada tema tem um modo só: não há
   tema escuro.
7. **Alvo de toque com 44px ou mais** (`--size-touch`).

## O que a revisão confere

Estas regras pedem julgamento. Quem revisa a interface (skill `ui-review`) olha estas, e não as de
cima.

**Hierarquia**
- Uma ação principal por tela (`<Button>` primário). As outras são `secondary`.
- Um `h1` por tela. Os níveis de título não pulam (`h1`, depois `h2`).
- Tamanho e peso marcam importância. Nunca três tamanhos diferentes no mesmo card.
- Coisas relacionadas ficam mais perto entre si do que de outros grupos (proximidade).

**Componentes**
- Use os de `src/ui/components/` (`Button`, `ButtonLink`, `Field`, `Notice`) antes de escrever
  CSS novo. Quando um padrão se repete em duas telas, ele vira componente.
- Todo campo tem rótulo visível. Placeholder não é rótulo.
- Ações que apagam ou removem usam `danger` e pedem confirmação.

**Estados**
- Toda lista e toda tela que carrega dados tem os estados vazio, carregando e erro. O vazio diz o
  que fazer em seguida.
- Botão que dispara uma ação fica desabilitado enquanto ela roda.

**Acessibilidade além do contraste**
- Tudo funciona pelo teclado, na ordem visual, com foco visível (`:focus-visible` no
  `global.css`).
- Ícone sem texto tem `aria-label`. Imagem decorativa tem `alt=""`.
- Cor nunca é o único sinal: erro também tem texto, e o estado ativo também tem forma ou peso.
- Animação respeita `prefers-reduced-motion` (o `global.css` já zera as durações).

**Layout**
- Funciona em 320px de largura sem rolagem horizontal. Texto longo (nome, e-mail) quebra ou corta
  com reticências, sem empurrar o layout.
- Conteúdo com no máximo `--size-content` de largura.

**Texto**
- Os textos da interface ficam em `src/domain/strings.ts`, com os termos do `docs/GLOSSARIO.md`.
- O botão diz o que acontece ("Enviar convite"), não "OK".

## Identidade Ameixa

A identidade do LevelUp (ADR-010) e o tema padrão (ADR-012). Um modo só, claro. O guia completo, com os componentes, está em
`docs/rascunhos/design-system/README.md`; estas são as regras que a revisão confere.

- **Calma por padrão, brilho no prêmio.** Fundo branco e texto ameixa. A cor forte fica em três
  lugares: o topo ameixa (`--color-top`), o laranja das ações (`--color-brand`) e o dourado do
  prêmio (`--color-gold*`). XP, ouro, estrelas e Prêmio de Domínio usam o dourado, e nada mais usa.
- **Zero punição também no visual.** Nada de vermelho, ícone de alerta ou animação de perda por
  hábito não feito. `--color-danger` existe só para excluir e para erros de ação.
- **Uma ação por item.** O marcador é o único controle de registro; o resto abre detalhe ou folha.
- **Números de progresso** (XP, ouro, nível, contador, streak) em `--font-mono`; títulos em
  `--font-display`.
- **Bordas finas em vez de sombras.** Sombra só no "+", nas folhas e nos toasts.
- **Ícones:** no Ameixa, estilo Tabler Icons: contorno, traço 2, pontas redondas. Em qualquer tema,
  20px nas abas e botões, 16px em pílulas, na cor do texto. Nunca emoji.
- **Texto:** frases curtas, segunda pessoa informal. Exclamação só em celebrações. Palavras
  proibidas em qualquer tela: falhou, perdeu, atrasado, quebrou, penalidade, dias perdidos.
- **Movimento:** o marcador preenche em `--duration-fast`, o ganho sobe e some em `--duration-gain`,
  o item sai em `--duration-base`; celebrações entram em `--duration-celebration`, sem confete
  contínuo. Os momentos do feedback (`docs/spec/telas-e-feedback.md`) usam os seus tokens
  (`--duration-coin-flight`, `--duration-level-roll` e os outros); a vibração e o som saem só de
  `feedback(intensidade)`, em `src/ui/feedback/`, que lê os números do tema e obedece às chaves.

## Identidade Stardew Valley

Um tema de jogo (ADR-012): inspirado no jogo de fazenda, nunca cópia. Os valores estão no bloco
`[data-theme='stardew']` do `tokens.css`; os ícones e o logo, em `src/ui/theme/stardew.tsx`.

- **Pergaminho, madeira e folha.** Fundo pergaminho, texto e topo de madeira escura, o verde-folha
  nas ações (`--color-brand`), o dourado só no prêmio.
- **Nada de toldo vermelho.** O vermelho continua só de excluir e de erro.
- **Fontes:** Pixelify Sans nos títulos e nos números de progresso, Nunito no texto.
- **Formas:** cantos quadrados, bordas de 2px, sombras duras sem desfoque, marcador e dia do
  heatmap quadrados.
- **Ícones em pixel art de uma cor**, na cor do texto: grade de 10x10 nos de 20px e de 8x8 nos de
  16px (o "feito" e a moeda), para cada pixel cair em 2 pixels da tela. Sem relevo nem degradê.
  Abas: sol nascendo atrás da cerca (Hoje), barraca de feira (Loja), chapéu de palha (Perfil);
  placa de madeira com "+", estrela, roseta de prêmio (Automatizado).

## Identidade Uppertale

Um tema de jogo (ADR-012): uma paródia do RPG indie, nunca cópia. Os valores estão no bloco
`[data-theme='uppertale']` do `tokens.css`; os ícones e o logo, em `src/ui/theme/uppertale.tsx`.

- **Tela preta, caixa de diálogo branca.** Fundo preto, texto e ações em branco (botão invertido,
  preto sobre branco), o amarelo puro do jogo só no prêmio.
- **O coração é branco, nunca vermelho.** O vermelho continua só de excluir e de erro.
- **Fontes:** Press Start 2P só nos títulos (larga demais para listas), Space Mono no texto e nos
  números de progresso.
- **Formas:** cantos retos, bordas de 2px, sem sombras (a folha ganha só uma borda branca no topo),
  animações em passos, como quadros de sprite.
- **O marcador é uma alma:** um coração de pixel vazio que se preenche quando feito
  (`--clip-marker` e `--clip-marker-checked`); por isso o "feito" não desenha nada por cima.
- **Abas como botões de batalha:** cada ícone numa caixa com borda (`--border-width-tab`).
- **Ícones em pixel art de uma cor**, grade de 10x10 (a moeda, 8x8). Abas: caixa de diálogo com
  "* ..." (Hoje), saco de itens (Loja), silhueta (Perfil); "+" grosso, o brilho de um ponto de
  salvar (estrela), coração com brilho (Automatizado), moeda com "G".

## Identidade Arco Iro

Um tema que não vem de jogo (`docs/spec/temas.md`): um unicórnio com personalidade demais. Os
valores estão no bloco `[data-theme='arcoiro']` do `tokens.css`; os ícones e o logo, em
`src/ui/theme/arcoiro.tsx`.

- **Papel creme, tinta quase preta, violeta nas ações, rosa forte nos detalhes** (`--color-focus`,
  a borda do marcador, a aba atual, os medalhões). O dourado continua do prêmio.
- **O arco-íris é decoração, nunca fundo de texto.** O vivo fica nos `--image-*` (marcador, botão
  principal, "+", barras, faixa do topo) e no heatmap; atrás de texto só a versão pastel (a aba atual).
- **Fontes:** Fredoka nos títulos, Nunito no texto e nos números de progresso.
- **Formas:** tudo arredondado, bordas finas cor de areia, sombras macias rosa e roxas, nunca duras.
- **O marcador é uma cabeça de unicórnio** (`--clip-marker`): o contorno rosa com o olho quando vazio;
  feito, a cabeça cheia, com o arco-íris subindo de baixo (`--image-marker-checked`) e uma explosão
  de brilhos (`--image-marker-burst`). Por isso o "feito" não desenha nada por cima.
- **Movimento:** com um pouco de quique (`--easing` passa do alvo e volta).
- **Ícones:** contorno de traço 2, pontas redondas. Abas: arco-íris (Hoje), sorvete (Loja), cabeça
  de unicórnio (Perfil); brilho de quatro pontas (estrela), chifre (Automatizado).

## Mudar a identidade visual

Mude só os valores do bloco do tema no `tokens.css`, sem renomear os tokens. No tema padrão,
mude também as mesmas cores no `index.html` e nos ícones instalados (`src/app-identity.test.ts`
confere). O `public/manifest.webmanifest` é um só e preto em todos os temas (ADR-012). Rode `npm test`: o teste de contraste diz qual par ficou
ilegível.

### Adicionar um tema

Um tema muda só o visual (`docs/spec/temas.md`, ADR-012).
Quão perto do jogo um tema chega, e o que pode e o que não pode, está em `docs/spec/temas.md`.

1. O id no fim de `THEME_IDS` em `src/domain/themes.ts` e o nome em `strings.themes`.
2. Um bloco `[data-theme='<id>']` no `tokens.css`, depois do Ameixa, com `color-scheme` e
   **todos** os tokens de tema do bloco Ameixa: cada `--color-*` (com `--color-browser-bar`), as
   três `--shadow-*`, as três famílias de fonte, pesos, alturas de linha, `--letter-spacing-display`,
   cada `--radius-*` (`--radius-marker` e `--radius-heat-cell` dizem se o marcador e o dia do heatmap
   são redondos ou quadrados), `--clip-marker*` (`none`, ou a forma do marcador recortada por
   `path()`), `--color-marker-fill` (o miolo do marcador vazio), `--border-width*` (com
   `--border-width-tab`, a caixa em volta do ícone da aba), os `--image-*` (`none`, ou uma imagem
   por cima da cor: o enchimento do marcador, os brilhos do marcador e das comemorações
   (`--image-burst`), o botão principal, o "+", as barras, a aba atual e o topo), `--easing`,
   `--easing-overshoot` (passa do alvo e volta; num tema em passos, `steps()`), cada `--duration-*`
   e `--easing-*` dos momentos (voo da moeda, anel do contador, giro do nível, brilho da barra de
   XP, dia fechado, cascata e o intervalo entre itens dela), as três `--vibrate-*` (leve, média,
   forte: padrões do `navigator.vibrate`, em milissegundos), o timbre dos sons (`--sound-wave`,
   `--sound-pitch` em Hz, `--sound-volume` de 0 a 1, `--sound-note`, a duração de cada nota) e
   `--opacity-*`.
   `--color-danger*` continua um vermelho reconhecível.
3. Fontes em `public/fonts`, num `@font-face` no `tokens.css`, com a licença ao lado (ou, numa
   fonte de fã sem licença, um `-NOTICE.txt` dizendo de onde veio e o que mudou). Confira os acentos
   do português: uma fonte sem `á`, `ç`, `ã` prontos mistura letras de outra fonte nos títulos.
4. A entrada em `THEMES` (`src/ui/theme/themes.tsx`): o estilo dos ícones, os ícones temáticos que
   o tema redesenha (os outros caem no desenho do Ameixa), o `Logo` (pintado com tokens, por
   classes no `global.css`) e o favicon em `public/themes/<id>/`. Uma moeda com cor própria (a Rupee
   do Ocarina) usa `tone: 'currency'` no estilo do ícone, e a cor vem de `--color-currency`.
5. `npm test`: o teste de tokens confere o bloco e o contraste do tema; o seletor Tema aparece no
   Perfil assim que há mais de um tema.

O ícone instalado na tela inicial é sempre o do Ameixa, e a barra de navegação do Android no app
instalado é sempre preta (o manifest é um só); o favicon e a cor da barra do navegador seguem o tema.
