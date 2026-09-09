# Resumo de Entregas — Eduardo Sodré

**Período:** 26/04/2026 a 08/07/2026 (74 dias)

---

## Resumo em 30 segundos

- **10 sistemas** da Rosh foram mantidos, melhorados ou criados do zero.
- **~200 entregas** (features, correções e ajustes) publicadas nesse período.
- **Os 6 sistemas que estavam sob domínio do Gustavo (funcionário anterior) hoje são 100% da Rosh** — código, acesso e manutenção totalmente migrados e sob controle da empresa, sem qualquer dependência dele.
- **3 sistemas novos** nasceram no período: NotaFinder (dashboard próprio), searchTitle e as bases de ProdutoFiscal e Auth_Sienge.
- A única exceção é o **Sistema GED**, que é um projeto pessoal de Eduardo, fora do escopo da Rosh — ver detalhes no final deste relatório.

---

## O que foi feito, sistema por sistema

### 1. Rosh Comunicados — Portal interno da empresa

*(antes chamado Hub Rosh / Rosh Conecta)*

Projeto que estava sob domínio do Gustavo (funcionário anterior) — hoje 100% migrado e sob controle da Rosh. Foi estabilizado, ganhou identidade nova (escolhida pelos próprios colaboradores) e vários recursos novos:

- **Nome novo escolhido pela empresa:** um concurso interno com votação ao vivo definiu o nome "Rosh Comunicados" — enquete, apuração em tempo real e painel de resultado, tudo construído do zero
- Mural de notícias com múltiplas fotos por post, correção de imagens cortadas, fixar notícias importantes no topo
- Procedimentos Operacionais (PO): upload e reordenação de documentos da empresa
- Painel administrativo mais confiável: permissões aplicadas na hora, sem precisar recarregar a página
- Correção de falha de segurança onde a home aparecia mesmo sem login válido

---

### 2. Sistema Nexus — Chamados e atendimento interno

*(antes chamado OpenTicket)*

Projeto que estava sob domínio do Gustavo (funcionário anterior) — hoje 100% migrado e sob controle da Rosh. Recebeu integrações que aceleraram o processo fiscal:

- E-mails do sistema migrados para o Microsoft 365, com reserva automática caso falhe
- Download do PDF da nota fiscal direto no chamado, sem precisar abrir outro sistema
- Novas formas de pagamento na Escrituração (TED, Adiantamento) com dados bancários
- Anexos ampliados para 20MB, com arrastar-e-soltar no formulário
- Transferência de chamados entre atendentes com aviso por e-mail
- Bloqueio de fornecedores/CNPJs problemáticos antes que os dados cheguem ao sistema

---

### 3. NotaFinder — Consulta de notas fiscais (NFe, NFSe, CTe)

Começou como uma funcionalidade dentro do Nexus e **virou um produto próprio**, com repositório e painel de gestão dedicados:

- Dashboard próprio para acompanhar status e pendências das notas fiscais
- Sincronização manual sob demanda, sem esperar o ciclo automático
- Correções no cadastro de certificados digitais (tela travava, datas apareciam erradas)
- Notas já finalizadas no Sienge saem da fila do Nexus automaticamente, evitando retrabalho
- Acesso às páginas agora exige autorização (reforço de segurança)

---

### 4. RoshSign — Assinatura digital de documentos

Projeto que estava sob domínio do Gustavo (funcionário anterior) — hoje 100% migrado e sob controle da Rosh. Ganhou mais autonomia para os usuários e mais controle para os administradores:

- Painel administrativo completo: quem pode criar documentos, busca e gestão centralizadas
- E-mail automático avisando o motivo quando alguém recusa assinar um documento
- Correção visual dos campos do PDF (assinatura, CPF, data) — antes ficavam desalinhados
- Documentos longos deixaram de travar a tela ao abrir
- Links de assinatura enviados por WhatsApp/e-mail pararam de quebrar quando cortados
- **Integração com o Inventário de TI:** ao cadastrar um equipamento, o termo de responsabilidade é gerado e enviado para assinatura automaticamente
- Correção de bug onde signatários já removidos continuavam aparecendo na lista

---

### 5. Access Control — Controle de acesso de colaboradores nas obras

Projeto que estava sob domínio do Gustavo (funcionário anterior) — hoje 100% migrado e sob controle da Rosh. Reforço de segurança:

- **Ao desligar um colaborador, o acesso dele a todas as obras é revogado automaticamente** — antes precisava tirar manualmente obra por obra
- Alertas automáticos de treinamentos e exames vencendo em 30 dias
- Busca de colaboradores por CPF, com validação para bloquear cadastros duplicados
- Exportação de relatórios em Excel e PDF por empresa, obra e colaborador
- Dashboard em tempo real com monitoramento de acessos por obra
- Upload de anexos mais robusto (limite ampliado para 15MB)

---

### 6. RoshCheck — Formulários de vistoria e indicadores de qualidade

Projeto que estava sob domínio do Gustavo (funcionário anterior) — hoje 100% migrado e sob controle da Rosh. Ganhou um módulo novo e importante:

- **Novo sistema de indicadores:** cada fornecedor e obra recebe uma nota de qualidade ponderada, com dashboard comparativo — antes essa avaliação não existia de forma estruturada
- Indicador automático de conformidade de treinamentos e exames (conectado ao Access Control)
- Relatórios em PDF com a logo da Rosh, prontos para apresentação a diretoria/clientes
- Novos tipos de ficha: Segurança do Trabalho, Projetos, Relatórios Técnicos
- Rascunho offline no aplicativo (funciona mesmo sem internet na obra)

---

### 7. Inventário de TI — Controle dos equipamentos da empresa

Projeto que estava sob domínio do Gustavo (funcionário anterior) — hoje 100% migrado e sob controle da Rosh. Ganhou um recurso novo de localização:

- **Localização em tempo real dos notebooks da empresa**, com opção de localizar a frota inteira com um clique
- Mapa consolidado com a posição de cada equipamento, atualizado individualmente
- Limpeza automática: equipamentos que saíram da empresa somem da lista sozinhos
- Envio automático do termo de responsabilidade para assinatura ao cadastrar um equipamento (via RoshSign)

---

### 8. Login Unificado

- Tela de login redesenhada, priorizando o acesso único via conta Microsoft da empresa
- Correção no redirecionamento: o usuário volta para onde estava, em vez de sempre cair na tela principal

---

### 9. Projetos novos iniciados no período

- **searchTitle:** nova ferramenta de consulta de notas fiscais relacionadas
- **ProdutoFiscal** e **Auth_Sienge:** bases criadas, preparando as próximas integrações fiscais com o Sienge

---

## Também em desenvolvimento agora (projeto pessoal, fora do escopo da Rosh)

Em paralelo a tudo isso, Eduardo está construindo o **Sistema GED** — gestão eletrônica de documentos (organização, busca e controle de documentos corporativos). **Diferente dos 10 sistemas acima, este é um projeto pessoal de Eduardo, feito por conta própria** — não faz parte do escopo de trabalho da Rosh nem é de propriedade da empresa.

---

## Impacto em números

| O que foi feito | Quantidade |
| --- | --- |
| Sistemas mantidos, melhorados ou criados | 10 |
| Entregas realizadas (features + correções) | ~200 |
| Período total | 74 dias corridos |
| Sistemas herdados que continuam de pé e melhorados | 6 de 6 |
| Sistemas novos criados no período | 3 |

---

## Destaques principais

1. **Nome novo do portal, escolhido pela empresa:** votação ao vivo construída do zero elegeu "Rosh Comunicados" — da enquete até a apuração em tempo real.
2. **NotaFinder virou produto próprio:** saiu de dentro do sistema de chamados e ganhou dashboard de gestão dedicado.
3. **Novo sistema de indicadores de qualidade no RoshCheck:** primeira vez que fornecedores e obras são avaliados com nota estruturada e relatório em PDF.
4. **Segurança reforçada no Access Control:** desligar um colaborador agora revoga o acesso dele em todas as obras automaticamente — antes dependia de ação manual.
5. **RoshSign mais completo:** aviso automático de recusa, links que não quebram no WhatsApp, e integração direta com o Inventário de TI.
