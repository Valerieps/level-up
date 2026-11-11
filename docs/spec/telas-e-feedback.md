# Telas, navegação e feedback

Como o app se organiza: as abas, o que cada tela mostra e como o app comemora. A tela principal é
ferramenta, não vitrine: eu quero marcar e sair.

- **Entra aqui:** as abas, a profundidade da navegação, o conteúdo e os estados da Hoje, do
  Detalhe, do Perfil, de Configurações e da Entrada, e a camada de feedback (ganhos e celebrações).
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
4. **Heatmap.** *(1d)*
5. **Ações:** Subir a régua · Baixar a régua · Pausar este hábito · Editar · Arquivar. *(1a;
   pausar 1b)*

## Perfil

1. **Nível** e o XP até o próximo. *(1a)*
2. **Conquistas:** as trilhas Automatizados e Coragem lado a lado. *(1c)*
3. **Heatmap geral.** *(1d)*
4. **Hábitos arquivados**, com a contagem: uma seção recolhível que abre a lista ali mesmo; cada
   item leva ao detalhe do arquivado. *(1a)*
5. **Tema**, a escolha do visual do app (`spec/temas.md`). *(1e)*

## Configurações

- Virada do dia. *(1a)*
- Modo Pausa: o estado do app e a lista de hábitos pausados, cada um com "Voltar". *(1b)*
- Conta: e-mail e "Sair". *(1a)*
- Para o admin: Membros e Convites. *(1a)*

## Entrada

- Aparece só sem sessão: a frase do app e o botão "Continuar com Google". Sem formulário de perfil.
  *(1a)*

## Feedback

| Momento | Como aparece | Interrompe? |
| --- | --- | --- |
| Conclusão | "+10 XP · +5 ouro" junto ao item, por cerca de 1 s | Não *(1a)* |
| Avanço do contador | Só o contador muda | Não *(1a)* |
| Subiu de nível | Celebração curta no topo, some sozinha | Não *(1a)* |
| Automatizado + Prêmio de Domínio | Celebração com o nome do hábito e o ouro, e "Ver opções de régua" | Sim, uma vez; fecha com um toque *(1c)* |
| Conquista | Celebração com o selo e o ouro | Sim, uma vez *(1c)* |
| Estrela de Coragem | Confirmação na própria folha de régua | — *(1c)* |
| Ajuste feito | "Boa escolha. Hábito do tamanho certo é hábito que fica." | Não *(1c)* |
| Volta da pausa | "Que bom te ver! Tudo continua de onde parou." | Não *(1b)* |
| Desmarcar, voltar de nível | Só os números mudam | Não *(1a)* |

- Quando uma conclusão gera vários momentos (nível, domínio, conquista), eles aparecem numa única
  celebração empilhada, do menor para o maior, nunca em telas seguidas. *(1c)*

## Mensagens que precisam estar visíveis

- "Não há punição": no primeiro uso da Hoje, no heatmap sem vermelho e no streak que zera sem
  mensagem. *(1a)*
- "Ouro vira prêmio real": o saldo sempre visível no topo da Hoje. *(1a)*
- "Pode pausar sem perder nada": o botão de pausa a um toque na Hoje. *(1b)*
- "Dia ruim também conta": o campo de versão mínima no cadastro. *(1b)*
- "Hábito fácil vira Automatizado" e "Coragem rende para sempre": o selo, as estrelas, os convites e
  as trilhas. *(1c)*
