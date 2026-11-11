# Acesso e membros

Quem entra no LevelUp, como entra e o que cada papel pode fazer.

- **Entra aqui:** login, convites, papéis, a lista de membros, remover membro, o nome no perfil e
  sair da conta.
- **Não entra aqui:** os hábitos e o progresso de cada pessoa (cada feature no seu arquivo de
  `spec/`) e a virada do dia (`spec/registrar-o-dia.md`).

## Em aberto

- [ ] Excluir conta (UC-93): um membro pode apagar a própria conta e todos os dados dele, ou isso
  fica com o admin, que já remove membros? E o que acontece com os dados de quem é removido: ficam
  guardados para quando voltar (como hoje) ou são apagados?

## Entrar

- Eu entro só com minha conta Google. Não há login com senha, Apple nem e-mail. *(1a)*
- Só entra quem tem convite para o e-mail da conta Google. Com outro e-mail, o app avisa que não há
  convite e não cria a conta. *(1a)*
- O primeiro admin entra sem convite, pelo e-mail configurado no servidor, só enquanto o grupo não
  tem nenhum admin. *(1a)*
- Depois de entrar, o app abre sempre na Hoje. *(1a)*
- Eu continuo conectada por 180 dias, até sair. *(1a)*
- Eu posso sair da conta em Configurações › Conta. *(1a)*

## Cada um com o seu

- Cada pessoa tem os próprios hábitos, progresso, ouro, conquistas e recompensas. Ninguém vê nada
  do outro, nem o admin. *(1a)*
  Por quê: o LevelUp é um app pessoal; o grupo existe só para decidir quem pode entrar. A interação
  entre pessoas fica para depois do MVP.

## Papéis

| Papel | O que pode |
| --- | --- |
| Membro | Usar o app com os próprios dados |
| Admin | Tudo do membro; ver a lista de membros; convidar e remover membros; dar e tirar o papel de admin |

- Pode haver mais de um admin. O app não deixa tirar o papel do último. *(1a)*

## Membros

- Só o admin vê a lista de membros, com nome, foto, e-mail e papéis. Um membro não vê os outros. *(1a)*
- O admin remove um membro depois de confirmar. Ele não remove a si mesmo: outro admin faz isso.
  Assim sempre sobra um admin. *(1a)*
- Quem é removido perde o acesso na hora, inclusive no app aberto. Um convite novo traz a pessoa de
  volta, com o mesmo histórico. *(1a)*

## Perfil

- Meu nome começa como o da conta Google, e eu posso mudar. Ele tem de 1 a 40 caracteres. *(1a)*
- A foto é a da conta Google e se atualiza a cada login. *(1a)*

## Convites

- O admin convida uma pessoa pelo e-mail dela. O convite fica ligado a esse e-mail e só vale para
  quem entra com a conta Google dele. *(1a)*
- No convite, o admin escolhe o tema em que a pessoa começa; sem escolha, é o Ameixa. A pessoa pode
  trocar depois, como qualquer um (`spec/temas.md`). Quem volta por um convite novo fica no tema que
  já tinha. *(1e)*
- O convite não expira. Ele deixa de valer só quando o admin o revoga. *(1a)*
- O admin vê a lista de convites pendentes e aceitos e pode revogar um pendente. *(1a)*
