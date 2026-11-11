# Glossário

Um termo, um sentido. Estes nomes valem para os textos da interface e para as docs.

- **Entra aqui:** cada termo do app, com uma definição curta, o arquivo de `spec/` que o usa e os
  nomes que não devem ser usados no lugar dele.
- **Não entra aqui:** as regras em si, que ficam em `spec/`. Se uma definição daqui e uma regra
  divergirem, vale o spec, e o termo daqui é corrigido.

## Acesso

- **Admin:** membro que convida, remove, dá papéis e vê a lista de membros. Sempre há pelo menos um.
  (`spec/acesso-e-membros.md`)
- **Convite:** permissão para um e-mail entrar; pendente, aceito ou revogado. (`spec/acesso-e-membros.md`)
- **Grupo:** todas as pessoas que podem entrar no app; há um só. Cada uma vê só os próprios dados.
  (`spec/acesso-e-membros.md`)
- **Membro:** quem entrou no grupo com um convite. (`spec/acesso-e-membros.md`)

## Hábitos e o dia

- **Hábito:** qualquer item do app, algo que se repete. Não usar: tarefa, diária, missão. (`spec/habitos.md`)
- **Regra de tempo:** Diário, Dias específicos ou Livre. (`spec/habitos.md`)
- **Meta diária:** quantas vezes um hábito diário precisa ser feito no dia; com mais de 1, aparece
  um contador (3/8). (`spec/habitos.md`)
- **Dificuldade:** Trivial, Fácil, Média ou Difícil. Não usar "dificuldade" como nome genérico do
  tamanho do hábito: isso é a régua. (`spec/habitos.md`)
- **Versão mínima:** o hábito em tamanho de dia ruim. Não usar: modo fácil, mini. (`spec/habitos.md`)
- **Hoje:** a seção com os diários e os de dias específicos do dia; também o nome da aba. Não usar:
  ativos, dashboard. (`spec/telas-e-feedback.md`)
- **Hábitos livres:** a seção dos hábitos sem dia programado. Não usar na interface: deck,
  oportunidades. (`spec/telas-e-feedback.md`)
- **Revisar ontem:** a pergunta "Ficou algo de ontem?", na primeira abertura do dia, para marcar o
  que ficou sem marcar ontem. Não usar: atrasados, pendências. (`spec/registrar-o-dia.md`)
- **Feito / Concluídos:** a ação de marcar / a lista do que foi feito hoje. Não usar: completar,
  check. (`spec/registrar-o-dia.md`)
- **Virada do dia:** o horário em que o meu dia termina. Não usar: reset. (`spec/registrar-o-dia.md`)

## Consistência e domínio

- **Streak:** dias programados seguidos em que o hábito foi feito. Não usar: sequência, combo.
  (`spec/streak-e-dominio.md`)
- **Ritmo · Última vez:** as métricas dos hábitos livres. Não usar: frequência. (`spec/streak-e-dominio.md`)
- **Faz tempo:** etiqueta de um livre parado há mais de 10 dias. Não usar: atrasado, esquecido.
  (`spec/streak-e-dominio.md`)
- **Automatizado:** o selo de domínio de um hábito. Não usar: dominado, mestre. (`spec/streak-e-dominio.md`)
- **Patamar:** um tamanho de hábito (dificuldade, meta e dias); cada patamar tem seu próprio
  domínio. Termo das docs, não aparece na interface. (`spec/regua.md`)

## Régua e prêmios

- **Régua · Subir a régua · Baixar a régua · Ajustar a régua:** o tamanho do hábito e suas mudanças.
  Não usar: nível do hábito. (`spec/regua.md`)
- **Estrela de Coragem · Total de Coragem:** o bônus permanente por subir a régua de um hábito
  dominado / a soma das estrelas de todos os hábitos. "Bônus de Coragem" é a fórmula e não aparece
  na interface. (`spec/regua.md`)
- **XP · Ouro · Nível:** o progresso que nunca cai por falta; ouro se troca na Loja. (`spec/progressao.md`)
- **Prêmio de Domínio:** o ouro pago ao atingir o domínio de um patamar. (`spec/progressao.md`)
- **Conquistas · Automatizados · Coragem:** os marcos de longo prazo e suas duas trilhas. Não usar:
  medalhas, troféus. (`spec/conquistas.md`)
- **Loja · Recompensa · Resgatar:** prêmios da vida real comprados com ouro. Não usar: comprar.
  (`spec/loja.md`)

## Aparência

- **Tema:** o visual completo do app (cores, fontes, ícones e logo), com nome de um jogo; cada pessoa
  escolhe o seu. Não usar: skin, modo. (`spec/temas.md`)

## Pausa

- **Modo Pausa · Pausar · Voltar:** congelar o app ou um hábito sem custo, e retomar. Não usar:
  férias, folga. (`spec/modo-pausa.md`)
