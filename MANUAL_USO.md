# Manual de Uso — Portal Reverse Engenharia

> Documentação oficial do Portal Reverse Engenharia. Lê este manual antes de começar a usar o portal no dia-a-dia.

---

## Sumário

1. [Primeiros passos](#1-primeiros-passos)
2. [Módulos](#2-módulos)
3. [Fluxos completos](#3-fluxos-completos)
4. [Sincronização Google Sheets](#4-sincronização-google-sheets)
5. [Solução de problemas](#5-solução-de-problemas)

---

## 1. Primeiros passos

### 1.1 — Como abrir o portal

O portal está hospedado no GitHub Pages:

**`https://engenhariareverse.github.io/portal-reverse`**

Salve esse endereço como favorito no navegador. Recomendamos **Google Chrome** ou **Microsoft Edge** para melhor compatibilidade.

#### Instalar como aplicativo no Windows (recomendado)
1. Abra o portal no Chrome ou Edge
2. Clique no ícone de **"Instalar app"** que aparece na barra de endereços (ou menu ⋮ → Instalar)
3. O portal vira um aplicativo independente, com atalho no desktop e na barra de tarefas
4. Funciona offline depois da primeira abertura

### 1.2 — Visão geral da interface

- **Sidebar (lado esquerdo):** menu de navegação entre os módulos
- **Header (barra superior):** breadcrumb, busca global (Ctrl+K), data atual
- **Área principal:** conteúdo do módulo selecionado
- **Botão "Tema Escuro" / "Tema Claro":** alterna entre os temas
- **Botão "Exportar Backup":** baixa todos os seus dados em um arquivo `.json`

### 1.3 — Atalhos de teclado

| Atalho | Ação |
|---|---|
| `Ctrl + K` | Foca na busca global |
| `N` | Cria um novo item no módulo atual (cliente, orçamento etc) |
| `/` | Foca no filtro de busca do módulo atual |
| `Esc` | Fecha qualquer modal aberto |

### 1.4 — Como fazer backup e restaurar

**Exportar backup:**
1. Clique em **"Exportar Backup"** na sidebar
2. Um arquivo `.json` será baixado com toda a sua base
3. Guarde esse arquivo em um local seguro (Google Drive, OneDrive, pendrive)

**Importar backup:**
1. **Clique com o botão direito** em "Exportar Backup"
2. Selecione o arquivo `.json` salvo anteriormente
3. ⚠️ Isso **substitui** todos os dados atuais — confirme antes!

**Recomendação:** faça backup pelo menos **uma vez por semana**.

---

## 2. Módulos

### 2.1 — Dashboard

**O que é:** Tela inicial com visão geral do negócio.

**KPIs disponíveis:**
- Total de clientes (e quantos ativos)
- Serviços cadastrados (e quantos recorrentes)
- Compromissos próximos (próximos 7 dias)
- Total a receber (e quantos em atraso)
- Prospecção (leads no funil)
- **Contas a pagar próximos 7 dias** (valor total + quantidade)
- **Contas atrasadas** (alerta vermelho se houver)
- **Margem média dos orçamentos do mês** (verde ≥30%, laranja 15-30%, vermelho <15%)

**Gráficos:**
- **Receita × Despesa** dos últimos 6 meses

**Listas:**
- Clientes recentes
- Próximos compromissos

> **Dica:** Clique em qualquer card para ir direto ao módulo relacionado.

### 2.2 — Clientes

**O que é:** Cadastro completo de pessoas/empresas que contratam serviços.

**Como criar um cliente:**
1. Vá em **Clientes** → **+ Novo Cliente**
2. Preencha pelo menos **nome** (campo obrigatório)
3. Telefone, e-mail, endereço, CNPJ, cidade, observações são opcionais
4. Selecione **Status**: Ativo / Prospecto / Lead / Inativo
5. Clique **Salvar**

**Editar / excluir:** clique no cliente da lista para ver os detalhes → botões de ação.

### 2.3 — Serviços

**O que é:** Catálogo dos serviços que a Reverse oferece (PMOC, Laudo, ART, Perícia etc).

**Campos importantes:**
- **Nome e Descrição**
- **Categoria** (livre)
- **Faixa de preço:** mínimo, ideal, máximo
- **Recorrência:** mensal / anual / pontual
- **% NF** (default 7) — alíquota da Nota Fiscal
- **% ART** (default 11) — alíquota da Anotação de Responsabilidade Técnica
- **ART ativo por padrão?** — marca se esse serviço usa ART automaticamente
- **Custos fixos** — campo livre (ex: "Nota MEI R$ 100, Frete R$ 90")

> **Dica:** já vêm 6 serviços-padrão pré-cadastrados (PMOC, Laudo Brinquedo, Desmanche, Perícia Mecânica, Vistoria Veicular, ART). Você pode editá-los à vontade.

### 2.4 — Orçamentos

**O que é:** Geração de propostas comerciais para clientes.

#### Visão do cliente (PDF)
- Lista de itens (descrição, qtd, valor unitário, total)
- Subtotal, desconto, total final
- Validade da proposta
- Condições de pagamento
- Observações

#### Memorial de Cálculo (interno — NÃO aparece no PDF do cliente)
- **Tabela de custos:** itens com qtd × valor unitário
- **NF [%]** — calculado sobre o valor do orçamento
- **ART [%]** — calculado sobre o valor do orçamento
- **Lucro = Orçamento − Custos − Impostos**
- **Margem % = Lucro / Orçamento × 100**
- **Prolabore %** — porcentagem do lucro que você se paga

#### Alertas automáticos
- 🟡 **Margem entre 15% e 30%** — margem apertada
- 🔴 **Margem abaixo de 15%** — margem baixa, revisar!

#### Ao aprovar um orçamento
- Status muda para "Aprovado"
- Você pode lançar os impostos (NF + ART) automaticamente em **Contas a Pagar**

#### Como criar
1. **Orçamentos** → **+ Novo Orçamento**
2. Selecione o cliente
3. Adicione itens (clica em "+ Adicionar Item")
4. (Opcional) abra o **Memorial de Cálculo** para ver lucro/margem
5. Defina validade, condições e status
6. Salve. Depois pode exportar PDF/Excel.

### 2.5 — Agenda

**O que é:** Calendário de compromissos, visitas e entregas.

**Visualizações:** Mensal, Semanal, Diária, Lista.

**Tipos de compromisso:**
- **Visita** (cor azul)
- **Reunião** (cor laranja)
- **Entrega** (cor verde)

**Vincular a cliente:** opcional. Se vinculado, aparece o nome do cliente no card.

**Status:** Pendente / Concluído / Cancelado.

> **Alertas:** Compromissos de hoje aparecem como toast assim que o portal abre.

### 2.6 — Kanban

**O que é:** Quadro de tarefas estilo Trello para gestão de projetos.

**Colunas padrão:** A Fazer · Em Andamento · Concluído.

**Como usar:**
1. Crie cards com título, descrição, prazo e cliente
2. Arraste entre colunas conforme o andamento
3. Cards com prazo próximo ficam destacados

### 2.7 — Financeiro

Tem 4 abas:

#### Contas a Receber
Lançamentos vinculados a orçamentos aprovados.
**KPIs:** Total a receber · Em atraso · Pendentes.

#### Contas a Pagar
Despesas da empresa (fornecedores, salários, aluguel, impostos, software etc).

**Campos:**
- Descrição (obrigatório)
- Categoria: Fornecedor / Salário / Aluguel / Software / Impostos / Material / Frete / Outros
- Fornecedor
- Valor (obrigatório)
- Vencimento (obrigatório)
- Status: Pendente / Pago / Atrasado (calculado)
- Data de pagamento (preenche ao marcar como pago)
- Forma de pagamento: PIX / Boleto / Cartão / Dinheiro / Transferência
- **Recorrência:** Única / Mensal / Anual
- **Parcelas:** quando é mensal/anual, gera N parcelas automaticamente
- Anexo (URL)
- Observação

**KPIs:** Pendente · Atrasado · Pago no mês · Próximos 7 dias.

#### Histórico
Lista de tudo já lançado (recebido e pago).

#### Visão Geral
Consolidado: a receber × a pagar × saldo previsto.

### 2.8 — ARTs

**O que é:** Controle de Anotações de Responsabilidade Técnica emitidas no CREA-SP.

**Campos:** número da ART, cliente, descrição, data de emissão, valor, status, anexo (URL do PDF).

### 2.9 — Documentos

**O que é:** Repositório de arquivos por cliente (contratos, relatórios, plantas etc).

**Cada documento:** título, cliente, descrição, URL (link para Drive/OneDrive ou similar), data.

### 2.10 — Prospecção

**O que é:** Funil de vendas (CRM) para gerenciar leads antes de virarem clientes.

**Campos:** empresa, contato, telefone, email, cidade/UF, segmento, tipo de serviço, origem (LinkedIn, Indicação, etc), status do funil, próximo follow-up, histórico.

**Status do funil:** Novo · Pesquisado · 1ª abordagem · Em conversa · Proposta enviada · Quente · Frio · Convertido · Perdido.

**Configurações:** É aqui que você cola a URL do Google Apps Script para sincronizar com Google Sheets.

---

## 3. Fluxos completos

### 3.1 — Cadastrar cliente → criar orçamento → aprovar → lançar impostos

1. **Clientes → + Novo Cliente** — preencha os dados básicos e salve
2. **Orçamentos → + Novo Orçamento** — selecione o cliente recém-criado
3. Adicione os serviços (itens) e quantidades
4. Abra o **Memorial de Cálculo** e preencha:
   - Custos diretos (ex: "Sigma R$ 2.720", "Nota MEI R$ 100", "Frete R$ 90")
   - Confirme % NF e % ART (puxam do cadastro do serviço)
   - Veja **Lucro** e **Margem %** em tempo real
5. Salve com status **Enviado**
6. Quando o cliente aprovar: edite o orçamento → status **Aprovado**
7. Clique em **"Lançar impostos em Contas a Pagar"** → cria automaticamente as contas de NF e ART como pendentes no Financeiro

### 3.2 — Cadastrar conta a pagar recorrente → marcar como paga

1. **Financeiro → aba Contas a Pagar → + Nova Conta**
2. Preencha (ex: aluguel mensal R$ 1.500, todo dia 5)
3. Em **Recorrência**, selecione **Mensal**, com **12 parcelas**
4. Salve → o portal cria 12 contas, uma para cada mês
5. Quando pagar uma delas:
   - Clique na conta
   - Em **Data de pagamento**, escolha hoje
   - Em **Forma de pagamento**, selecione (ex: PIX)
   - Salve → status muda para **Pago**

### 3.3 — Prospect → cliente convertido

1. **Prospecção → + Novo Prospect**
2. Preencha empresa, contato, segmento, origem
3. Status: **Novo**
4. Ao avançar:
   - Pesquisado (conferiu o site, LinkedIn)
   - 1ª abordagem (mandou mensagem)
   - Em conversa
   - Proposta enviada (criou orçamento)
   - Quente / Frio / Perdido / **Convertido**
5. Ao **Convertido:** crie o cliente em **Clientes → + Novo Cliente** com os mesmos dados

### 3.4 — Backup mensal → restaurar em outro computador

**Backup:**
1. Clique **Exportar Backup** no fim de cada mês
2. Salve o arquivo `reverse_backup_AAAA-MM-DD.json` em local seguro

**Restaurar:**
1. No novo computador, abra o portal pelo navegador
2. **Clique com botão direito** em "Exportar Backup"
3. Selecione o `.json` salvo
4. Confirme → todos os dados retornam

---

## 4. Sincronização Google Sheets

A sincronização com Google Sheets serve para **Prospecção** (CRM) e **Contas a Pagar** — outros módulos ficam só localmente.

### 4.1 — Configurar pela primeira vez

#### Passo 1: criar a planilha
1. Acesse [drive.google.com](https://drive.google.com)
2. **+ Novo → Planilha do Google**
3. Renomeie para `Reverse Engenharia — Portal`

#### Passo 2: instalar o Apps Script
1. Na planilha: **Extensões → Apps Script**
2. Apague tudo do editor padrão
3. Cole o conteúdo de `apps_script/Code.gs` do projeto
4. Salve (Ctrl+S) e nomeie como `Reverse Engenharia API`
5. Selecione a função `setupPlanilha` e clique ▶ **Executar**
6. Autorize quando pedir (vai criar as abas `Prospeccao` e `ContasPagar`)

#### Passo 3: publicar como Web App
1. **Implantar → Novo deploy**
2. Tipo: **App da Web**
3. Executar como: **Eu** (sua conta Google)
4. Quem pode acessar: **Qualquer pessoa**
5. **Implantar** → copie a URL gerada

#### Passo 4: cadastrar no portal
1. Abra o portal
2. **Prospecção → Configurações**
3. Cole a URL e clique **Salvar**

### 4.2 — Sincronizar manualmente

- **Prospecção:** o módulo sincroniza automaticamente ao salvar/editar/excluir
- **Contas a Pagar:** botão **⟳ Sheets** na aba Contas a Pagar do Financeiro

### 4.3 — O que sincroniza e o que fica só local

| Módulo | Sincroniza com Sheets? |
|---|---|
| Prospecção | ✅ Sim |
| Contas a Pagar | ✅ Sim |
| Clientes | ❌ Só local |
| Serviços | ❌ Só local |
| Orçamentos | ❌ Só local |
| Agenda | ❌ Só local |
| Kanban | ❌ Só local |
| ARTs | ❌ Só local |
| Documentos | ❌ Só local |

> **Por que só esses dois?** Prospecção precisa de acesso multi-dispositivo (você no campo, alguém no escritório), e Contas a Pagar facilita a conferência com contador. Os demais módulos são primários no portal e não justificam a complexidade do Google Sheets.

---

## 5. Solução de problemas

### Portal não abre / página em branco

1. **Verifique a internet** — o GitHub Pages precisa estar acessível
2. **Limpe o cache do navegador:** Ctrl+Shift+Del → "Imagens e arquivos em cache"
3. **Abra em janela anônima** (Ctrl+Shift+N) — se funcionar, é cache mesmo
4. **Tente outro navegador** — Chrome, Edge, Firefox

### Dados sumiram

> ⚠️ Os dados ficam no **IndexedDB** do navegador. Se você limpar o cache "completo" do navegador, **eles podem ser apagados**.

**O que fazer:**
1. **Restaure pelo último backup** (Exportar Backup → botão direito → selecione o `.json`)
2. Se não tiver backup, infelizmente os dados se perderam — sempre faça backup semanal!

### Sincronização Google Sheets falha

**Sintoma:** Toast vermelho ao salvar/clicar em sincronizar.

**Verificações:**
1. **URL correta?** Vá em **Prospecção → Configurações** e confira
2. **Web App está publicado como "Qualquer pessoa"?** Reabra o Apps Script e verifique em "Implantar → Gerenciar deploys"
3. **Atualizou o Code.gs recentemente?** Toda alteração precisa de novo deploy
4. **Está online?** A sincronização precisa de internet

### Backup não importa

**Sintoma:** Erro ao tentar importar `.json`.

**Verificações:**
1. **Arquivo é o correto?** Deve começar com `reverse_backup_` ou ter sido exportado por este mesmo portal
2. **Arquivo foi editado?** Não edite o `.json` manualmente
3. **Versão do portal?** Backups antigos podem não ser compatíveis com versões muito novas

### Como pedir ajuda

Em caso de dúvida ou erro persistente:
1. Tire um print da tela com o erro
2. Anote o passo-a-passo do que estava fazendo
3. Envie para o suporte com essas informações

---

**Versão deste manual:** v1.0.0 — Maio 2026  
**Portal:** [github.com/engenhariareverse/portal-reverse](https://github.com/engenhariareverse/portal-reverse)
