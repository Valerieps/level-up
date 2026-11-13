# Roadmap

O que ainda não está pronto.

- **Entra aqui:** o que falta construir, onde o código ainda não segue o spec, o que foi adiado de
  propósito e as lacunas do spec que o agente decidiu sozinho.
- **Não entra aqui:** o que já está pronto (quando uma linha fica pronta, ela sai daqui; o git e as
  issues fechadas guardam o histórico), bugs e débito técnico (issues do GitHub) e as regras (`spec/`).

## Falta construir

Nada do MVP (fases 1a a 1d) falta construir.

- Os próximos temas com nome de jogo, um por vez (`spec/temas.md`; quais e em que ordem está em "Em
  aberto" lá). Ameixa, Stardew Valley, Ocarina e Uppertale existem; como criar um tema está em `docs/UI.md`
  "Adicionar um tema".
- A camada de feedback, fase 1f (`spec/telas-e-feedback.md`, "Feedback"; `spec/temas.md`). Ordem
  abaixo.

### Camada de feedback (1f): ordem e prompts

O que já existe e serve de base: os tokens de movimento por tema (`--duration-*`, `--easing`) em
`src/ui/theme/tokens.css`; o `prefers-reduced-motion` que zera as durações em `global.css`; a
celebração empilhada (`useCelebration` e `mergeMoments` em `src/ui/components/Celebration.tsx`); o
ganho otimista da Hoje (`gains` em `src/ui/screens/Today.tsx`); o resultado da conclusão, que já
traz `levelUp` e `celebrations`; e a tabela `member_settings`, que guarda o tema.

A ordem economiza tokens assim: a onda 0 monta a base uma vez (tokens, um único ponto que dispara
animação, vibração e som, e as chaves), e as outras ondas só chamam essa base, sem reler a
arquitetura. Só a onda 2 mexe no servidor e no contrato da API, então ela vem inteira numa sessão.
As ondas 1 e 3 mexem em arquivos diferentes e podem rodar em paralelo depois da 0. A onda 4 só muda
valores de tokens, então fica por último e roda barata. Cada prompt é completo: abra uma sessão nova
por onda e cole o prompt.

1. **Onda 0, base** (Opus: arquitetura).

   ```text
   Build the base of the feedback layer of phase 1f. Read docs/spec/telas-e-feedback.md sections
   "Feedback" and "Movimento, vibração e som", docs/spec/temas.md "O que um tema muda", and the
   "Movimento" rule and "Adicionar um tema" in docs/UI.md. Then:
   1. Tokens, in src/ui/theme/tokens.css, for every theme block: the durations and easings the new
      moments need (coin flight, counter ring, level roll, XP-bar glow, day close, cascade), an
      overshoot easing, three vibration patterns (light, medium, strong) and the sound timbre
      (wave type, base pitch, volume), plus an --image-burst for theme sparkles (none by default).
      Tune values per theme only roughly; wave 4 tunes them. Update docs/UI.md "Adicionar um tema"
      with the new tokens. Keep tokens.test.ts passing without loosening it.
   2. One module, src/ui/feedback/, with feedback(intensity) that vibrates (navigator.vibrate,
      skipped where missing) and plays a short sound synthesized with Web Audio (no audio files,
      no dependency), both reading their numbers from the tokens of the current theme and obeying
      the member's switches. Unit tests with fakes.
   3. Settings: the next MIGRATIONS entry adds vibration (default on) and sound (default off) to
      member_settings; a query and a command like theme.set; the two switches in Configurações,
      the vibration one hidden where navigator.vibrate is missing. Texts in strings.ts. Tests on
      node:sqlite.
   Do not build the moments themselves (waves 1 to 3). Verify with npm run build.
   ```

2. **Onda 1, o ciclo da Hoje** (Sonnet: só cliente, depois da 0).

   ```text
   Build wave 1 of the feedback layer (phase 1f), client only, on the base in src/ui/feedback/
   and the motion tokens in src/ui/theme/tokens.css. Read docs/spec/telas-e-feedback.md, the rows
   "Conclusão", "Avanço do contador", "Versão mínima", "Perto do próximo nível" and "Subiu de
   nível" of the Feedback table, and "Movimento, vibração e som". Build in src/ui/screens/Today.tsx,
   src/ui/components/ProgressTop.tsx and global.css: the gold flying from the item to the balance,
   which then counts up; the marker as a ring filling by parts for daily goals; the softer
   half-fill animation of the minimal version; the slow glow of the XP bar under 10% left; the
   level number rolling to the new one before the existing toast. Call feedback('light') or
   feedback('medium') as the table's intensities say. No literal durations or colors: tokens only.
   Everything must vanish under prefers-reduced-motion. Verify with npm run build.
   ```

3. **Onda 2, os momentos novos** (Opus: regra de domínio, servidor e contrato, depois da 0).

   ```text
   Build wave 2 of the feedback layer (phase 1f): the new moments. Read docs/spec/telas-e-feedback.md
   "Momentos novos" and the Feedback table rows "Primeiro passo", "Dia fechado", "Recompensa ao
   alcance" and "Recorde de streak", plus docs/spec/streak-e-dominio.md "Streak". Follow "Adding a
   feature" in CLAUDE.md:
   1. Rules in src/domain/ with tests: first step (once per member, ever), day closed (last
      scheduled non-paused habit of today, once per day, not from the review of yesterday),
      reward in reach (balance crosses a reward's cost; the most expensive one; also on Prêmio de
      Domínio and conquista gold), streak record (passes the habit's best streak and is at least
      7, only on the day it passes). Persist whatever "once" needs with a new migration.
   2. Return these moments in the completion result of api-contract.ts, next to levelUp and
      celebrations, and in the review-of-yesterday result where the spec allows.
   3. UI: the short notice at the top (one line per moment, varied phrases from strings.ts drawn
      without repeating the last one), lines inside the stacked celebration when one opens, the
      day-closed collapse of Hoje, and feedback('medium') for each. The reward notice opens the
      Loja on tap.
   Tests on node:sqlite for the server. Verify with npm run build.
   ```

4. **Onda 3, detalhe, régua, Loja e pausa** (Sonnet: depois da 0; pode rodar junto com a 1).

   ```text
   Build wave 3 of the feedback layer (phase 1f), on src/ui/feedback/ and the motion tokens. Read
   docs/spec/telas-e-feedback.md: "Detalhe do hábito" item 3 and the Feedback rows "Automatizado +
   Prêmio de Domínio", "Estrela de Coragem", "Ajuste feito", "Resgate" and "Volta da pausa".
   Build: "10 de 12 rumo ao Automatizado" in the habit detail while the current patamar is not
   mastered (reuse the mastery count in src/domain; extend the detail query if needed, with tests);
   the Automatizado seal stamping on the habit; the dim star in "Subir a régua" that lights up
   and flies to the habit; the warm, slow, gold-free animation of an adjustment; the coins leaving
   the balance into the reward card with "Merecido."; the cascade of Hoje on the return from a
   pause. feedback() with the table's intensities. Tokens only, nothing under reduced motion.
   Verify with npm run build.
   ```

5. **Onda 4, o jeito de cada tema** (Sonnet: só tokens, depois de todas).

   ```text
   Tune the feedback layer (phase 1f) per theme, changing only values in src/ui/theme/tokens.css.
   Read docs/spec/temas.md "O que um tema muda" and each theme's section in docs/UI.md. Ameixa:
   calm and smooth. Stardew Valley: warm, soft. Ocarina: light chimes. Uppertale: steps like
   sprite frames, square-wave 8-bit sounds. Arco Iro: overshoot bounce, rainbow sparkles in
   --image-burst, bright sounds. Keep every theme inside the same intensities. Run npm test.
   ```

## O código ainda não segue o spec

Nada.

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
- [ ] A Loja mostra os 5 últimos resgates antes do "Ver tudo" e lista as recompensas da mais barata
  para a mais cara (`spec/loja.md`).
- [ ] A folha do dia mostra também as metas feitas só em parte ("1 de 3") e, como marcos, os
  domínios, as estrelas e as conquistas do dia; o marcador de régua no heatmap é só o da subida
  que rendeu estrela (`spec/heatmap.md`).
- [ ] No heatmap de um hábito, o dia cheio é o tom mais forte, a versão mínima o tom logo abaixo e
  uma meta feita em parte o tom mais fraco (menos da metade) ou o seguinte (metade ou mais); o dia
  de domínio ou de estrela ganha um contorno dourado. Tocar num dia do heatmap de um hábito também
  abre a folha do dia inteiro, com todos os hábitos. O heatmap rola para o lado dentro da tela,
  abrindo nas semanas mais recentes (`spec/heatmap.md`).
- [ ] Na Loja vazia, "Adicionar à Loja" cria a sugestão na hora, sem abrir a folha; "Resgatar" não
  pede confirmação; o "+" fica no cabeçalho da Loja (`spec/loja.md`).
- [ ] Temas: a fase se chama 1e; a seção "Tema" fica escondida enquanto só existe o Ameixa; a
  troca é na hora, sem confirmação; a tela de entrada usa o último tema daquele aparelho; o ícone
  instalado fica sempre o do Ameixa (`spec/temas.md`).
- [ ] Camada de feedback: a vibração começa ligada e o som desligado; as duas chaves valem para a
  conta, como o tema, e a de vibração some onde o aparelho não vibra; o primeiro passo não
  interrompe; o dia fechado conta só os programados não pausados, uma vez por dia, e não vem da
  revisão de ontem; a recompensa ao alcance mostra a mais cara e vale também para o ouro de
  domínio e de conquista; o recorde de streak começa em 7 e aparece só no dia em que passa o
  recorde; os momentos curtos que chegam juntos viram um aviso só; o caminho até o Automatizado
  fica só no detalhe; o tema muda também o timbre dos sons (`spec/telas-e-feedback.md`,
  `spec/temas.md`).
