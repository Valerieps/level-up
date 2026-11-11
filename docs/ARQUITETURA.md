# Arquitetura

O desenho técnico que o código não mostra sozinho.

- **Entra aqui:** as invariantes (o que precisa ser sempre verdade), o modelo de dados, o fluxo de
  eventos e as migrações.
- **Não entra aqui:** um passeio pelos arquivos (o código mostra), o porquê de cada decisão (`adr/`),
  o que falta construir (`ROADMAP.md`) e as regras de produto (`spec/`).

## Visão geral

- **App:** web app (Vite + React + TypeScript), instalável (PWA). Fala só com a própria origem.
- **Servidor:** um Cloudflare Worker serve os arquivos do app, a API em `/api`, a conexão ao vivo e
  o cron. Todos os dados do grupo ficam num único Durable Object, `Group`, com SQLite. Ver ADR-004.
- **Login:** Google, pelo fluxo de código OAuth no Worker, com cookie de sessão. Ver ADR-005.

```
app (celular) ──POST /api/query|command──► Worker ──RPC──► Group (Durable Object, SQLite)
     ▲                                       ▲                    │
     └──────── WebSocket /api/live ──────────┘                    │ "mudou: members, invites…"
                                             cron 5 min ──► tick  ▼
                                                     todos os apps abertos refazem a consulta
```

## Camadas

`domain` ← `application` ← `infrastructure` e `ui`, no app e no servidor.

- `src/domain/`: regras puras e os textos da interface (`strings.ts`). O app e o servidor usam o
  mesmo código.
- `src/application/api-contract.ts`: os nomes, entradas e saídas das consultas e dos comandos. É só
  tipo; o servidor importa com `import type`.
- `server/application/`: os casos de uso do servidor. Síncronos, dependem só das portas `Sql`,
  `Clock` e `IdGenerator`; os testes rodam sobre `node:sqlite`.
- `server/infrastructure/` e `server/entry/`: Cloudflare, Google, cookies. Finos.
- A interface chama `Backend` e `LiveUpdates` (portas em `src/application/ports.ts`), nunca a rede
  direto.

## Invariantes

- Só o servidor grava. O app não tem acesso ao banco; toda escrita é um comando que o `Group`
  confere (sessão, papel, regra) e grava numa transação só.
- Um comando roda sozinho: o Durable Object processa uma chamada por vez, e tudo o que o comando
  causa entra junto ou não entra.
- Papéis são conferidos no servidor, nunca só na interface.
- Cada linha de hábito, progresso, conquista, pausa e loja pertence a um membro. Um comando só lê
  e grava as linhas do membro da sessão; o admin também não vê as dos outros (ADR-008).
- XP e ouro nunca caem por falta. Só desmarcar devolve, e devolve exatamente o que a conclusão
  rendeu; o ouro nunca fica negativo.
- "Hoje" sai sempre de `dayOf(instante, fuso, virada)` (ADR-009), no app e no servidor.
- Sempre existe pelo menos um admin.
- A sessão vale só enquanto o membro está ativo. Remover alguém apaga as sessões dele e fecha os
  WebSockets abertos (o comando devolve `disconnect`), então o acesso acaba na hora.
- Um comando devolve os tópicos (`Topic`) que mudou. Os tópicos do grupo (`members`, `invites`)
  vão para todos os apps abertos; os outros, só para os apps do próprio membro (ADR-008). Os apps
  refazem as consultas desses tópicos.

## Modelo de dados

| Tabela | Campos principais | Observação |
| --- | --- | --- |
| `members` | `id`, `google_sub`, `email`, `name`, `photo_url`, `roles` (JSON), `active` | Removido fica com `active = 0`; um convite novo traz o mesmo membro de volta |
| `sessions` | `token_hash`, `member_id`, `expires_at` | Só o SHA-256 do token; o cron apaga as vencidas |
| `invites` | `email`, `invited_by`, `state` (`pending`, `accepted`, `revoked`) | Um por e-mail |
| `member_settings` | `member_id`, `day_turnover` (minutos), `time_zone` (IANA), `last_closed_day`, `yesterday_reviewed_on`, `theme` | O dia de cada membro (ADR-009). O app manda o fuso do aparelho em todo comando; o cron fecha o dia de quem passou da virada. `yesterday_reviewed_on` é o "hoje" em que o membro fechou a revisão de ontem. `theme` é o tema visual que o membro escolheu (ADR-012) |

As tabelas abaixo são o desenho do LevelUp; cada uma entra numa migração junto com a feature que a
usa. Todas têm `member_id` e toda consulta filtra por ele (ADR-008).

| Tabela | Campos principais | Observação |
| --- | --- | --- |
| `progress` | `member_id`, `xp_total`, `gold`, `automated_count`, `courage_total` | Nível e XP do nível saem de `xp_total` pela curva; não se guarda o nível. As duas contagens das trilhas só crescem: excluir um hábito não tira o selo nem as estrelas dele |
| `habits` | `id`, `member_id`, `name`, `rule` (`daily`, `weekdays`, `free`), `difficulty`, `daily_goal`, `weekdays` (máscara), `minimum`, `stars`, `position`, `state` (`active`, `archived`), `archived_on`, `tier_started_on`, `streak_carry`, `automated_on`, `tier_mastered_on` | O patamar atual são as colunas de tamanho; `tier_started_on` é onde a janela de domínio e a do streak começam; `streak_carry` é o streak que atravessou a última mudança de régua (ADR-011); `automated_on` é o selo (permanente); `tier_mastered_on` diz que o patamar atual foi dominado e volta a nulo a cada mudança de régua ou de regra |
| `habit_tiers` | `habit_id`, `tier` (`dificuldade:meta:dias por semana`, de `tierKey`), `first_on`, `mastered_on` | Cada patamar que o hábito já teve: decide se uma subida rende estrela e se o Prêmio de Domínio já foi pago |
| `completions` | `id`, `member_id`, `habit_id`, `day`, `count`, `done`, `minimum`, `xp`, `gold` | Uma linha por hábito e dia. `xp` e `gold` guardam o que a conclusão rendeu, para desmarcar devolver o mesmo |
| `pauses` | `id`, `member_id`, `habit_id` (nulo = app inteiro), `kind` (`pause`, `archive`), `from_day`, `until_day` (a data de volta, fora da pausa; nulo = sem prazo), `ended_on` (o dia do "Voltar", ainda dentro) | Uma pausa ou o tempo em que um hábito ficou arquivado: os dois congelam o streak (ADR-011) |
| `invitations` | `habit_id`, `kind` (`raise`, `adjust`), `dismissed_on` | O último "Agora não" de cada convite; se o convite aparece é calculado |
| `achievements` | `member_id`, `track` (`automated`, `courage`), `milestone`, `reached_on`, `gold` | Uma linha por marco atingido; nunca apagada |
| `rewards` | `id`, `member_id`, `name`, `cost` | |
| `redemptions` | `id`, `member_id`, `reward_id`, `name`, `cost`, `day`, `at` | Nome e custo copiados no resgate; `day` é o dia do membro no resgate. Sem chave estrangeira para `rewards`: o resgate sobrevive à exclusão da recompensa |
| `milestones` | `member_id`, `habit_id`, `day`, `kind` (`mastered`, `raised`) | Os marcadores do heatmap |

Streak, ritmo, última vez, a janela de domínio, os convites de régua e o heatmap são calculados a
partir de `completions`, `pauses`, `habit_tiers` e `invitations` por funções puras de `src/domain/`;
nada disso é guardado. Só o momento do domínio é gravado, porque o selo e os prêmios são permanentes.

## Fluxo de eventos

- `completions` é o histórico: marcar grava ou atualiza a linha do dia; desmarcar a apaga e devolve
  `xp` e `gold` (o ouro para em 0). Desmarcar só alcança a linha do "hoje" do membro, então a trava
  dos desmarques de ontem vem da virada sem gravar nada. A única escrita em ontem é
  `day.reviewYesterday`, uma vez por dia, que conclui de uma vez os hábitos escolhidos na revisão.
- Uma conclusão (marcar ou revisar) confere o domínio na mesma transação: ao atingir, grava o
  momento (`habits`, `habit_tiers`, `milestones`), paga o Prêmio de Domínio e os marcos de
  Automatizados (`achievements`, `progress`). `habit.resize` confere a estrela e os marcos de
  Coragem. Desmarcar não desfaz nada disso.
- O comando devolve os eventos de feedback (nível em `levelUp`; Automatizado e conquista em
  `celebrations`, do menor para o maior) para a tela mostrar; eles não são guardados.
- A virada do dia (ADR-009) roda no `tick` do cron, por membro, e avisa os apps (`day`) para
  refazerem as consultas. Streak, "Faz tempo", os convites de régua e o fim de uma pausa na data de
  volta não precisam de gravação: são calculados.

## Migrações

`MIGRATIONS` em `server/application/schema.ts` é uma lista numerada; o `Group` aplica as que faltam
ao iniciar, cada uma numa transação, e registra em `schema_migrations`. Uma migração publicada nunca
muda: a mudança seguinte é uma migração nova. Remover uma coluna leva duas versões: primeiro o código
para de usar, depois a coluna sai. A classe do Durable Object tem suas próprias migrações no
`wrangler.jsonc` (`tag`), que também só crescem.
