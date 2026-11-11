# Progressão: XP, ouro e nível

Quanto cada conclusão rende e como eu subo de nível. O app premia; nunca tira.

- **Entra aqui:** as fórmulas de XP, ouro e nível, o arredondamento e o Prêmio de Domínio.
- **Não entra aqui:** quando o domínio acontece (`spec/streak-e-dominio.md`), as Estrelas de
  Coragem (`spec/regua.md`), os prêmios das conquistas (`spec/conquistas.md`).

## Em aberto

(nada por enquanto)

## Sem punição

- Não fazer um hábito nunca tira XP, ouro nem nível. Nenhuma fórmula reduz o ganho de quem é
  consistente. *(1a)*
- Não há esfriamento: fazer um hábito pela 100ª vez rende o mesmo que pela primeira. *(1a)*

## XP e ouro por conclusão

- XP = arred(10 × dificuldade × Bônus de Coragem). Ouro = arred(XP × 0,5). *(1a)*
- Multiplicadores de dificuldade: Trivial 0,5 · Fácil 1 · Média 1,5 · Difícil 2,5. *(1a)*
- Bônus de Coragem = 1 + 0,1 × estrelas do hábito, com no máximo 5 estrelas (1,5×). Sem estrelas,
  vale 1. *(1c)*

| Dificuldade | XP / ouro sem estrelas | Com 1 estrela | Com 5 estrelas |
| --- | --- | --- | --- |
| Trivial | 5 / 3 | 6 / 3 | 8 / 4 |
| Fácil | 10 / 5 | 11 / 6 | 15 / 8 |
| Média | 15 / 8 | 17 / 9 | 23 / 12 |
| Difícil | 25 / 13 | 28 / 14 | 38 / 19 |

- A versão mínima rende XP = arred(XP do hábito completo × 0,25), com o ouro calculado igual
  (Fácil: 3 XP e 2 de ouro). *(1b)*

## Arredondamento

- XP e ouro são sempre inteiros. A conta usa decimais e arredonda só no fim, para o inteiro mais
  próximo (0,5 sobe). *(1a)*
- O ouro sai do XP já arredondado, então o que a tela mostra bate com a conta. *(1a)*
- Toda conclusão rende pelo menos 1 XP e 1 de ouro. *(1a)*

## Prêmio de Domínio

- Ao dominar um patamar, eu recebo em ouro 5 × o XP de uma conclusão nesse patamar, uma vez por
  patamar (Fácil sem estrelas: 50; Média com 1 estrela: 85). *(1c)*

## Nível

- XP para passar do nível N = ⌊0,25 N² + 10 N + 100⌋. *(1a)*
- Ao subir de nível, o XP que passou do necessário vai para o nível seguinte. Nada se perde. *(1a)*
- Desmarcar uma conclusão pode me fazer voltar de nível, sem mensagem: só os números mudam. *(1a)*

Ritmo de referência, com 5 hábitos Fáceis por dia (50 XP/dia) e sem estrelas:

| Nível | XP para o próximo | Tempo para chegar |
| --- | --- | --- |
| 2 | 121 | ~2 dias |
| 10 | 225 | ~4 semanas |
| 20 | 400 | ~3 meses |
| 30 | 625 | ~6 meses |

## Para revisar depois do uso

Os números acima são um ponto de partida. Depois de algumas semanas de uso, eu reviso se os prêmios
chegam num ritmo que motiva: multiplicadores de dificuldade, curva de nível, Prêmio de Domínio
(5×), estrela (+10%) e versão mínima (1/4 do XP).
