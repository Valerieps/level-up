# Spec

O que o LevelUp faz. É a fonte da verdade: quando outro documento diverge daqui, vale o spec.

- **Entra aqui:** o que o app é, para quem, as fases e qual arquivo de `spec/` cobre cada feature.
- **Não entra aqui:** as regras em si (ficam em `spec/`), o que falta construir (`ROADMAP.md`) e
  como o app é construído (`ARQUITETURA.md` e `adr/`).

## O app

O LevelUp é meu app de hábitos: ele só registra o que eu fiz, reconhece quando um hábito virou
automático e premia a coragem de subir a régua, sem nunca punir quem falha ou pausa. Eu uso no
celular, várias vezes por dia, por poucos segundos: marco e saio. Quem eu convido usa também, cada
um com os próprios hábitos, sem ver os dos outros.

O app premia a coragem de evoluir:

- **Zero punição.** Falhar não tira XP, ouro nem nível, e não existe tela de punição. Dá para
  pausar sem perder nada.
- **Só o positivo.** Hábitos negativos viram conquistas de abstenção ("Ficar sem refrigerante").
  Só o "Sim" é registrado.
- **Domínio e coragem são o motor.** Quando um hábito fica fácil, o app reconhece (selo
  Automatizado) e convida a subir a régua; quem aceita ganha bônus permanentes. Quando pesa demais,
  o app ajuda a deixá-lo do tamanho certo.

Fora do MVP: tarefas pontuais; avatares, atributos, equipamentos e pets; qualquer recurso social;
lembretes e notificações; funcionar sem internet.

## Fases

Cada fase precisa ser usável sozinha. Cada regra em `spec/` diz de que fase vale, como *(1a)*.

| Fase | O que entra |
| --- | --- |
| 1a | Hábitos (criar, editar, arquivar, excluir), marcar e desmarcar, contador de meta, XP, ouro e nível, Hoje e Hábitos livres, subir e baixar a régua sem estrelas, virada do dia, Perfil com nível e arquivados |
| 1b | Versão mínima, streak, ritmo e "Faz tempo", Modo Pausa |
| 1c | Domínio e selo Automatizado, Prêmio de Domínio, Estrelas de Coragem, convites de subir e de ajustar a régua, conquistas, celebrações |
| 1d | Heatmaps (por hábito e geral), Loja de recompensas |
| 1e | Temas com nome de jogo: cores, fontes, ícones e logo, escolhidos no Perfil |
| 2 | Interação entre as pessoas do grupo |

## Arquivos

| Arquivo | O que cobre |
| --- | --- |
| [spec/acesso-e-membros.md](spec/acesso-e-membros.md) | Login com Google, convites, papéis e membros; cada um com o seu |
| [spec/habitos.md](spec/habitos.md) | Regras de tempo, dificuldade, versão mínima, cadastro, edição, arquivar e excluir |
| [spec/registrar-o-dia.md](spec/registrar-o-dia.md) | Marcar, contador, versão mínima, concluídos, desmarcar e virada do dia |
| [spec/progressao.md](spec/progressao.md) | Fórmulas de XP, ouro, nível e Prêmio de Domínio |
| [spec/streak-e-dominio.md](spec/streak-e-dominio.md) | Streak, ritmo, "Faz tempo", domínio e selo Automatizado |
| [spec/regua.md](spec/regua.md) | Subir, baixar e ajustar a régua; Estrelas de Coragem e convites |
| [spec/modo-pausa.md](spec/modo-pausa.md) | Pausar o app ou um hábito e voltar |
| [spec/conquistas.md](spec/conquistas.md) | Trilhas Automatizados e Coragem |
| [spec/heatmap.md](spec/heatmap.md) | Heatmap por hábito, geral e a folha do dia |
| [spec/loja.md](spec/loja.md) | Recompensas, resgates e histórico |
| [spec/temas.md](spec/temas.md) | O que um tema muda e o que nunca muda; escolha no Perfil |
| [spec/telas-e-feedback.md](spec/telas-e-feedback.md) | Abas, conteúdo e estados das telas, celebrações |
| [spec/_modelo.md](spec/_modelo.md) | Modelo para um arquivo de feature novo |

Os termos estão definidos em [GLOSSARIO.md](GLOSSARIO.md).
