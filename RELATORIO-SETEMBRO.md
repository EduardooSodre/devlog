# Relatório de Entregas — Eduardo Sodré

**Período:** 01/09/2026 a 29/09/2026 (29 dias)
**Fonte:** GitHub da organização Rosh-Participacoes (23 repositórios, todas as branches) + repositório pessoal `EduardooSodre/devlog`
**Autor filtrado:** EduardooSodre (`edduardooo2011@hotmail.com` e e-mail noreply do GitHub). Commits do Diego Muller nos mesmos repositórios foram excluídos.

---

## Resumo em 30 segundos

- **158 commits** em **11 sistemas da Rosh** (mais 15 no projeto pessoal DevLog), em **20 dias diferentes** do mês.
- O ritmo **acelerou a cada semana**: 20 commits na 1ª semana, 34 na 2ª, 49 na 3ª e 57 na 4ª.
- **Obralyse concentrou o esforço** (102 commits, ~64%): virou uma plataforma de gestão de obra com inspeções, RDO, EPIs, assinatura eletrônica ICP-Brasil, módulo de Documentos e auditoria completa.
- **2 frentes novas no mês:** **CheckObra** (app mobile de checklist de obra, criado em 03/09) e o módulo **Documentos** do Obralyse.
- **RoshSign** ganhou assinatura digital **ICP-Brasil validada pelo ITI**, com certificado A1 no navegador, trilha de auditoria e certificado de conclusão.
- **OpenTicket** ganhou o fluxo completo de **Solicitação de Adiantamento** (Financeiro) integrado ao **Sienge**.
- Padronização de marca: **retirada do logotipo antigo** em 9 sistemas em 21–22/09.

| Indicador | Valor |
|---|---|
| Commits (org Rosh) | 158 (+2 merges) |
| Commits (projeto pessoal DevLog) | 15 |
| Sistemas tocados | 11 |
| Features (feat) | 96 |
| Correções (fix) | 42 |
| Chore / refactor / perf / test / style / outros | 22 |
| Dia mais produtivo | 16/09 (24 commits, motor de inspeções do Obralyse) |

> Linhas de código não foram usadas como métrica de produtividade: o mês tem 2 commits gigantes de importação (RoshSign +260 mil linhas de arquivos de teste, removidos logo depois; CheckObra +18 mil no commit inicial).

---

## O que foi feito, sistema por sistema

### 1. Obralyse — plataforma de gestão de obra (102 commits)

**Base e administração (01–04/09)**
- Dashboards administrativos, **auditoria**, relatórios e biblioteca de gráficos (commit de +15 mil linhas em 01/09); filtro de período na auditoria
- Trava de nível Admin/Master para usuários fora do domínio da organização
- Relatório detalhado do colaborador com logo e layout de ficha
- Reorganização do repositório (conteúdo de `frontend/` movido para a raiz)
- Calendário de vencimentos com seletor rápido de mês/ano
- Correções de infra na Vercel: build quebrado por `jose@6` (ESM-only), leitura de chave privada PEM colada errada, sessão `hihub_session`

**Integração com o app CheckObra (03–11/09)**
- Checklists de equipamentos vindos do CheckObra; vínculo de responsável a dispositivos, ativar/desativar obras, **login por código** e auditoria por dispositivo
- Custom token do Firebase para o dispositivo ler o próprio documento em tempo real; endpoint de nomes de usuários para autocomplete
- Modal de foto ampliada no detalhe do checklist
- Setup de testes (**Vitest**) para a autenticação/token do CheckObra
- Performance: cache de `listPessoas` (menos leituras no Firestore); lista de colaboradores paginada, bloqueados ocultos por padrão

**Permissões / RBAC (14/09)**
- **Refatoração completa do sistema de permissões**: níveis de acesso, dispositivos e recursos (103 arquivos); server actions de dispositivos/usuários passaram a exigir admin

**Motor de inspeções e não-conformidades (15–17/09)** — maior entrega do mês
- Fluxo de inspeções e NCs portado do sistema Inmeta para Meio Ambiente, depois **generalizado** para Materiais, Serviço, Auditorias, Entrega de obra e **Segurança** (auditorias, treinamentos, registros, checklists de equipamentos)
- **Workflow de validação** em etapas e item a item, com reprovação, observações e nível de risco por item; página de **validações pendentes** cruzando todos os submódulos
- Iniciar várias inspeções de uma vez (encadeadas ou num formulário só); editar inspeção finalizada com histórico de alteração; exportar como PDF
- Indicadores: NC por submódulo, por avaliador, cruzando Qualidade × Segurança, agrupados por obra/item; **relatório de indicadores por obra (Excel/PDF)** com gráfico de pizza
- Módulo **Pré-obra**; catálogo de locais físicos por obra; **cadastro mestre** de fornecedor/equipamento/material/mão de obra
- **EPIs:** entrega/devolução com assinatura (16/09)
- Funcionário administrativo (fora da conformidade documental) e indicadores por colaborador

**RDO — Relatório Diário de Obra (16–22/09)**
- RDO mais rico: clima por período, efetivo, atividades, equipamentos, visitas; editar/excluir
- Clima detalhado, etapas, anexos, finalização e calendário; anotações, tipos de ocorrência cadastráveis e totais de efetivo
- **Validação por etapas configurável por obra**, status "não aplicável", preferências de etapas e sub-toggles de campos por obra
- KPIs de RDOs realizados/em andamento; calendário clicável para criar RDO

**Assinatura eletrônica, EPIs e treinamentos (23/09)** — PR #1 mergeado
- **Assinatura eletrônica com trilha de auditoria e selo PAdES ICP-Brasil** nos treinamentos
- Painel de indicadores, evidência de assinatura e **ficha NR-6 em PDF** nos EPIs; vida útil e validade de CA; rastro de quem devolveu
- Treinamentos e EPIs na ficha do colaborador; múltiplos anexos por treinamento/documento
- NCs vencidas e exigência de solução adotada; alerta de validade de equipamentos
- **Inativação automática** por falta de movimentação e **permissões granulares por recurso**; correção da importação de colaboradores por CSV (não criava tarefas padrão)

**Conformidade documental e dashboards (24–26/09)**
- Relatório de análise documental por período; **histórico imutável de movimentações documentais**; dashboard com nota por obra
- Indicadores de meses passados com retrato diário e KPIs redesenhados; **auditoria de todos os CRUDs**; dashboard "Painel 360" com inspeções recentes e modelos pendentes
- Linha do tempo documental com tempo por etapa, correção e resumo por empresa
- Tela 403 de acesso restrito no lugar do erro 500; abas do controle de acesso filtradas por permissão
- Performance: varredura única de colaboradores com memo em memória

**Módulo Documentos (28/09)**
- **Link público de envio de documentos** e salvamento automático do cadastro
- **Módulo Documentos (Fase 1):** pastas, pendências, atualizações e lixeira; pasta de empresa vira lista achatada, agrupada por empresa; nome da empresa pelo nome mais frequente do CNPJ
- Inativação em 60 dias, **aprovação agregada com liberação automática de acesso** e histórico de empresas
- Permissão própria para Documentos, independente de Colaboradores
- Auditoria passa a rastrear troca de anexos; ajustes de warnings do React 19 / Next 16

---

### 2. CheckObra — app mobile de checklist de obra (14 commits) — **novo**

- Criado em 03/09: app com **atribuição remota de obra por dispositivo**, suporte a múltiplas obras e refresh automático (20s)
- **Login real por e-mail + código** (substituiu mock); depois **atualização instantânea via Firestore em tempo real**, sem polling
- Histórico filtrado pela obra do tablet, admin com diagnóstico, autocomplete de equipamento / líder / responsável de Segurança (a partir dos Usuários cadastrados)
- Correções: upload de foto na sincronização, loading infinito no login (long-polling no React Native), sessão antiga presa no SecureStore
- 18/09: **rubrica desenhada em tela cheia**, foto opcional na observação e ajustes de UX

### 3. RoshSign — assinatura de documentos (14 commits)

- **Assinatura ICP-Brasil compatível com o validador do ITI**, restrita por permissão (14/09). Várias iterações até a aprovação: ordem canônica dos `signedAttrs`, alinhamento com amostra aprovada, diagnóstico e varredura de pasta
- **Certificado A1 direto no navegador**; erros reais do Web PKI deixam de ser engolidos
- **Certificado de conclusão** na trilha de auditoria; assinatura de cada signatário vinculada a um **CNPJ**; rubrica, adoção de assinatura e base legal
- Download nunca mais entrega PDF "digital" sem assinatura
- Exige justificativa ao reprovar documento e **notifica os signatários**

### 4. OpenTicket / Nexus — chamados (9 commits)

- **Solicitação de Adiantamento (Financeiro)** com auditoria (10/09)
- **Apropriação de Despesas** na solicitação; **busca de fornecedor (credor Sienge)**; campo **Empresa** buscado no Sienge
- Relatório completo do adiantamento, campos com rótulo, chat com **colar imagem/print**
- Ajustes de obrigatoriedade de campos a pedido do Financeiro (28/09)

### 5. Rosh Comunicados (7 commits)

- Links clicáveis nas publicações; **drag-and-drop no upload de imagens** e **carrossel** no Feed; ajuste do corte de texto conforme altura da imagem
- Troca do e-mail autorizado a excluir notas

### 6. Manutenções menores

- **GED:** aceita traço tipográfico colado do Word; tipo FOR renomeado para F; escape de barra em pasta aninhada
- **Controle de Acesso:** corrige erro ao gerar relatório na ficha do colaborador
- **Inventário TI:** remove referência quebrada ao logo no termo do RoshSign
- **Retirada do logotipo antigo (21–22/09):** Landing Page, Login, RoshCheck, Rosh Comunicados, OpenTicket, RoshSign, Controle de Acesso, Inventário TI e Obralyse

---

## Projeto pessoal — DevLog (15 commits)

Repositório `EduardooSodre/devlog` (fora do escopo da Rosh):
- Kanban multi-view com departamentos, licenciamento por organização, push, tarefas/responsáveis (04/09)
- Onboarding, modal de perfil, subtarefas e e-mails de convite (09/09); dificuldade/visibilidade de cards, vínculo entre projetos e painel de filtros (14/09)
- Workspaces e dashboard (18/09); billing com **Stripe** (checkout, webhooks, limite de 1MB do middleware na Vercel) (21–22/09)
- Convites automáticos, billing só do dono, permissões por criador, membros por board; **relatório de trabalho (Excel/PDF + resumo por IA)** e painel Super Admin (28/09)

---

## Apêndice — lista completa de commits (horário de Brasília)

Formato: `data hora · hash · +adições/−remoções · arquivos — mensagem`

### Obralyse — 102 commits (`Rosh-Participacoes/Obralyse-main`)

- 01/09/2026 14:10 · `5de9132` · +15113/−602 · 113 arq. — feat: adicionar dashboards administrativos, auditoria, relatórios e biblioteca de gráficos
- 01/09/2026 14:11 · `aae92ad` · +468/−83 · 12 arq. — feat: adicionar dashboards administrativos, auditoria, relatórios e biblioteca de gráficos
- 01/09/2026 15:32 · `3522c76` · +37/−3 · 3 arq. — feat: travar nivel Admin/Master pra usuarios fora do dominio da organizacao
- 01/09/2026 15:47 · `406b584` · +10/−0 · 1 arq. — feat: adicionar dropdown de mes/ano rapido no calendario de vencimento
- 01/09/2026 16:08 · `867a6b6` · +3/−3 · 1 arq. — style: aumentar foto da obra no cabecalho do dashboard
- 01/09/2026 16:12 · `8fa1a82` · +54/−3 · 5 arq. — fix: atualização do favicon e logo
- 01/09/2026 16:57 · `bf42e31` · +0/−49 · 218 arq. — refactor: mover conteudo de frontend/ pra raiz do repositorio
- 01/09/2026 18:14 · `99c9e39` · +136/−24 · 5 arq. — feat: adicionar logo e layout de ficha ao relatorio detalhado do colaborador
- 02/09/2026 12:05 · `a86a64a` · +143/−24 · 9 arq. — feat: adicionar filtro de período ao dashboard de auditoria
- 03/09/2026 16:41 · `27c062c` · +1024/−161 · 26 arq. — feat: integrar checkObra-main como fonte de checklists de equipamentos
- 04/09/2026 10:33 · `55fca72` · +7/−1 · 2 arq. — fix: nao derrubar o app inteiro por falta de CHECKOBRA_API_KEY
- 04/09/2026 11:17 · `3335228` · +21/−9 · 2 arq. — fix: derruba build inteiro por jose@6 ESM-only quebrando require() no jwks-rsa
- 04/09/2026 12:16 · `a803306` · +5/−1 · 1 arq. — fix: logar motivo real de falha ao verificar hihub_session
- 04/09/2026 15:22 · `da33711` · +13/−2 · 1 arq. — fix: tolerar formatos comuns de colagem errada de chave privada PEM
- 04/09/2026 16:12 · `d5e4560` · +6/−1 · 1 arq. — fix: parar de checar revogacao de sessao (exige permissao que nao temos)
- 08/09/2026 16:00 · `b816411` · +910/−99 · 30 arq. — feat: vincular responsavel a dispositivos CheckObra, ativar/desativar obras, login por codigo e auditoria por modulo
- 09/09/2026 09:23 · `303ef39` · +106/−8 · 4 arq. — feat: emitir custom token do Firebase pro dispositivo CheckObra ler o proprio doc em tempo real
- 09/09/2026 10:39 · `ef78f7f` · +22/−0 · 1 arq. — feat: endpoint de nomes de Usuarios pro autocomplete de lider/seguranca no CheckObra
- 11/09/2026 10:25 · `12b25f1` · +26/−4 · 1 arq. — fix: validar path e impedir apagar historico em accessControl_Registros
- 11/09/2026 10:25 · `6b60243` · +78/−4 · 3 arq. — feat: modal de foto ampliada no detalhe do checklist
- 11/09/2026 10:26 · `5e5894d` · +2880/−1206 · 7 arq. — test: setup do Vitest com testes de auth/token do CheckObra
- 11/09/2026 14:58 · `df4762a` · +103/−7 · 2 arq. — feat: ocultar bloqueados por padrao e paginar lista de colaboradores
- 11/09/2026 15:07 · `84d2674` · +26/−1 · 1 arq. — perf: cachear listPessoas para reduzir leituras do Firestore
- 11/09/2026 16:05 · `b1f2dad` · +138/−1 · 2 arq. — fix: liberar "Todos os Ativos" para todas as obras e corrigir corte de 400
- 14/09/2026 10:55 · `9e3b91d` · +3973/−228 · 103 arq. — feat: refatorar sistema de permissoes e RBAC (niveis-acesso, dispositivos, recursos)
- 14/09/2026 11:05 · `904cd39` · +10/−12 · 2 arq. — fix: exigir admin nas server actions de dispositivos e usuarios
- 15/09/2026 13:31 · `cd66c4a` · +2512/−35 · 32 arq. — feat: portar fluxo de inspecoes e nao-conformidades do Inmeta pro Meio ambiente
- 15/09/2026 15:48 · `701383f` · +834/−508 · 67 arq. — feat: generalizar motor de inspecoes pra materiais/servico/auditorias/entrega-obra
- 15/09/2026 22:11 · `3ab813a` · +450/−227 · 98 arq. — feat: generalizar motor de inspecoes pra Seguranca (auditorias, treinamentos, registros, checklists de equipamentos)
- 16/09/2026 07:54 · `d6868cb` · +694/−1 · 17 arq. — feat: adicionar entrega/devolucao de EPI com assinatura (seguranca/epis)
- 16/09/2026 12:09 · `2277b3c` · +256/−5 · 8 arq. — feat: aplicar workflow de validacao em etapas na execucao de inspecoes
- 16/09/2026 12:24 · `44ac129` · +36/−3 · 3 arq. — feat: mostrar NC por submodulo de inspecao no hub global de indicadores
- 16/09/2026 12:54 · `ec31b79` · +172/−34 · 12 arq. — feat: fechar 3 lacunas do motor de inspecao (assinatura, selecao, tipo de NC)
- 16/09/2026 13:43 · `128d6bf` · +252/−33 · 19 arq. — feat: reprovacao no workflow de validacao, nivel de risco por item, e modulo Pre-obra
- 16/09/2026 14:27 · `56cadd0` · +130/−1 · 8 arq. — feat: pagina de validacoes pendentes cruzando todos os submodulos
- 16/09/2026 14:43 · `6b1c633` · +60/−35 · 4 arq. — feat: exportar inspecao como PDF via impressao nativa do navegador
- 16/09/2026 14:54 · `2a10448` · +6/−1 · 2 arq. — feat: adicionar NC por avaliador aos indicadores de inspecao
- 16/09/2026 15:06 · `8e752c9` · +96/−17 · 4 arq. — feat: envolvidos com CPF real em treinamentos
- 16/09/2026 15:13 · `88ece2d` · +25/−2 · 6 arq. — feat: local (texto livre) por inspecao dentro da obra
- 16/09/2026 15:21 · `e59f9da` · +104/−33 · 4 arq. — feat: iniciar varias inspecoes de uma vez, encadeadas
- 16/09/2026 15:29 · `0e5a4c2` · +120/−1 · 5 arq. — feat: indicadores cruzando Qualidade e Seguranca numa visao so
- 16/09/2026 15:42 · `27db336` · +340/−26 · 8 arq. — feat: editar inspecao finalizada com historico de alteracao
- 16/09/2026 15:55 · `8cc4cef` · +487/−51 · 8 arq. — feat: RDO mais rico (clima por periodo, efetivo, atividades, equipamentos, visitas)
- 16/09/2026 17:16 · `8613586` · +7/−9 · 1 arq. — feat: permitir remover envolvido fixo do modelo em treinamentos
- 16/09/2026 17:16 · `620057b` · +181/−25 · 7 arq. — feat: editar e excluir relatorio diario de obra (RDO)
- 16/09/2026 17:17 · `5535ce2` · +96/−25 · 5 arq. — feat: agrupar indicadores cruzados por obra ou item, alem de submodulo
- 16/09/2026 17:17 · `5718b18` · +77/−11 · 2 arq. — feat: permitir editar item removido do modelo apos a inspecao
- 16/09/2026 17:18 · `316e24f` · +244/−3 · 9 arq. — feat: catalogo de locais fisicos por obra
- 16/09/2026 17:32 · `13e536b` · +186/−5 · 6 arq. — feat: workflow de validacao item a item na inspecao
- 16/09/2026 22:31 · `b35b9c1` · +225/−24 · 11 arq. — feat: cadastro mestre de fornecedor/equipamento/material/mao-de-obra
- 16/09/2026 22:45 · `8799e34` · +308/−22 · 6 arq. — feat: iniciar varias inspecoes juntas num formulario so
- 16/09/2026 23:42 · `d80345d` · +2/−2 · 1 arq. — fix: menu mobile (hamburguer) invisivel por contraste texto/fundo
- 17/09/2026 00:03 · `c5402cf` · +50/−7 · 5 arq. — feat: excluir item de cadastro mestre; corrige rotulo singular
- 17/09/2026 00:03 · `09dd483` · +29/−9 · 1 arq. — feat: campo de observacoes na validacao item a item
- 17/09/2026 09:21 · `f579102` · +617/−8 · 9 arq. — feat: relatorio de indicadores por obra (Excel/PDF) com grafico de pizza
- 17/09/2026 16:53 · `f23961f` · +619/−80 · 17 arq. — feat: funcionario administrativo (fora da conformidade documental) e indicadores por colaborador
- 18/09/2026 16:44 · `5a7b3c2` · +793/−31 · 12 arq. — feat: assinatura/foto da observacao, cronologia por equipamento e exportacao em PDF dos checklists
- 20/09/2026 13:39 · `3218ab1` · +959/−220 · 14 arq. — feat: RDO com clima detalhado, etapas, anexos, finalizacao e calendario
- 20/09/2026 13:40 · `1b47b8a` · +339/−21 · 7 arq. — feat: filtro de periodo nos indicadores com snapshot mensal por colaborador
- 20/09/2026 13:40 · `2aee92d` · +68/−43 · 1 arq. — feat: agrupa checklists por obra em linhas compactas
- 21/09/2026 14:16 · `007f348` · +0/−18 · 5 arq. — fix: retirada da logo
- 22/09/2026 10:02 · `07b21c3` · +346/−13 · 11 arq. — feat: anotacoes, tipos de ocorrencia cadastraveis e totais de efetivo no RDO
- 22/09/2026 10:04 · `389822b` · +605/−11 · 12 arq. — feat: validacao de RDO por etapas, configuravel por obra
- 22/09/2026 10:30 · `31acffc` · +29/−13 · 4 arq. — fix: build quebrado pela remocao da logo (public/logo-rosh.png)
- 22/09/2026 10:55 · `fb584bb` · +25/−5 · 2 arq. — feat: KPIs de RDOs realizados/em andamento no calendario da obra
- 22/09/2026 11:09 · `0cf1a59` · +83/−15 · 5 arq. — feat: etapa/responsaveis em Atividades e calendario clicavel pra criar RDO
- 22/09/2026 12:15 · `832e945` · +320/−52 · 12 arq. — feat: status "nao aplicavel" e preferencias de etapas por obra no RDO
- 22/09/2026 14:56 · `2f0d93a` · +367/−178 · 7 arq. — feat: sub-toggles de campo nas preferencias do RDO; fix: form nao usava a largura disponivel
- 23/09/2026 14:13 · `2bf7b2d` · +2336/−102 · 28 arq. — feat: assinatura eletronica com trilha de auditoria e selo PAdES ICP-Brasil nos treinamentos
- 23/09/2026 14:13 · `81db422` · +272/−9 · 7 arq. — feat: painel de indicadores, evidencia de assinatura e ficha NR-6 em PDF nos EPIs
- 23/09/2026 14:22 · `61db96c` · +79/−6 · 7 arq. — feat: vida util e validade de CA nas entregas de EPI
- 23/09/2026 14:30 · `61d291b` · +81/−0 · 2 arq. — feat: treinamentos e EPIs na ficha do colaborador
- 23/09/2026 14:40 · `df7db1a` · +31/−15 · 5 arq. — feat: confirmacao e rastro de quem devolveu o EPI
- 23/09/2026 14:45 · `2421947` · +2/−36 · 2 arq. — fix: troca do globe.svg e vercel.svg
- 23/09/2026 14:50 · `df43887` · +2798/−165 · 43 arq. — Merge pull request #1 from Rosh-Participacoes/feat/assinatura-eletronica-treinamentos
- 23/09/2026 15:19 · `7b9676c` · +134/−18 · 9 arq. — feat: nao conformidades vencidas e exige solucao adotada pra resolver
- 23/09/2026 15:25 · `612de30` · +18/−12 · 1 arq. — fix: trata HttpError na rota checkobra/dispositivo em vez de deixar subir cru
- 23/09/2026 15:31 · `2e08de4` · +135/−20 · 4 arq. — feat: alerta de validade vencida/a vencer em Equipamentos
- 23/09/2026 16:29 · `d127b4b` · +255/−81 · 4 arq. — feat: multiplos anexos por treinamento/documento na ficha do colaborador
- 23/09/2026 16:47 · `f34861b` · +32/−1 · 2 arq. — fix: importacao de colaboradores via CSV nao criava as tarefas padrao de conformidade
- 23/09/2026 17:32 · `e602638` · +667/−84 · 29 arq. — feat: inativacao automatica por falta de movimentacao e permissoes granulares por recurso
- 24/09/2026 12:13 · `1464647` · +380/−5 · 8 arq. — feat: relatorio de analise documental por periodo em indicadores
- 24/09/2026 13:40 · `153669e` · +472/−122 · 11 arq. — feat: historico imutavel de movimentacoes documentais e dashboard com nota por obra
- 24/09/2026 14:12 · `7d68cf2` · +514/−413 · 8 arq. — feat: indicadores de meses passados com retrato diario e redesenho dos KPIs
- 24/09/2026 15:20 · `e5e264f` · +415/−155 · 28 arq. — feat: auditoria de todos os CRUDs e dashboard admin preciso
- 24/09/2026 15:37 · `a6cc5f1` · +19/−7 · 1 arq. — feat: ampliar foto do colaborador ao clicar
- 24/09/2026 15:40 · `8f9d3a7` · +583/−365 · 12 arq. — feat: dashboard painel 360 com inspecoes recentes e modelos pendentes
- 24/09/2026 16:25 · `ed9cb8f` · +16/−7 · 4 arq. — fix: exclusao de local valida a obra do proprio documento
- 25/09/2026 09:42 · `8a29427` · +46/−8 · 6 arq. — fix: tela de acesso restrito (403) no lugar do erro 500 e abas do controle de acesso filtradas por permissao
- 25/09/2026 10:51 · `365da0e` · +532/−126 · 10 arq. — feat: linha do tempo documental com tempo por etapa, correcao e resumo por empresa
- 25/09/2026 22:27 · `bfc347f` · +134/−131 · 7 arq. — perf: varredura unica de colaboradores com memo em memoria
- 28/09/2026 08:52 · `f87f53f` · +1137/−26 · 13 arq. — feat: link publico de envio de documentos e salvamento automatico do cadastro
- 28/09/2026 09:32 · `50d2a70` · +698/−1 · 12 arq. — feat: modulo Documentos (Fase 1) -- pastas, pendencias, atualizacoes e lixeira
- 28/09/2026 11:11 · `0f21a70` · +188/−6 · 6 arq. — feat: inativacao em 60 dias, aprovacao agregada com liberacao automatica de acesso e historico de empresas
- 28/09/2026 11:56 · `d224235` · +308/−8 · 7 arq. — feat: pasta de empresa em Documentos vira lista achatada de todos os documentos
- 28/09/2026 12:01 · `5dc41fa` · +31/−0 · 2 arq. — fix: auditoria de colaborador passa a rastrear troca de anexos (array), nao so o campo legado
- 28/09/2026 12:45 · `d12e4b2` · +97/−27 · 1 arq. — feat: agrupa a lista de documentos por empresa em pastas de colaborador
- 28/09/2026 15:55 · `9388747` · +6/−3 · 2 arq. — feat: administrativo passa a aparecer em Documentos > Pendencias
- 28/09/2026 16:28 · `bb09383` · +68/−20 · 12 arq. — feat: Documentos ganha permissao propria, independente de Colaboradores
- 28/09/2026 16:30 · `c46ff34` · +14/−1 · 1 arq. — fix: silencia warning de <script> no RootLayout (React 19 / Next 16)
- 28/09/2026 17:17 · `5b98677` · +182/−24 · 3 arq. — fix: pasta de empresa em Documentos usa o nome mais frequente do CNPJ
- 28/09/2026 17:23 · `fc5469e` · +5/−1 · 1 arq. — fix: warning de Select nao-controlado ao limpar filtros em Documentos

### CheckObra (app mobile) — 14 commits (`Rosh-Participacoes/checkObra-main`)

- 03/09/2026 11:08 · `a8e87bb` · +18735/−0 · 92 arq. — Initial commit: CheckObra app com atribuicao remota de obra por dispositivo
- 03/09/2026 15:24 · `55cfe89` · +109/−33 · 5 arq. — Suporta multiplas obras por dispositivo e refresh automatico de atribuicao
- 03/09/2026 16:12 · `0e6a29a` · +6/−5 · 1 arq. — Reduz intervalo de reconferencia de atribuicao para 20s
- 03/09/2026 16:29 · `30cb857` · +7/−31 · 2 arq. — Corrige upload de foto na sincronizacao e icone vazio na aba Pendencias
- 08/09/2026 16:01 · `b475e1e` · +250/−98 · 9 arq. — feat: login real por e-mail + codigo, substitui o mock local
- 09/09/2026 09:22 · `49ab574` · +981/−51 · 5 arq. — feat: atualizacao instantanea do dispositivo via Firestore realtime, sem polling
- 09/09/2026 09:29 · `5d490c8` · +14/−1 · 1 arq. — fix: descartar sessao antiga (mock) presa no SecureStore apos atualizar o app
- 09/09/2026 09:42 · `0d27d56` · +166/−35 · 3 arq. — feat: historico filtrado pela obra do tablet (accordion se tiver mais de uma) + admin com diagnostico
- 09/09/2026 09:56 · `b0c9be5` · +7/−25 · 2 arq. — refactor: tirar lista de modelos de checklist da area Admin do app
- 09/09/2026 10:17 · `562013f` · +15/−3 · 1 arq. — fix: loading infinito no login -- forcar long-polling no Firestore (React Native)
- 09/09/2026 10:30 · `8531b9f` · +81/−5 · 3 arq. — feat: autocomplete no equipamento, lider/encarregado e responsavel da Seguranca do Trabalho
- 09/09/2026 10:39 · `5301cef` · +52/−7 · 3 arq. — feat: sugerir lider/seguranca a partir de Usuarios cadastrados, nao do historico local
- 09/09/2026 10:53 · `62b8c82` · +21/−4 · 2 arq. — fix: key duplicada no autocomplete e sessao do Firebase Auth sem persistencia
- 18/09/2026 16:42 · `a0d2b33` · +504/−61 · 10 arq. — feat: rubrica desenhada em tela cheia, foto opcional na observacao e ajustes de UX no checklist

### RoshSign — 14 commits (`Rosh-Participacoes/RoshSign-main`)

- 14/09/2026 13:04 · `e00f6ca` · +260512/−100 · 300 arq. — feat: assinatura ICP-Brasil compatível com o validador do ITI e restrita por permissão
- 14/09/2026 15:53 · `77fcbed` · +757/−1009 · 15 arq. — fix: assinatura ICP-Brasil reprovada pelo validador do ITI
- 14/09/2026 15:56 · `a20ee46` · +3/−259646 · 300 arq. — chore: remove pasta scratch do versionamento
- 14/09/2026 16:01 · `67223c9` · +51/−12 · 1 arq. — fix: erro real do Web PKI deixa de ser engolido e suporta licença
- 14/09/2026 16:21 · `d35b3d4` · +526/−3 · 5 arq. — feat: assinatura ICP-Brasil com certificado A1 direto no navegador
- 14/09/2026 17:22 · `8e91408` · +20/−7 · 3 arq. — fix: alinha assinatura com amostra aprovada pelo validador do ITI
- 14/09/2026 22:51 · `9d94c33` · +299/−2 · 3 arq. — feat: certificado de conclusão na trilha de auditoria
- 15/09/2026 01:14 · `ee0d61a` · +229/−3 · 7 arq. — feat: vincula assinatura de cada signatario a um CNPJ
- 15/09/2026 01:23 · `a8a2735` · +124/−13 · 4 arq. — feat: rubrica, adocao de assinatura e base legal no certificado
- 15/09/2026 08:34 · `6c86e5a` · +187/−5 · 3 arq. — fix: download nunca mais entrega PDF "digital" sem assinatura
- 15/09/2026 08:42 · `4d7d59d` · +47/−0 · 1 arq. — feat: diagnostico confere a ordem canonica dos signedAttrs
- 15/09/2026 09:00 · `3a54c6c` · +108/−7 · 2 arq. — feat: varredura de pasta e correcoes no diagnostico de assinatura
- 16/09/2026 17:22 · `72be350` · +130/−17 · 2 arq. — feat: exige justificativa ao reprovar documento e notifica signatarios
- 22/09/2026 09:58 · `c1d6dd5` · +0/−15 · 1 arq. — chore: retirada da logo

### OpenTicket / Nexus — 9 commits (`Rosh-Participacoes/OpenTicket-main`)

- 10/09/2026 17:17 · `e16a88e` · +674/−16 · 10 arq. — Feat - Solicitação de Adiantamento (Financeiro) + auditoria
- 21/09/2026 14:47 · `bea9ff3` · +1/−1 · 3 arq. — fix: remoção da logo rosh
- 22/09/2026 12:15 · `b3e0180` · +502/−5 · 11 arq. — Feat - Apropriação de Despesas na Solicitação de Adiantamento (Financeiro)
- 22/09/2026 14:14 · `317e529` · +90/−9 · 3 arq. — Feat - Busca de Fornecedor (credor Sienge) na Solicitação de Adiantamento
- 22/09/2026 16:20 · `d173bb0` · +18/−5 · 2 arq. — Fix - Apropriação de Despesas (Adiantamento): UX e obrigatoriedade
- 23/09/2026 09:37 · `e96e7a3` · +234/−82 · 5 arq. — Fix - Adiantamento: relatório completo, campos com rótulo e chat com colar imagem
- 23/09/2026 10:47 · `a38fa7e` · +68/−29 · 3 arq. — Fix - Chat: colar print funciona com foco fora do campo // Fix - Relatório Adiantamento: quebra de linha por campo e títulos não cortados
- 23/09/2026 11:57 · `6a10e6e` · +44/−6 · 7 arq. — Feat - Adiantamento: campo Empresa (busca do Sienge)
- 28/09/2026 08:46 · `dde346c` · +33/−35 · 3 arq. — fix: tirando obrigatoriedade em alguns campos do adiantamento para o financeiro

### Rosh Comunicados — 7 commits (`Rosh-Participacoes/rosh-main`)

- 03/09/2026 09:28 · `9fbfb68` · +2/−2 · 1 arq. — fix: troca de email autorizado a exclusão de notas
- 09/09/2026 17:45 · `3caf08c` · +141/−19 · 8 arq. — feat: linkifica URLs no conteúdo das publicações
- 10/09/2026 08:38 · `af53b4b` · +6/−2 · 2 arq. — fix: ajusta corte de texto no feed conforme altura da imagem
- 10/09/2026 08:52 · `6184baf` · +94/−11 · 3 arq. — feat: drag-and-drop no upload de imagens e carrossel no card do feed
- 10/09/2026 08:55 · `c117c02` · +64/−11 · 2 arq. — feat: leva o carrossel de imagens para o modo Feed também
- 21/09/2026 09:59 · `8039b8e` · +13/−8 · 3 arq. — chore: retirada da logo e atualkização next
- 22/09/2026 09:19 · `3238929` · +0/−24 · 8 arq. — chore: retirada da logo

### Landing Page — 5 commits (`Rosh-Participacoes/LandingPage-main`)

- 18/09/2026 10:31 · `6363807` · +9/−17 · 4 arq. — chore: comentar section da timeline
- 18/09/2026 14:45 · `4a66e0b` · +0/−1 · 1 arq. — fix: ajuste de build
- 18/09/2026 15:07 · `3b5780e` · +21/−22 · 2 arq. — chore: cometado os patners
- 20/09/2026 19:23 · `0cc7c04` · +20/−24 · 3 arq. — fix: retirada da logo e ajuste no nome da Rosh
- 21/09/2026 14:01 · `2b8bc24` · +0/−52 · 3 arq. — fix: retirada do favicon

### Inventário TI — 3 commits (`Rosh-Participacoes/InventarioTI-Web`)

- 22/09/2026 10:47 · `de7fc75` · +63/−75 · 10 arq. — chore: retirada da logo
- 22/09/2026 10:47 · `458e042` · +895/−147 · 21 arq. — Merge branch 'main' of https://github.com/Rosh-Participacoes/InventarioTI-Web
- 24/09/2026 09:53 · `29713e4` · +0/−1 · 1 arq. — fix: remove referência quebrada a TERMO_LOGO_URL no termo do RoshSign

### GED — 2 commits (`Rosh-Participacoes/GED-main`)

- 08/09/2026 10:32 · `9ad9a09` · +64/−7 · 5 arq. — fix: aceita traço tipografico colado do Word e renomeia tipo FOR para F na nomenclatura
- 08/09/2026 15:09 · `4738dcf` · +28/−3 · 2 arq. — fix: escapa barra de pasta aninhada no ID do documento controlado no Firestore

### Controle de Acesso — 2 commits (`Rosh-Participacoes/accessControl-main`)

- 22/09/2026 09:43 · `4efc7ef` · +69/−69 · 12 arq. — chore: retirada da logo
- 22/09/2026 11:16 · `d3d5a9b` · +2/−11 · 1 arq. — fix: corrige erro ao gerar relatorio na ficha do colaborador

### Login — 1 commits (`Rosh-Participacoes/login-main`)

- 22/09/2026 08:56 · `a875afa` · +3/−3 · 2 arq. — chore: remove logotipo antigo não utilizado

### RoshCheck — 1 commits (`Rosh-Participacoes/RoshCheck`)

- 22/09/2026 10:24 · `d656c9c` · +1204/−460 · 13 arq. — chore: retirada da logo

### DevLog (pessoal) — 15 commits (`EduardooSodre/devlog`)

- 04/09/2026 16:46 · `21ad140` · +4535/−212 · 49 arq. — feat: task dialog/assignee/push, multi-view boards, org licensing, departments
- 04/09/2026 17:04 · `10f6e1e` · +67/−18 · 6 arq. — fix: enforce department visibility on card/comment/attachment/column routes
- 04/09/2026 19:41 · `5bbcf36` · +102/−26 · 2 arq. — feat: auto-move completed tasks to Concluído, filter timeline by mine/status
- 09/09/2026 15:51 · `fc1409e` · +2488/−350 · 36 arq. — feat: adiciona onboarding, modal de perfil, subtarefas de cards e emails de convite
- 14/09/2026 10:41 · `199c6af` · +980/−59 · 16 arq. — feat: card difficulty/visibility, cross-project linking, and filter panel
- 18/09/2026 17:11 · `440bb63` · +2131/−146 · 40 arq. — feat: implement core Kanban board, workspace management, and dashboard features
- 21/09/2026 08:24 · `429c362` · +297/−293 · 6 arq. — fix: ajuste no package para build
- 21/09/2026 08:37 · `fc094fb` · +48/−31 · 3 arq. — fix: reduz bundle do middleware para caber no limite de 1MB da Vercel
- 21/09/2026 09:28 · `9055c7f` · +2/−2 · 2 arq. — fix: corrige layout quebrado do card de plano Enterprise
- 21/09/2026 09:35 · `1ad7ca2` · +4/−5 · 1 arq. — fix: remove automatic_tax do checkout — quebrava com stripe_tax_inactive
- 22/09/2026 10:53 · `2b0baaa` · +4/−1 · 1 arq. — fix: libera /api/webhooks/* do middleware de auth
- 22/09/2026 11:26 · `12ecea5` · +9/−1 · 1 arq. — fix: customer.subscription.updated quebrava com 500 (current_period_end)
- 28/09/2026 10:50 · `9f5fedc` · +1816/−568 · 35 arq. — feat: convites automáticos, billing só do dono, permissões por criador e membros por board
- 28/09/2026 14:00 · `a367e91` · +2/−2 · 1 arq. — fix: excluir card não dispara toast de erro duplicado
- 28/09/2026 14:01 · `8006307` · +2494/−7 · 24 arq. — feat: relatório de trabalho (Excel/PDF + resumo por IA) e painel Super Admin
