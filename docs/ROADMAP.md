# Roadmap

O que ainda não está pronto.

- **Entra aqui:** o que falta construir, onde o código ainda não segue o spec, o que foi adiado de
  propósito e as lacunas do spec que o agente decidiu sozinho.
- **Não entra aqui:** o que já está pronto (quando uma linha fica pronta, ela sai daqui; o git e as
  issues fechadas guardam o histórico), bugs e débito técnico (issues do GitHub) e as regras (`spec/`).

## Falta construir

| Feature | Fase | Spec | Observação |
| --- | --- | --- | --- |
| Heatmap por hábito, geral e folha do dia | 1d | `spec/heatmap.md` | |
| Loja de recompensas | 1d | `spec/loja.md` | |

## O código ainda não segue o spec

- Identidade Ameixa (ADR-010) — as fontes Sora, Inter e JetBrains Mono ainda não estão empacotadas
  em `public/`; até lá o app usa as fontes do sistema.

## Adiado

- Funcionar sem internet (UC-81 do documento de casos de uso) — a dona escolheu um app online na
  fase 1; volta quando o uso mostrar que faz falta.
- Login com Apple e com e-mail — só Google no MVP.
- Interação entre as pessoas do grupo — fase 2, como uma quarta aba.

## Revisar as lacunas que o agente decidiu

- [ ] Revisar ontem: um hábito com contador conta inteiro ao ser marcado; fechar a revisão de
  qualquer jeito salva o que estiver marcado; hábitos criados hoje ficam de fora; o XP é o do
  tamanho atual do hábito (`spec/registrar-o-dia.md`).
- [ ] A virada do dia se escolhe em horas cheias, de meia-noite às 23h (`spec/registrar-o-dia.md`).
- [ ] Arrastar na Hoje: só os programados ainda não feitos e não pausados se arrastam; os livres,
  pausados, concluídos e arquivados guardam o lugar entre os hábitos; no teclado, tecla de menu e
  setas (`spec/telas-e-feedback.md`).
- [ ] Subir e baixar a régua (sem estrelas) entram já na fase 1a, porque a edição não muda
  dificuldade, meta nem dias (`spec/regua.md`, `spec/habitos.md`).
- [ ] Se a gravação de uma marcação não der certo, o app avisa e o item volta para a lista
  (`spec/registrar-o-dia.md`).
- [ ] O admin chega a Membros e Convites por Configurações (`spec/telas-e-feedback.md`).
- [ ] Em um diário com meta, a ocorrência conta para o domínio quando a meta foi atingida ou a
  versão mínima foi marcada (`spec/streak-e-dominio.md`).
- [ ] Excluir um hábito também não retira conquistas (`spec/conquistas.md`).
- [ ] Subir e baixar a régua mudam um passo por vez: uma dificuldade, uma vez a mais ou a menos na
  meta, um dia a mais ou a menos (`spec/regua.md`).
- [ ] O botão de pausa da Hoje e o de Configurações pausam o app inteiro; um hábito só se pausa pelo
  detalhe dele (`spec/modo-pausa.md`).
- [ ] Um livre pausado fica em Hábitos livres, marcado como "opcional", em vez de ir para o fim da
  Hoje (`spec/modo-pausa.md`).
- [ ] A mensagem de volta aparece uma vez na Hoje também quando a pausa do app termina sozinha na
  data marcada (`spec/modo-pausa.md`).
- [ ] O nome de um hábito tem até 80 caracteres e a meta diária vai até 99 (`spec/habitos.md`).
- [ ] Os exemplos do primeiro uso abrem o cadastro já preenchido (`spec/telas-e-feedback.md`).
- [ ] A data de volta de uma pausa é o primeiro dia de volta e precisa ser depois de hoje; só há uma
  pausa ativa do app e uma de cada hábito por vez; arquivar encerra a pausa do hábito
  (`spec/modo-pausa.md`).
- [ ] O Ritmo conta hoje entre os 30 dias; um livre nunca feito conta o "Faz tempo" desde a criação
  ou a última mudança de régua (`spec/streak-e-dominio.md`).
- [ ] A versão mínima tem até 80 caracteres, como o nome; um hábito que vira livre perde a versão
  mínima (`spec/habitos.md`).
- [ ] O convite de ajustar olha as 8 últimas ocorrências do patamar atual e espera haver 8; um dia
  em pausa feito mesmo assim conta como ocorrência no domínio; o convite de subir não aparece num
  hábito que já não tem como subir (`spec/regua.md`, `spec/streak-e-dominio.md`).
- [ ] Voltar a um patamar já dominado e dominá-lo de novo traz o convite de subir de volta, sem
  outro Prêmio de Domínio nem celebração (`spec/streak-e-dominio.md`).
- [ ] Qualquer ajuste feito pela folha "Ajustar a régua" (diminuir, versão mínima, dias, livre,
  pausar) também dispensa o convite de ajustar, que só volta depois de 4 semanas; "Mudar os dias"
  aceita trocar os dias ou ficar com menos, de uma vez (`spec/regua.md`).
- [ ] A celebração empilhada abre com o maior momento (a conquista, senão o domínio); o botão é "Ver
  conquistas" quando há conquista ou o hábito já não tem como subir, e "Ver opções de régua" abre a
  folha "Subir a régua" no detalhe (`spec/telas-e-feedback.md`).
