# Button

Botões de ação. Altura mínima de 44px, rótulo de 15px em peso 600, raio `radius-md`.

**O consumidor fornece:** rótulo (verbo do que acontece: "Salvar hábito", "Resgatar", "Voltar"), variante e handler.

| Variante | Classe | Uso |
| --- | --- | --- |
| Principal | `am-btn-primary` | A ação principal da tela ou folha. Uma por vez |
| Secundário | `am-btn` | Alternativa ("Agora não", "Cancelar") |
| Texto | `am-btn-ghost` | Ações leves ("Pular pergunta", "Desfazer") |
| Destrutivo | `am-btn-danger` | Só no diálogo de confirmação de Excluir |
| Sobre ameixa | `am-btn-level` | Ação dentro de `top` (celebração) |
| Criar | `am-fab` | O "+" fixo no canto inferior. Só um por tela |

- Excluir sempre abre um diálogo de confirmação com `danger-soft` e o botão `am-btn-danger`. Nunca exclua no primeiro toque.
- Desabilitado: opacidade .45, e explique o motivo ao lado ("Faltam 40 ouro").
- Foco: anel `focus` de 2px com 2px de afastamento.
