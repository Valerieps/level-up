# Telas, navegação e feedback

Como o app se organiza: as abas, o que cada tela mostra e como o app comemora. A tela principal é
ferramenta, não vitrine: eu quero marcar e sair.

- **Entra aqui:** as abas, a profundidade da navegação, o conteúdo e os estados da Hoje, do
  Detalhe, do Perfil, de Configurações e da Entrada, e a camada de feedback (ganhos, celebrações,
  animações, vibração e sons).
- **Não entra aqui:** as regras de cada ação (cada feature no seu arquivo de `spec/`), os valores
  visuais (`docs/UI.md` e `src/ui/theme/tokens.css`). Os rascunhos das telas estão em
  `docs/rascunhos/telas/`; quando divergem daqui, vale o spec.

## Em aberto

(nada por enquanto)

## Navegação

- Uma barra inferior com três abas: **Hoje · Loja · Perfil**. Configurações fica no Perfil, pelo
  ícone de engrenagem. *(1a; Loja 1d)*
  Por quê: cobre tudo o que eu faço sem menu em cascata. A interação entre pessoas, depois do MVP,
  entra como uma quarta aba entre Loja e Perfil, sem mexer na Hoje.
- No máximo dois níveis a partir de uma aba: aba → detalhe → folha. *(1a)*
- Folhas (que sobem de baixo) para ações curtas: subir e ajustar a régua, pausar, dia do heatmap,
  recompensa. Tela cheia só para o cadastro, a edição e o detalhe do hábito. *(1a)*
- Modal que bloqueia só para confirmar uma exclusão. Convites nunca são modais. *(1a)*
- O admin chega a Membros e Convites por Configurações. *(1a)*

## Hoje

Ordem, de cima para baixo:

1. **Topo**, fixo ao rolar: nível, barra de XP, saldo de ouro e o botão de pausa. *(1a; pausa 1b)*
2. **Hoje:** os diários e os de dias específicos de hoje ainda não feitos, na ordem que eu arrasto.
   Os pausados ficam no fim, sem destaque, como "opcional". Um hábito com meta mostra o contador.
   *(1a; pausados 1b)*
   - Para arrastar, eu seguro o item fora do marcador; o toque longo no marcador continua sendo a
     versão mínima. Solto onde quero e a ordem fica salva. No teclado, a tecla de menu pega o item,
     as setas movem, Enter solta e Esc desiste. *(1a)*
   - Só os itens desta seção se arrastam. Os livres, os pausados e os concluídos ficam onde estão
     entre os meus hábitos, e um hábito arquivado volta para o lugar que tinha. *(1a)*
3. **Hábitos livres:** os livres disponíveis hoje, recolhível, com os "Faz tempo" no topo e a
   contagem quando recolhido. *(1a; "Faz tempo" 1b)*
4. **Mostrar concluídos**, no fim da lista. *(1a)*

- O "+" de criar hábito fica fixo no canto de baixo. *(1a)*
- Primeiro uso, sem hábitos: uma frase com a ideia do app e um único botão, "Criar meu primeiro
  hábito", com exemplos (água, leitura, "Ficar sem refrigerante"). Tocar num exemplo abre o cadastro
  já preenchido. Sem tutorial. *(1a)*
- Tudo feito hoje: uma mensagem positiva curta no lugar da lista; "Mostrar concluídos" continua
  ali. *(1a)*
- Nada programado para hoje: "Nada programado para hoje", com Hábitos livres aberto. *(1a)*
- Na primeira abertura do dia, se ficou algo de ontem sem marcar, a revisão de ontem sobe por cima
  do Hoje (`registrar-o-dia.md`, "Revisar ontem"). *(1a)*

## Detalhe do hábito

Ordem, de cima para baixo:

1. **Cabeçalho:** nome, regra de tempo e dificuldade em linguagem simples ("Fácil · seg, qua,
   sex"), o selo Automatizado e as estrelas. *(1a; selo e estrelas 1c)*
2. **Convite**, quando houver: subir ou ajustar a régua, nunca os dois. *(1c)*
3. **Consistência:** streak (programados) ou Ritmo e Última vez (livres), e a versão mínima, se
   existir. *(1b)*
   - Enquanto o patamar atual não foi dominado, o caminho até o selo: "10 de 12 rumo ao
     Automatizado" nos programados, "10 de 14 rumo ao Automatizado" nos livres. A conta é a mesma
     do domínio (`spec/streak-e-dominio.md`). Na Hoje, nada disso aparece. *(1f)*
     Por quê: ver a meta chegando perto faz o esforço crescer no fim, sem cobrar nada de quem parou.
4. **Heatmap.** *(1d)*
5. **Ações:** Subir a régua · Baixar a régua · Pausar este hábito · Editar · Arquivar. *(1a;
   pausar 1b)*

## Perfil

1. **Eu e o meu nível:** a foto (ou a inicial), o nome, o nível e quanto XP falta para o próximo,
   num bloco só. A barra de XP e o ouro ficam no topo da Hoje, sem repetir aqui. Pausar fica em
   Configurações e no topo da Hoje. *(1a)*
2. **Conquistas:** as trilhas Automatizados e Coragem lado a lado. *(1c)*
3. **Heatmap geral.** *(1d)*
4. **Hábitos arquivados**, com a contagem: uma seção recolhível que abre a lista ali mesmo; cada
   item leva ao detalhe do arquivado. *(1a)*
5. **Tema**, a escolha do visual do app (`spec/temas.md`). *(1e)*

## Configurações

- Virada do dia. *(1a)*
- Vibração e Sons, cada um com sua chave (ver "Movimento, vibração e som"). *(1f)*
- Modo Pausa: o estado do app e a lista de hábitos pausados, cada um com "Voltar". *(1b)*
- Conta: e-mail e "Sair". *(1a)*
- Para o admin: Membros e Convites. *(1a)*

## Entrada

- Aparece só sem sessão: o logo, a frase do app e o botão "Continuar com Google". Sem formulário
  de perfil. *(1a; logo 1e)*

## Feedback

| Momento | Como aparece | Interrompe? |
| --- | --- | --- |
| Conclusão | "+10 XP · +5 ouro" junto ao item, por cerca de 1 s. O ouro voa do item até o saldo do topo, que sobe | Não *(1a; voo 1f)* |
| Avanço do contador | O marcador vira um anel que fecha por partes (3 de 8 = 3/8 do anel); a última vez fecha o anel com o estouro da conclusão | Não *(1a; anel 1f)* |
| Versão mínima | Uma animação própria, mais suave que a da conclusão: o marcador enche pela metade, com um brilho | Não *(1f)* |
| Perto do próximo nível | Faltando menos de 10% do XP do nível, a barra de XP brilha devagar | Não *(1f)* |
| Subiu de nível | O número do nível gira para o novo no topo; depois, a celebração curta, que some sozinha | Não *(1a; giro 1f)* |
| Primeiro passo | Na minha primeira conclusão no app: "Primeiro passo!", curto, no topo | Não *(1f)* |
| Dia fechado | Os concluídos se recolhem num selo do dia e a mensagem de tudo feito entra no lugar da lista | Não *(1f)* |
| Recompensa ao alcance | "Agora dá: Sobremesa especial", curto, no topo; um toque leva à Loja | Não *(1f)* |
| Recorde de streak | "Seu maior streak: 15!", curto, no topo | Não *(1f)* |
| Automatizado + Prêmio de Domínio | Celebração com o nome do hábito e o ouro, e "Ver opções de régua". O selo é carimbado no hábito e o ouro cai no saldo | Sim, uma vez; fecha com um toque *(1c; carimbo 1f)* |
| Conquista | Celebração com o selo e o ouro | Sim, uma vez *(1c)* |
| Estrela de Coragem | Confirmação na própria folha de régua: a estrela apagada ao lado do XP novo acende e voa até o hábito | — *(1c; animação 1f)* |
| Ajuste feito | "Boa escolha. Hábito do tamanho certo é hábito que fica.", com uma animação morna e lenta, sem dourado | Não *(1c; animação 1f)* |
| Resgate | As moedas saem do saldo e entram no cartão da recompensa, com "Merecido." | Não *(1f)* |
| Volta da pausa | "Que bom te ver! Tudo continua de onde parou." A lista entra em cascata | Não *(1b; cascata 1f)* |
| Desmarcar, voltar de nível | Só os números mudam; nada anima, vibra ou soa | Não *(1a)* |

- Quando uma conclusão gera vários momentos (nível, domínio, conquista), eles aparecem numa única
  celebração empilhada, do menor para o maior, nunca em telas seguidas. *(1c)*
- Os momentos curtos (primeiro passo, recompensa ao alcance, recorde de streak) que chegam juntos
  aparecem num só aviso, um por linha. Quando a mesma conclusão abre uma celebração empilhada, eles
  entram nela como linhas. *(1f)*

### Momentos novos

- **Primeiro passo:** a minha primeira conclusão no app, do hábito ou da versão mínima, também pela
  revisão de ontem. Acontece uma vez na vida, mesmo que eu desmarque depois. *(1f)*
- **Dia fechado:** quando eu marco o último hábito programado de hoje (diários e de dias
  específicos, sem os pausados). Os livres não contam; num dia sem programados não há dia fechado.
  Acontece uma vez por dia: desmarcar e marcar de novo não repete. Uma conclusão pela revisão de
  ontem não fecha o dia de ontem. *(1f)*
  Por quê: a memória guarda o pico e o fim; o dia termina num momento bom.
- **Recompensa ao alcance:** quando um ganho de ouro (conclusão, Prêmio de Domínio ou conquista)
  faz o saldo, que estava abaixo do custo de uma recompensa, chegar a ele. Se várias ficam ao
  alcance de uma vez, aparece a mais cara. Depois de um resgate, a mesma recompensa pode avisar de
  novo. *(1f)*
  Por quê: liga o esforço de hoje ao prêmio real.
- **Recorde de streak:** no dia em que o streak de um hábito passa o maior streak que ele já teve,
  desde que o novo seja de pelo menos 7. Nos dias seguintes da mesma sequência, não repete. Quando
  o streak zera, nada aparece. *(1f)*
  Por quê: celebra o que eu construí, sem me fazer temer perdê-lo.
- A mensagem de tudo feito e as dos momentos curtos variam: o app sorteia entre várias, sem repetir
  a última. *(1f)*
  Por quê: a surpresa fica no jeito de comemorar, nunca no tamanho do prêmio.

### Movimento, vibração e som

- O app anima, vibra e soa só pelo que eu fiz. Nada disso acontece por um hábito não feito, e não
  existe contagem regressiva, aviso de streak em risco nem prêmio sorteado. *(1f)*
  Por quê: zero punição vale também para o que eu sinto.
- Três intensidades, cada uma com seu jeito de animar, vibrar e soar *(1f)*:

  | Intensidade | Momentos |
  | --- | --- |
  | Leve | Conclusão, avanço do contador, versão mínima, ajuste feito |
  | Média | Subiu de nível, primeiro passo, dia fechado, recompensa ao alcance, recorde de streak, estrela de Coragem, resgate |
  | Forte | As celebrações que interrompem (Automatizado, conquista) |

- **Vibração:** ligada por padrão; desligo em Configurações. Num aparelho que não vibra (o iPhone,
  no navegador), a chave não aparece. *(1f)*
- **Sons:** desligados por padrão; ligo e desligo em Configurações. São curtos e tocam nos mesmos
  momentos da vibração. *(1f)*
- As duas chaves valem para a minha conta em qualquer aparelho, como o tema. *(1f)*
- Com o "reduzir movimento" do aparelho ligado, as animações somem e os números mudam direto; a
  vibração e os sons seguem as chaves. *(1f)*
- Cada tema dá o seu jeito ao movimento e ao som (`spec/temas.md`); os momentos e as intensidades
  são os mesmos em todo tema. *(1f)*

## Mensagens que precisam estar visíveis

- "Não há punição": no primeiro uso da Hoje, no heatmap sem vermelho e no streak que zera sem
  mensagem. *(1a)*
- "Ouro vira prêmio real": o saldo sempre visível no topo da Hoje. *(1a)*
- "Pode pausar sem perder nada": o botão de pausa a um toque na Hoje. *(1b)*
- "Dia ruim também conta": o campo de versão mínima no cadastro. *(1b)*
- "Hábito fácil vira Automatizado" e "Coragem rende para sempre": o selo, as estrelas, os convites e
  as trilhas. *(1c)*
