# Loja

Trocar ouro por recompensas da vida real que eu mesma defino.

- **Entra aqui:** criar, editar, excluir e resgatar recompensas, e o histórico de resgates.
- **Não entra aqui:** como eu ganho ouro (`spec/progressao.md` e `spec/conquistas.md`).

## Em aberto

(nada por enquanto)

## Recompensas

- Eu crio uma recompensa com nome e custo em ouro, pelo "+" da Loja. O nome tem até 80
  caracteres, como o de um hábito; o custo é um inteiro de 1 a 99.999. *(1d)*
- Com a Loja vazia, o app sugere dois exemplos ("1 episódio de série · 40", "Sobremesa especial ·
  100") e a referência de ritmo: cerca de 25 de ouro por dia com 5 hábitos fáceis. *(1d)*
- Tocar num cartão abre a recompensa para editar ou excluir; excluir pede confirmação. *(1d)*

## Resgatar

- Se meu saldo é maior ou igual ao custo, "Resgatar" debita o ouro e registra o resgate. Senão, o
  botão fica indisponível e mostra quanto falta ("faltam 12"). O saldo nunca fica negativo. *(1d)*
- Recompensas são reutilizáveis: eu resgato quantas vezes o saldo permitir. *(1d)*
- As recompensas aparecem da mais barata para a mais cara. *(1d)*

## Histórico

- A Loja mostra os 5 últimos resgates com a data, e "Ver tudo" quando há mais. *(1d)*
- O histórico guarda o nome e o custo da época do resgate, mesmo que eu edite ou exclua a
  recompensa depois. *(1d)*
