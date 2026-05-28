# Resumo de Entregas — Eduardo Sodré
**Período:** 26/04/2026 a 27/05/2026

---

## O que foi entregue

### 1. Hub Rosh (Portal interno da empresa)
Projeto migrado do repositório do funcionário anterior para a organização Rosh. Melhorias realizadas:

- Implementação de **home page**, calendário lateral, mural de notícias e seção "Você sabia"
- **Procedimentos Operacionais (PO):** tela para visualizar e fazer upload dos procedimentos da empresa
- **Concurso de nomeação do projeto:** enquete com votação ao vivo, 1 voto por colaborador, painel admin com export em PDF
- **NotaFinder:** ferramenta de consulta de notas fiscais (NFe, NFSe, CTe) integrada ao sistema Sienge — permite buscar, atribuir e confirmar entrega de notas dentro dos chamados
- Correção de falha de segurança onde a home era exibida mesmo sem login válido

---

### 2. OpenTicket (Sistema de chamados)
Projeto migrado do repositório do funcionário anterior para a organização Rosh. Melhorias realizadas:

- **Integração com o NotaFinder:** ao abrir um chamado financeiro/fiscal, a nota é buscada automaticamente e vinculada ao chamado
- **Chamados de Escrituração:** novos campos obrigatórios (vencimento, retenção, pedido/contrato, tomador) para controle fiscal
- **Reembolso:** tabela de despesas com merge de comprovantes em PDF único
- **Pagamento por TED:** adicionado como forma de pagamento com dados bancários
- Transferência de chamados entre atendentes com notificação por e-mail
- Gestão de departamentos com exclusão segura (nada é apagado permanentemente)
- **Blocklist de emitentes:** bloqueia fornecedores/CNPJs problemáticos — dados bloqueados nunca chegam ao sistema

---

### 3. Access Control (Controle de acesso de colaboradores)
Projeto migrado do repositório do funcionário anterior para a organização Rosh. Melhorias realizadas:

- Exportação de relatórios em **Excel e PDF** com filtros por empresa, obra e colaborador
- Ficha individual do colaborador com status ativo/inativo, observações e anexos
- **Alertas de vencimento:** aviso automático de treinamentos e exames próximos do vencimento (30 dias)
- Validação de CPF com bloqueio de duplicatas no cadastro
- Dashboard em tempo real com monitoramento de acessos por obra

---

### 4. RoshSign (Assinatura digital de documentos)
Projeto migrado do repositório do funcionário anterior para a organização Rosh. Melhorias realizadas:

- **Integração com o Inventário TI:** ao cadastrar um equipamento, o sistema gera o termo de responsabilidade em PDF e envia direto para assinatura — sem precisar fazer isso manualmente
- Painel admin para gestão de usuários e controle de quem pode acessar o sistema
- Correção de bug onde signatários removidos continuavam aparecendo

---

### 5. RoshCheck (Formulários de vistoria)
Projeto migrado do repositório do funcionário anterior para a organização Rosh. Melhorias realizadas:

- Controle de acesso por nível de usuário nos formulários FVM e FVS
- Página de configurações para gestão de administradores

---

### 6. Inventário TI Web
Projeto migrado do repositório do funcionário anterior para a organização Rosh. Melhorias realizadas:

- Integração com o RoshSign para envio automático de termos de responsabilidade

---

## Impacto em números

| O que foi feito | Quantidade |
|---|---|
| Sistemas migrados e mantidos | 6 |
| Entregas realizadas | 109 |
| Período | 32 dias |
| Média de entregas por dia útil | ~5 |

---

## Destaques principais

1. **NotaFinder + OpenTicket + Sienge:** integração entre 3 sistemas que antes eram completamente separados — o time fiscal agora não precisa sair de uma tela para outra para localizar e registrar notas fiscais.

2. **Inventário TI + RoshSign:** geração e envio automático de termos de responsabilidade — o que antes era feito manualmente (gerar PDF, anexar, enviar para assinar) agora acontece com um clique.

3. **Access Control:** dashboard com monitoramento em tempo real, alertas de vencimento de exames e exportação completa de relatórios por obra e colaborador.
