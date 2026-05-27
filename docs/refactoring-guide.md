# Guia de Documentação de Refatorações

Este guia define o padrão para documentar refatorações no DevLog.

---

## Estrutura padrão de uma entrada de refatoração

```
Título: [Módulo] O que foi refatorado
Tipo: Refatoração
Resumo: Uma frase explicando a mudança (aparece na listagem)

Conteúdo:
  ## Problema
  O que estava errado/ruim antes.

  ## Solução
  O que foi feito para resolver.

  ## Impacto
  Ganhos em performance, legibilidade, manutenção...

  ## Arquivos afetados
  - src/...
  - src/...

Fotos:
  - Antes: screenshot do código/UI antes
  - Depois: screenshot do código/UI depois
```

---

## Exemplos de títulos

- `[Auth] Migração de sessões para JWT stateless`
- `[Kanban] Otimização de queries N+1 nas colunas`
- `[UI] Substituição de inline styles por Tailwind classes`
- `[API] Extração de validação Zod para camada separada`
- `[DB] Adição de índices em kanban_cards.column_id`

---

## Tipos de entrada e quando usar

| Tipo | Quando usar |
|---|---|
| **Refatoração** | Mudança interna sem alteração de comportamento. Inclua antes/depois. |
| **Feature** | Nova funcionalidade visível ao usuário. |
| **Bugfix** | Correção de comportamento incorreto. Descreva o bug e a correção. |
| **Ajuste** | Mudança pequena: texto, cor, espaçamento, configuração. |
| **Nota** | Qualquer anotação livre: aprendizado, decisão, lembrete. |
| **Reunião** | Decisões tomadas em reunião, alinhamentos importantes. |

---

## Dicas

- Seja específico no título — você vai pesquisar isso daqui 6 meses
- Screenshots valem mais que mil palavras — sempre adicione para refatorações visuais
- Para bugs complexos: adicione o stack trace como screenshot
- Relacione docs com cards do Kanban quando possível (campo "Card relacionado")
