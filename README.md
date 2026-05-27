# Portal Reverse Engenharia

Portal de gestão interno para a **Reverse Engenharia** — Engenharia · Segurança · Conformidade.

🌐 **Acesso:** [engenhariareverse.github.io/portal-reverse](https://engenhariareverse.github.io/portal-reverse)

---

## Funcionalidades

| Módulo | Descrição |
|---|---|
| **Dashboard** | KPIs em tempo real: clientes, financeiro, margem, contas a pagar |
| **Clientes** | Cadastro completo com histórico |
| **Serviços** | Catálogo com % NF, % ART e custos fixos |
| **Orçamentos** | Memorial de cálculo interno + PDF para o cliente |
| **Agenda** | Compromissos e visitas com alertas |
| **Kanban** | Gestão de tarefas por projeto |
| **Financeiro** | Contas a Receber + Contas a Pagar + Visão Geral |
| **ARTs** | Controle de Anotações de Responsabilidade Técnica |
| **Documentos** | Repositório de arquivos internos |
| **Prospecção** | CRM com funil de vendas e follow-up |

## Tecnologia

- **Frontend:** HTML5 + CSS3 + JavaScript (ES6+ vanilla, sem framework)
- **Banco de dados:** IndexedDB (local, offline-first)
- **Sincronização:** Google Sheets via Apps Script
- **Hospedagem:** GitHub Pages (estático, sem servidor)

## Como usar

### Primeira vez
1. Acesse o link acima
2. O portal funciona direto no navegador — sem instalação
3. Todos os dados ficam salvos localmente no navegador

### Backup
- Use **Exportar Backup** (barra superior) para salvar um arquivo `.json`
- Use **Importar Backup** para restaurar em outro dispositivo

### Sincronização com Google Sheets
1. Crie uma planilha chamada `Reverse Engenharia — Portal` no Google Drive
2. Abra **Extensões → Apps Script** e cole o conteúdo de `apps_script/Code.gs`
3. Execute `setupPlanilha`, depois implante como **Web App** (acesso: qualquer pessoa)
4. Cole a URL gerada em **Prospecção → Configurações** no portal

## Desenvolvimento local

```bash
# Servir localmente (qualquer servidor HTTP estático)
npx serve .
# ou
python -m http.server 8080
```

> **Atenção:** abrir `index.html` diretamente pelo explorador de arquivos (`file:///`) não funciona — use sempre um servidor HTTP local.

## Versão

**v1.0.0** — Maio 2026  
Desenvolvido para uso interno da Reverse Engenharia.
