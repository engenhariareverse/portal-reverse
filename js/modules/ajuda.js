/**
 * Módulo Ajuda — renderiza o Manual de Uso dentro do portal,
 * com busca por palavra-chave, sumário clicável e export PDF.
 *
 * O conteúdo é definido aqui como estrutura JS (em vez de fetch do MD)
 * para funcionar offline e em file:// — espelha o MANUAL_USO.md da raiz.
 */
const Ajuda = (() => {

  const MANUAL = [
    {
      id: 'primeiros-passos',
      titulo: '1. Primeiros passos',
      secoes: [
        {
          titulo: '1.1 — Como abrir o portal',
          html: `
            <p>O portal está hospedado no GitHub Pages:</p>
            <p><strong><a href="https://engenhariareverse.github.io/portal-reverse" target="_blank">engenhariareverse.github.io/portal-reverse</a></strong></p>
            <p>Salve esse endereço como favorito. Recomendamos <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong>.</p>
            <h5>Instalar como aplicativo no Windows</h5>
            <ol>
              <li>Abra o portal no Chrome ou Edge</li>
              <li>Clique no ícone de <em>"Instalar app"</em> na barra de endereços (ou menu ⋮ → Instalar)</li>
              <li>O portal vira aplicativo independente com atalho no desktop</li>
              <li>Funciona offline depois da primeira abertura</li>
            </ol>
          `,
        },
        {
          titulo: '1.2 — Visão geral da interface',
          html: `
            <ul>
              <li><strong>Sidebar (esquerda):</strong> menu de navegação entre módulos</li>
              <li><strong>Header (topo):</strong> breadcrumb, busca global (Ctrl+K), data atual</li>
              <li><strong>Área principal:</strong> conteúdo do módulo selecionado</li>
              <li><strong>Tema Escuro/Claro:</strong> alterna entre temas no rodapé da sidebar</li>
              <li><strong>Exportar Backup:</strong> baixa todos os dados em um .json</li>
            </ul>
          `,
        },
        {
          titulo: '1.3 — Atalhos de teclado',
          html: `
            <table class="ajuda-tabela">
              <thead><tr><th>Atalho</th><th>Ação</th></tr></thead>
              <tbody>
                <tr><td><code>Ctrl + K</code></td><td>Foca na busca global</td></tr>
                <tr><td><code>N</code></td><td>Cria novo item no módulo atual</td></tr>
                <tr><td><code>/</code></td><td>Foca no filtro de busca do módulo atual</td></tr>
                <tr><td><code>Esc</code></td><td>Fecha qualquer modal aberto</td></tr>
              </tbody>
            </table>
          `,
        },
        {
          titulo: '1.4 — Como fazer backup e restaurar',
          html: `
            <h5>Exportar backup</h5>
            <ol>
              <li>Clique em <strong>Exportar Backup</strong> na sidebar</li>
              <li>Um arquivo .json é baixado com toda a sua base</li>
              <li>Guarde em local seguro (Google Drive, OneDrive, pendrive)</li>
            </ol>
            <h5>Importar backup</h5>
            <ol>
              <li><strong>Clique com o botão direito</strong> em "Exportar Backup"</li>
              <li>Selecione o .json salvo anteriormente</li>
              <li>⚠️ Isso <strong>substitui</strong> todos os dados atuais — confirme antes!</li>
            </ol>
            <div class="ajuda-dica">💡 Recomendação: faça backup pelo menos <strong>uma vez por semana</strong>.</div>
          `,
        },
      ],
    },

    {
      id: 'modulos',
      titulo: '2. Módulos',
      secoes: [
        {
          titulo: '2.1 — Dashboard',
          html: `
            <p>Tela inicial com visão geral do negócio.</p>
            <h5>KPIs principais</h5>
            <ul>
              <li>Total de clientes e ativos</li>
              <li>Serviços cadastrados e recorrentes</li>
              <li>Compromissos próximos (7 dias)</li>
              <li>Total a receber e em atraso</li>
              <li>Prospecção (leads no funil)</li>
              <li><strong>Contas a pagar próximos 7 dias</strong></li>
              <li><strong>Contas atrasadas</strong> (alerta vermelho)</li>
              <li><strong>Margem média do mês</strong> (verde ≥30% · laranja 15-30% · vermelho &lt;15%)</li>
            </ul>
            <h5>Gráficos</h5>
            <p>Receita × Despesa dos últimos 6 meses (barras).</p>
            <div class="ajuda-dica">💡 Clique em qualquer card para ir direto ao módulo relacionado.</div>
          `,
        },
        {
          titulo: '2.2 — Clientes',
          html: `
            <p>Cadastro de pessoas/empresas que contratam serviços.</p>
            <h5>Como criar</h5>
            <ol>
              <li><strong>Clientes → + Novo Cliente</strong></li>
              <li>Nome é obrigatório; demais campos opcionais</li>
              <li>Status: Ativo / Prospecto / Lead / Inativo</li>
              <li>Salvar</li>
            </ol>
          `,
        },
        {
          titulo: '2.3 — Serviços',
          html: `
            <p>Catálogo dos serviços (PMOC, Laudo, ART, Perícia etc).</p>
            <h5>Campos importantes</h5>
            <ul>
              <li><strong>Nome, Descrição, Categoria</strong></li>
              <li><strong>Faixa de preço:</strong> mín / ideal / máx</li>
              <li><strong>Recorrência:</strong> mensal / anual / pontual</li>
              <li><strong>% NF</strong> — default 7</li>
              <li><strong>% ART</strong> — default 11</li>
              <li><strong>ART ativo por padrão?</strong> — marca se esse serviço usa ART</li>
              <li><strong>Custos fixos</strong> — texto livre (ex: "Nota MEI R$ 100, Frete R$ 90")</li>
            </ul>
            <div class="ajuda-dica">💡 Já vêm 6 serviços-padrão pré-cadastrados — pode editá-los à vontade.</div>
          `,
        },
        {
          titulo: '2.4 — Orçamentos',
          html: `
            <p>Geração de propostas comerciais.</p>
            <h5>Visão do cliente (PDF)</h5>
            <p>Itens, subtotal, desconto, total, validade, condições, observações.</p>
            <h5>Memorial de Cálculo (interno — NÃO sai no PDF)</h5>
            <ul>
              <li>Tabela de custos (qtd × unitário)</li>
              <li>NF [%] — calculado sobre orçamento</li>
              <li>ART [%] — calculado sobre orçamento</li>
              <li><strong>Lucro = Orçamento − Custos − Impostos</strong></li>
              <li><strong>Margem % = Lucro / Orçamento × 100</strong></li>
              <li><strong>Prolabore %</strong> — % do lucro que você se paga</li>
            </ul>
            <h5>Alertas</h5>
            <ul>
              <li>🟡 Margem 15–30%: apertada</li>
              <li>🔴 Margem &lt; 15%: revisar!</li>
            </ul>
            <h5>Ao aprovar</h5>
            <p>Status muda para Aprovado e você pode lançar NF + ART em Contas a Pagar com um clique.</p>
          `,
        },
        {
          titulo: '2.5 — Agenda',
          html: `
            <p>Calendário de compromissos, visitas e entregas.</p>
            <p><strong>Visualizações:</strong> Mensal · Semanal · Diária · Lista.</p>
            <p><strong>Tipos:</strong> Visita (azul) · Reunião (laranja) · Entrega (verde).</p>
            <p><strong>Status:</strong> Pendente / Concluído / Cancelado.</p>
            <div class="ajuda-dica">💡 Compromissos de hoje aparecem como toast ao abrir o portal.</div>
          `,
        },
        {
          titulo: '2.6 — Kanban',
          html: `
            <p>Quadro de tarefas estilo Trello.</p>
            <p><strong>Colunas padrão:</strong> A Fazer · Em Andamento · Concluído.</p>
            <ol>
              <li>Crie cards com título, descrição, prazo e cliente</li>
              <li>Arraste entre colunas conforme o andamento</li>
              <li>Cards com prazo próximo ficam destacados</li>
            </ol>
          `,
        },
        {
          titulo: '2.7 — Financeiro',
          html: `
            <p>Tem 4 abas:</p>
            <h5>Contas a Receber</h5>
            <p>Lançamentos vinculados a orçamentos aprovados.</p>
            <p><strong>KPIs:</strong> A receber · Em atraso · Pendentes.</p>
            <h5>Contas a Pagar</h5>
            <p>Despesas (fornecedores, salários, aluguel, impostos, software etc).</p>
            <ul>
              <li>Recorrência: Única / Mensal / Anual (gera N parcelas)</li>
              <li>Categorias: Fornecedor / Salário / Aluguel / Software / Impostos / Material / Frete / Outros</li>
              <li>Formas: PIX / Boleto / Cartão / Dinheiro / Transferência</li>
            </ul>
            <p><strong>KPIs:</strong> Pendente · Atrasado · Pago no mês · Próximos 7 dias.</p>
            <h5>Histórico</h5>
            <p>Tudo lançado (recebido e pago).</p>
            <h5>Visão Geral</h5>
            <p>Consolidado: a receber × a pagar × saldo previsto.</p>
          `,
        },
        {
          titulo: '2.8 — ARTs',
          html: `
            <p>Controle de Anotações de Responsabilidade Técnica (CREA-SP).</p>
            <p><strong>Campos:</strong> número, cliente, descrição, emissão, valor, status, anexo (URL).</p>
          `,
        },
        {
          titulo: '2.9 — Documentos',
          html: `
            <p>Repositório de arquivos por cliente (contratos, relatórios, plantas).</p>
            <p>Cada documento: título, cliente, descrição, URL (Drive/OneDrive), data.</p>
          `,
        },
        {
          titulo: '2.10 — Prospecção',
          html: `
            <p>Funil de vendas (CRM) — gerencia leads antes de virarem clientes.</p>
            <h5>Status do funil</h5>
            <p>Novo · Pesquisado · 1ª abordagem · Em conversa · Proposta enviada · Quente · Frio · Convertido · Perdido.</p>
            <h5>Configurações</h5>
            <p>É aqui que você cola a URL do Google Apps Script para sincronizar.</p>
          `,
        },
      ],
    },

    {
      id: 'fluxos',
      titulo: '3. Fluxos completos',
      secoes: [
        {
          titulo: '3.1 — Cliente → Orçamento → Aprovar → Lançar impostos',
          html: `
            <ol>
              <li><strong>Clientes → + Novo Cliente</strong> (preencha e salve)</li>
              <li><strong>Orçamentos → + Novo Orçamento</strong> — selecione o cliente</li>
              <li>Adicione os serviços (itens) e quantidades</li>
              <li>Abra o <strong>Memorial de Cálculo</strong>:
                <ul>
                  <li>Custos diretos (ex: "Sigma R$ 2.720", "Nota MEI R$ 100", "Frete R$ 90")</li>
                  <li>Confirme % NF e % ART (puxam do serviço)</li>
                  <li>Veja <strong>Lucro</strong> e <strong>Margem %</strong> em tempo real</li>
                </ul>
              </li>
              <li>Salve com status <strong>Enviado</strong></li>
              <li>Quando aprovar: edite → status <strong>Aprovado</strong></li>
              <li>Clique em <strong>"Lançar impostos em Contas a Pagar"</strong> → cria NF e ART como pendentes</li>
            </ol>
          `,
        },
        {
          titulo: '3.2 — Conta recorrente → Marcar como paga',
          html: `
            <ol>
              <li><strong>Financeiro → Contas a Pagar → + Nova Conta</strong></li>
              <li>Preencha (ex: aluguel R$ 1.500, todo dia 5)</li>
              <li>Recorrência: <strong>Mensal</strong>, 12 parcelas</li>
              <li>Salve → o portal cria 12 contas</li>
              <li>Ao pagar uma delas:
                <ul>
                  <li>Clique na conta</li>
                  <li>Data de pagamento: hoje</li>
                  <li>Forma: PIX (por exemplo)</li>
                  <li>Salve → status muda para <strong>Pago</strong></li>
                </ul>
              </li>
            </ol>
          `,
        },
        {
          titulo: '3.3 — Prospect → Cliente convertido',
          html: `
            <ol>
              <li><strong>Prospecção → + Novo Prospect</strong></li>
              <li>Empresa, contato, segmento, origem</li>
              <li>Status: Novo → Pesquisado → 1ª abordagem → Em conversa → Proposta enviada → <strong>Convertido</strong></li>
              <li>Ao converter: <strong>Clientes → + Novo Cliente</strong> com os mesmos dados</li>
            </ol>
          `,
        },
        {
          titulo: '3.4 — Backup mensal → Restaurar em outro PC',
          html: `
            <h5>Backup</h5>
            <ol>
              <li><strong>Exportar Backup</strong> no fim de cada mês</li>
              <li>Salve <code>reverse_backup_AAAA-MM-DD.json</code> em local seguro</li>
            </ol>
            <h5>Restaurar</h5>
            <ol>
              <li>No novo PC, abra o portal pelo navegador</li>
              <li><strong>Botão direito</strong> em "Exportar Backup"</li>
              <li>Selecione o .json</li>
              <li>Confirme → dados retornam</li>
            </ol>
          `,
        },
      ],
    },

    {
      id: 'google-sheets',
      titulo: '4. Sincronização Google Sheets',
      secoes: [
        {
          titulo: '4.1 — Configurar pela primeira vez',
          html: `
            <h5>Passo 1: criar a planilha</h5>
            <ol>
              <li>Acesse <a href="https://drive.google.com" target="_blank">drive.google.com</a></li>
              <li>+ Novo → Planilha do Google</li>
              <li>Renomeie para <code>Reverse Engenharia — Portal</code></li>
            </ol>
            <h5>Passo 2: instalar o Apps Script</h5>
            <ol>
              <li>Na planilha: <strong>Extensões → Apps Script</strong></li>
              <li>Apague tudo do editor padrão</li>
              <li>Cole o conteúdo de <code>apps_script/Code.gs</code></li>
              <li>Ctrl+S e nomeie como <code>Reverse Engenharia API</code></li>
              <li>Selecione <code>setupPlanilha</code> e ▶ Executar (autorize)</li>
            </ol>
            <h5>Passo 3: publicar como Web App</h5>
            <ol>
              <li><strong>Implantar → Novo deploy</strong></li>
              <li>Tipo: App da Web</li>
              <li>Executar como: <strong>Eu</strong></li>
              <li>Quem pode acessar: <strong>Qualquer pessoa</strong></li>
              <li>Implantar → copie a URL</li>
            </ol>
            <h5>Passo 4: cadastrar no portal</h5>
            <ol>
              <li>Abra o portal → <strong>Prospecção → Configurações</strong></li>
              <li>Cole a URL e Salve</li>
            </ol>
          `,
        },
        {
          titulo: '4.2 — Sincronizar manualmente',
          html: `
            <ul>
              <li><strong>Prospecção:</strong> sincroniza automaticamente ao salvar/editar/excluir</li>
              <li><strong>Contas a Pagar:</strong> botão <strong>⟳ Sheets</strong> no Financeiro</li>
            </ul>
          `,
        },
        {
          titulo: '4.3 — O que sincroniza e o que fica só local',
          html: `
            <table class="ajuda-tabela">
              <thead><tr><th>Módulo</th><th>Sincroniza?</th></tr></thead>
              <tbody>
                <tr><td>Prospecção</td><td>✅ Sim</td></tr>
                <tr><td>Contas a Pagar</td><td>✅ Sim</td></tr>
                <tr><td>Clientes</td><td>❌ Só local</td></tr>
                <tr><td>Serviços</td><td>❌ Só local</td></tr>
                <tr><td>Orçamentos</td><td>❌ Só local</td></tr>
                <tr><td>Agenda</td><td>❌ Só local</td></tr>
                <tr><td>Kanban</td><td>❌ Só local</td></tr>
                <tr><td>ARTs</td><td>❌ Só local</td></tr>
                <tr><td>Documentos</td><td>❌ Só local</td></tr>
              </tbody>
            </table>
            <div class="ajuda-dica">💡 Prospecção precisa de acesso multi-dispositivo, e Contas a Pagar facilita conferência com contador. Os demais ficam só no portal.</div>
          `,
        },
      ],
    },

    {
      id: 'solucao-problemas',
      titulo: '5. Solução de problemas',
      secoes: [
        {
          titulo: 'Portal não abre / página em branco',
          html: `
            <ol>
              <li>Verifique a internet</li>
              <li>Limpe o cache: Ctrl+Shift+Del → "Imagens e arquivos em cache"</li>
              <li>Abra em janela anônima (Ctrl+Shift+N)</li>
              <li>Tente outro navegador (Chrome, Edge, Firefox)</li>
            </ol>
          `,
        },
        {
          titulo: 'Dados sumiram',
          html: `
            <p>⚠️ Os dados ficam no IndexedDB do navegador. Limpar "todo o cache" pode apagá-los.</p>
            <ol>
              <li>Restaure pelo último backup (botão direito em Exportar Backup → selecione .json)</li>
              <li>Sem backup, infelizmente os dados se perderam — faça backup semanal!</li>
            </ol>
          `,
        },
        {
          titulo: 'Sincronização Google Sheets falha',
          html: `
            <ol>
              <li>URL correta? Veja em Prospecção → Configurações</li>
              <li>Web App publicado como "Qualquer pessoa"?</li>
              <li>Atualizou o Code.gs? Toda alteração precisa de novo deploy</li>
              <li>Está online?</li>
            </ol>
          `,
        },
        {
          titulo: 'Backup não importa',
          html: `
            <ol>
              <li>Arquivo é o correto? Deve começar com <code>reverse_backup_</code></li>
              <li>Não editou o .json manualmente?</li>
              <li>Versão do portal pode estar muito diferente da do backup</li>
            </ol>
          `,
        },
        {
          titulo: 'Como pedir ajuda',
          html: `
            <ol>
              <li>Tire um print da tela com o erro</li>
              <li>Anote o passo-a-passo do que estava fazendo</li>
              <li>Envie para o suporte com essas informações</li>
            </ol>
          `,
        },
      ],
    },
  ];

  let _container = null;
  let _busca = '';

  function _esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _matchSecao(sec, q) {
    if (!q) return true;
    const haystack = (sec.titulo + ' ' + sec.html.replace(/<[^>]+>/g, ' ')).toLowerCase();
    return haystack.includes(q.toLowerCase());
  }

  function _matchCapitulo(cap, q) {
    if (!q) return true;
    if (cap.titulo.toLowerCase().includes(q.toLowerCase())) return true;
    return cap.secoes.some(s => _matchSecao(s, q));
  }

  function render(container) {
    _container = container;
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">📖 Manual de Uso</h1>
          <p class="page-subtitle">Tudo o que você precisa saber sobre o Portal Reverse Engenharia</p>
        </div>
        <div class="page-actions">
          <button class="btn btn--ghost" id="btn-ajuda-pdf">▼ Exportar PDF</button>
        </div>
      </div>

      <div class="ajuda-busca-bar">
        <input
          type="text"
          id="ajuda-busca"
          class="input ajuda-busca-input"
          placeholder="🔍 Buscar no manual (ex: backup, orçamento, sincronizar...)"
          value="${_esc(_busca)}"
          autofocus>
        ${_busca ? `<button class="btn btn--ghost btn--sm" id="ajuda-busca-limpar">Limpar</button>` : ''}
      </div>

      <div class="ajuda-layout">
        <aside class="ajuda-sumario">
          <h4>Sumário</h4>
          <ol id="ajuda-sumario-lista"></ol>
        </aside>
        <article class="ajuda-conteudo" id="ajuda-conteudo"></article>
      </div>
    `;

    _renderConteudo();
    _attachEvents();
  }

  function _renderConteudo() {
    const sumario  = document.getElementById('ajuda-sumario-lista');
    const conteudo = document.getElementById('ajuda-conteudo');
    const q = _busca.trim();

    const capitulosFiltrados = MANUAL
      .map(cap => ({
        ...cap,
        secoes: cap.secoes.filter(s => _matchSecao(s, q)),
      }))
      .filter(cap => !q || cap.titulo.toLowerCase().includes(q.toLowerCase()) || cap.secoes.length > 0);

    if (q && capitulosFiltrados.length === 0) {
      sumario.innerHTML = '';
      conteudo.innerHTML = `
        <div class="empty-state-sm" style="padding:48px">
          <p>Nada encontrado para <strong>"${_esc(q)}"</strong>.</p>
          <p class="text-muted">Tente palavras-chave como <em>backup, orçamento, margem, sheets, parcela</em>.</p>
        </div>
      `;
      return;
    }

    sumario.innerHTML = capitulosFiltrados.map(cap => `
      <li>
        <a href="#cap-${cap.id}" class="ajuda-sumario-link">${_esc(cap.titulo)}</a>
        ${cap.secoes.length > 0 ? `
          <ul>
            ${cap.secoes.map((s, i) => `
              <li><a href="#sec-${cap.id}-${i}" class="ajuda-sumario-sublink">${_esc(s.titulo)}</a></li>
            `).join('')}
          </ul>
        ` : ''}
      </li>
    `).join('');

    conteudo.innerHTML = capitulosFiltrados.map(cap => `
      <section class="ajuda-capitulo" id="cap-${cap.id}">
        <h2>${_esc(cap.titulo)}</h2>
        ${cap.secoes.map((s, i) => `
          <div class="ajuda-secao" id="sec-${cap.id}-${i}">
            <h3>${_esc(s.titulo)}</h3>
            ${_highlightSearch(s.html, q)}
          </div>
        `).join('')}
      </section>
    `).join('');
  }

  function _highlightSearch(html, q) {
    if (!q || q.length < 2) return html;
    try {
      const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      // Aplica marca somente fora de tags HTML
      return html.replace(/(>[^<]+)/g, match => match.replace(re, '<mark>$1</mark>'));
    } catch { return html; }
  }

  function _attachEvents() {
    const inputBusca = document.getElementById('ajuda-busca');
    let timer;
    inputBusca.addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        _busca = e.target.value;
        _renderConteudo();
        // re-render limpar button se for caso
        const limparBtn = document.getElementById('ajuda-busca-limpar');
        if (_busca && !limparBtn) {
          render(_container);
          document.getElementById('ajuda-busca').focus();
        } else if (!_busca && limparBtn) {
          render(_container);
          document.getElementById('ajuda-busca').focus();
        }
      }, 200);
    });

    document.getElementById('ajuda-busca-limpar')?.addEventListener('click', () => {
      _busca = '';
      render(_container);
    });

    document.getElementById('btn-ajuda-pdf')?.addEventListener('click', _exportarPDF);
  }

  function _exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 18;
    let y = 22;
    const lineH = 5.5;

    const verde = [61, 181, 60];
    const cinza = [85, 85, 85];

    function _newPageIfNeeded(extra = 0) {
      if (y + extra > pageH - 18) {
        doc.addPage();
        y = 22;
      }
    }

    function _stripHtml(html) {
      return html
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/h\d>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    // Capa
    doc.setFillColor(...verde);
    doc.rect(0, 0, pageW, 50, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('Manual de Uso', marginX, 28);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Portal Reverse Engenharia', marginX, 38);
    doc.setFontSize(10);
    doc.text('v1.0.0 — Maio 2026', marginX, 46);

    doc.setTextColor(0, 0, 0);
    y = 62;

    // Conteúdo
    MANUAL.forEach(cap => {
      _newPageIfNeeded(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...verde);
      doc.text(cap.titulo, marginX, y);
      y += 8;
      doc.setTextColor(0, 0, 0);

      cap.secoes.forEach(sec => {
        _newPageIfNeeded(10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...cinza);
        const titleLines = doc.splitTextToSize(sec.titulo, pageW - marginX * 2);
        titleLines.forEach(line => {
          _newPageIfNeeded(lineH);
          doc.text(line, marginX, y);
          y += lineH + 1;
        });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const text = _stripHtml(sec.html);
        const lines = doc.splitTextToSize(text, pageW - marginX * 2);
        lines.forEach(line => {
          _newPageIfNeeded(lineH);
          doc.text(line, marginX, y);
          y += lineH;
        });
        y += 3;
      });
      y += 4;
    });

    // Numeração
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...cinza);
      doc.text(`Página ${i} de ${totalPages}`, pageW / 2, pageH - 8, { align: 'center' });
    }

    doc.save('Manual_Portal_Reverse_Engenharia.pdf');
    UI.showToast('PDF do manual gerado!', 'success');
  }

  return { render };
})();
