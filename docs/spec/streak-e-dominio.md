# Streak, ritmo e domínio

Como o app mede a consistência e reconhece quando um hábito virou automático.

- **Entra aqui:** streak, ritmo e última vez, "Faz tempo", o domínio e o selo Automatizado.
- **Não entra aqui:** o Prêmio de Domínio em ouro (`spec/progressao.md`), o convite de subir a régua
  (`spec/regua.md`), dias em pausa (`spec/modo-pausa.md`).

## Em aberto

- [ ] Se eu desmarco a conclusão que completou o domínio, o selo Automatizado e o Prêmio de Domínio
  continuam, ou voltam atrás junto com o XP e o ouro da conclusão?

## Streak (diários e dias específicos)

- O streak conta os dias programados seguidos em que o hábito foi feito. Dias não programados não
  contam e não interrompem nada. A versão mínima mantém o streak. *(1b)*
  Exemplo: academia seg/qua/sex feita seg, qua, sex e seg = streak 4.
- Um dia programado sem conclusão zera o streak, sem mensagem. Nenhum XP, ouro ou conquista é
  retirado. *(1b)*
- O streak não muda o XP nem o domínio: perder um streak não custa nada além do próprio número.
  *(1b)*
- Hoje, enquanto o dia não vira, um programado ainda não feito não zera o streak. *(1b)*
- Dias em pausa e dias em que o hábito ficou arquivado não contam e não interrompem o streak; se eu
  marcar num deles, conta. *(1b)*
- Subir ou baixar a régua mantém o streak: os dias de antes contam pelo tamanho de antes. Só mudar a
  regra de tempo recomeça o streak (`spec/habitos.md`). *(1b)*

## Ritmo e última vez (livres)

- Hábitos livres não têm streak. No lugar, mostram o Ritmo (quantas vezes foi feito nos últimos 30
  dias, contando hoje) e a Última vez (há quantos dias). *(1b)*
- Um livre parado há mais de 10 dias sobe para o topo de Hábitos livres com a etiqueta "Faz tempo".
  É só um lembrete, sem XP extra. *(1b)*
- Os dias em pausa (do app ou do hábito) não entram nos 10 dias, e um livre pausado nunca mostra
  "Faz tempo". A Última vez continua mostrando os dias reais. *(1b)*
- Um livre que nunca foi feito conta os 10 dias desde a criação ou a última mudança de régua.
  *(1b)*

## Domínio

| Regra de tempo | Critério de domínio |
| --- | --- |
| Diário ou dias específicos | Feito em 12 das últimas 14 ocorrências programadas; até 2 delas podem ser a versão mínima |
| Livre | 14 conclusões desde a última vez que a régua mudou (ou desde a criação) |

- O domínio usa essa janela, e não o streak: quem é consistente domina rápido, e um deslize não
  apaga semanas de esforço. *(1c)*
- Em um diário com meta, uma ocorrência conta como feita quando a meta do dia foi atingida ou a
  versão mínima foi marcada. *(1c)*
- Dias em pausa não entram na janela. Depois de mudar a régua ou a regra de tempo, a janela só conta
  ocorrências do patamar novo. *(1c)*

## Ao atingir o domínio

1. O hábito ganha o selo **Automatizado**. O selo é permanente: não some se o streak zerar
   depois. *(1c)*
2. Eu recebo o Prêmio de Domínio em ouro, uma vez por patamar. *(1c)*
3. O app me convida a subir a régua. *(1c)*

- Cada patamar novo tem seu próprio domínio: depois de mudar a régua, a contagem recomeça e o
  hábito pode ser dominado de novo, com outro Prêmio de Domínio. *(1c)*

## Para revisar depois do uso

O critério (12 de 14; 14 conclusões nos livres) e os 10 dias do "Faz tempo". Um hábito de 1 vez por
semana leva 14 semanas para o domínio.
