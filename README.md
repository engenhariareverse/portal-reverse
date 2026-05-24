# Portal JOTEC Soluções

Portal de gestão interna para JOTEC Soluções — Engenharia Mecânica · Segurança · Conformidade (CREA-SP, RMC).

## O que é

SPA (Single Page Application) 100% frontend — sem servidor de banco de dados, sem backend obrigatório. Todos os dados ficam no navegador via IndexedDB. O módulo **Prospecção** se integra opcionalmente com Google Sheets para acesso multi-dispositivo.

### Módulos

| Módulo | Descrição |
|---|---|
| Dashboard | KPIs, clientes recentes, próximos compromissos |
| Clientes | Cadastro e gestão de clientes |
| Serviços | Catálogo de serviços com faixa de preço |
| Orçamentos | Geração de orçamentos com export PDF/Excel |
| Agenda | Calendário mensal/semanal/diário/lista |
| Kanban | Quadro de tarefas e prazos por projeto |
| Financeiro | Contas a receber, histórico, gráficos |
| ARTs | Controle de Anotações de Responsabilidade Técnica |
| Documentos | Gestão de documentos por cliente |
| Prospecção | Funil de vendas + Follow-up + integração Google Sheets |

## Como rodar localmente

**Opção 1 — Python (recomendado):**

```bash
cd JOTEC_Portal
python -m http.server 7373
```

Acesse: `http://localhost:7373`

**Opção 2 — VS Code Live Server:**  
Instale a extensão Live Server → botão "Go Live" na barra de status.

> **Atenção:** abrir `index.html` diretamente pelo explorador de arquivos (`file:///`) não funciona bem com os módulos JS. Use sempre um servidor HTTP local.

## Configurar o módulo Prospecção

Para usar o módulo de Prospecção com sincronização pelo Google Sheets, siga o passo-a-passo em [docs/SETUP_PROSPECCAO.md](docs/SETUP_PROSPECCAO.md).

## Deploy no GitHub Pages

Veja o tutorial completo em [docs/DEPLOY_GITHUB_PAGES.md](docs/DEPLOY_GITHUB_PAGES.md).

## Backup dos dados

Os dados dos demais módulos (Clientes, Orçamentos, Agenda etc.) ficam no IndexedDB do navegador. Use o botão **"Exportar Backup"** na sidebar regularmente para salvar um `.json` no seu computador.

## Tecnologias

- HTML5 / CSS3 / JavaScript Vanilla (ES2020+)
- [Chart.js](https://www.chartjs.org/) — gráficos
- [SortableJS](https://sortablejs.github.io/Sortable/) — drag & drop
- [jsPDF](https://github.com/parallax/jsPDF) + AutoTable — export PDF
- [SheetJS (XLSX)](https://sheetjs.com/) — export Excel
- [html2canvas](https://html2canvas.hertzen.com/) — screenshot para PDF
- [Day.js](https://day.js.org/) — manipulação de datas
- IndexedDB — armazenamento local
- Google Sheets + Apps Script — banco online para Prospecção (opcional)
