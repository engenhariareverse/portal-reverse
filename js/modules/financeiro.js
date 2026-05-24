const Financeiro = (() => {
  let _lancamentos = [];
  let _clientes    = [];
  let _orcamentos  = [];
  let _container   = null;
  let _aba = 'a_receber';
  let _filtroMes = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  })();
  let _chart1 = null;
  let _chart2 = null;

  const STATUS = {
    pendente: { label: 'Pendente', cls: 'badge--dourado'  },
    pago:     { label: 'Pago',     cls: 'badge--verde'    },
    atrasado: { label: 'Atrasado', cls: 'badge--vermelho' },
  };

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _fmtData(str) {
    if (!str) return '';
    const [y,m,d] = str.slice(0,10).split('-');
    return `${d}/${m}/${y}`;
  }

  function _calcStatus(l) {
    if (l.pago_em) return 'pago';
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    return new Date(l.vencimento + 'T00:00') < hoje ? 'atrasado' : 'pendente';
  }

  // ── RENDER PRINCIPAL ─────────────────────────
  async function render(container) {
    _container = container;
    [_lancamentos, _clientes, _orcamentos] = await Promise.all([
      DB.getAll('lancamentos'),
      DB.getAll('clientes'),
      DB.getAll('orcamentos'),
    ]);
    // Auto-recalcular status (apenas não-pagos)
    for (const l of _lancamentos) {
      if (l.status === 'pago') continue;
      const novo = _calcStatus(l);
      if (l.status !== novo) { l.status = novo; await DB.put('lancamentos', l); }
    }
    _drawPage();
  }

  function _drawPage() {
    _container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Financeiro</h1>
        <button class="btn btn--primary" id="btn-novo-lanc">+ Novo Lançamento</button>
      </div>

      <div class="fin-tabs">
        <button class="fin-tab ${_aba==='a_receber'  ?'fin-tab--ativo':''}" data-aba="a_receber">Contas a Receber</button>
        <button class="fin-tab ${_aba==='historico'  ?'fin-tab--ativo':''}" data-aba="historico">Histórico</button>
        <button class="fin-tab ${_aba==='visao_geral'?'fin-tab--ativo':''}" data-aba="visao_geral">Visão Geral</button>
      </div>

      <div id="fin-corpo">${_renderAba()}</div>`;

    document.getElementById('btn-novo-lanc').addEventListener('click', () => abrirModal());
    document.querySelectorAll('.fin-tab').forEach(btn =>
      btn.addEventListener('click', () => { _aba = btn.dataset.aba; _drawPage(); })
    );

    // Delegação para botões de ação nos itens da lista (pagar/editar/excluir)
    document.getElementById('fin-corpo').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = parseInt(btn.dataset.id);
      const action = btn.dataset.action;
      if (action === 'pagar')  _marcarPago(id);
      if (action === 'editar') _editar(id);
      if (action === 'excluir') _excluir(id);
    });

    // Botão "empty state" para novo lançamento
    document.getElementById('btn-empty-lanc')?.addEventListener('click', () => abrirModal());

    _attachAbaEvents();
    if (_aba === 'visao_geral') setTimeout(_initCharts, 0);
  }

  function _renderAba() {
    if (_aba === 'a_receber')  return _renderAReceber();
    if (_aba === 'historico')  return _renderHistorico();
    return _renderVisaoGeral();
  }

  // ── ABA: CONTAS A RECEBER ─────────────────────
  function _renderAReceber() {
    const lista = _lancamentos
      .filter(l => l.status !== 'pago')
      .sort((a,b) => (a.vencimento||'') > (b.vencimento||'') ? 1 : -1);

    const totPend = lista.filter(l=>l.status==='pendente').reduce((s,l)=>s+(l.valor||0),0);
    const totAtr  = lista.filter(l=>l.status==='atrasado').reduce((s,l)=>s+(l.valor||0),0);
    const qtdAtr  = lista.filter(l=>l.status==='atrasado').length;
    const qtdPend = lista.filter(l=>l.status==='pendente').length;

    return `
      <div class="fin-kpi-row">
        <div class="fin-kpi">
          <div class="fin-kpi-label">Total a Receber</div>
          <div class="fin-kpi-valor">${UI.formatBRL(totPend + totAtr)}</div>
          <div class="fin-kpi-sub">${lista.length} lançamento${lista.length!==1?'s':''}</div>
        </div>
        <div class="fin-kpi fin-kpi--alerta">
          <div class="fin-kpi-label">Em Atraso</div>
          <div class="fin-kpi-valor ${totAtr>0?'text-danger':''}">${UI.formatBRL(totAtr)}</div>
          <div class="fin-kpi-sub ${totAtr>0?'text-danger':''}">${qtdAtr} lançamento${qtdAtr!==1?'s':''}</div>
        </div>
        <div class="fin-kpi fin-kpi--verde">
          <div class="fin-kpi-label">Pendentes</div>
          <div class="fin-kpi-valor">${UI.formatBRL(totPend)}</div>
          <div class="fin-kpi-sub">${qtdPend} lançamento${qtdPend!==1?'s':''}</div>
        </div>
      </div>
      ${lista.length === 0
        ? `<div class="empty-state" style="margin-top:20px">
             <div class="empty-icon">◈</div>
             <p>Nenhuma conta a receber.</p>
             <button class="btn btn--primary" id="btn-empty-lanc">+ Novo lançamento</button>
           </div>`
        : `<div class="fin-lista">${lista.map(l => _renderItem(l)).join('')}</div>`
      }`;
  }

  // ── ABA: HISTÓRICO ────────────────────────────
  function _renderHistorico() {
    const lista = _lancamentos
      .filter(l => !_filtroMes || (l.vencimento||'').startsWith(_filtroMes))
      .sort((a,b) => (b.vencimento||'') > (a.vencimento||'') ? 1 : -1);

    const totRec  = lista.filter(l=>l.status==='pago').reduce((s,l)=>s+(l.valor||0),0);
    const totPend = lista.filter(l=>l.status!=='pago').reduce((s,l)=>s+(l.valor||0),0);

    const labelPeriodo = _filtroMes
      ? new Date(_filtroMes+'-15').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})
      : 'todos os períodos';

    return `
      <div class="fin-hist-filtros">
        <label class="form-label" style="margin:0;white-space:nowrap;font-size:13px">Período:</label>
        <input class="input input--sm" type="month" id="filtro-mes" value="${_filtroMes}" style="width:160px">
        <button class="btn btn--ghost btn--sm" id="btn-limpar-mes">Todos os meses</button>
        <span class="fin-total-hist">${lista.length} registro${lista.length!==1?'s':''} — ${labelPeriodo}</span>
        <div style="margin-left:auto;display:flex;gap:6px">
          <button class="btn btn--ghost btn--sm" id="btn-export-pdf">↓ PDF</button>
          <button class="btn btn--ghost btn--sm" id="btn-export-xls">↓ Excel</button>
        </div>
      </div>
      <div class="fin-kpi-row" style="margin-top:14px">
        <div class="fin-kpi fin-kpi--verde">
          <div class="fin-kpi-label">Recebido no período</div>
          <div class="fin-kpi-valor">${UI.formatBRL(totRec)}</div>
        </div>
        <div class="fin-kpi">
          <div class="fin-kpi-label">A receber no período</div>
          <div class="fin-kpi-valor">${UI.formatBRL(totPend)}</div>
        </div>
        <div class="fin-kpi">
          <div class="fin-kpi-label">Total no período</div>
          <div class="fin-kpi-valor">${UI.formatBRL(totRec+totPend)}</div>
        </div>
      </div>
      ${lista.length === 0
        ? `<div class="empty-state" style="margin-top:20px"><div class="empty-icon">◈</div><p>Nenhum lançamento no período.</p></div>`
        : `<div class="fin-lista">${lista.map(l => _renderItem(l)).join('')}</div>`
      }`;
  }

  // ── ABA: VISÃO GERAL ──────────────────────────
  function _renderVisaoGeral() {
    const totRec   = _lancamentos.filter(l=>l.status==='pago').reduce((s,l)=>s+(l.valor||0),0);
    const totPend  = _lancamentos.filter(l=>l.status!=='pago').reduce((s,l)=>s+(l.valor||0),0);
    const qtdAtr   = _lancamentos.filter(l=>l.status==='atrasado').length;
    const totAtr   = _lancamentos.filter(l=>l.status==='atrasado').reduce((s,l)=>s+(l.valor||0),0);
    const mesAtual = new Date().toISOString().slice(0,7);
    const recMes   = _lancamentos
      .filter(l=>l.status==='pago' && (l.pago_em||'').startsWith(mesAtual))
      .reduce((s,l)=>s+(l.valor||0),0);

    return `
      <div class="kpi-grid" style="margin-bottom:24px">
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon--verde">◈</div>
          <div class="kpi-content">
            <div class="kpi-value">${UI.formatBRL(totRec)}</div>
            <div class="kpi-label">Total recebido</div>
            <div class="kpi-sub">${UI.formatBRL(recMes)} este mês</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon--dourado">◷</div>
          <div class="kpi-content">
            <div class="kpi-value">${UI.formatBRL(totPend)}</div>
            <div class="kpi-label">A receber</div>
            <div class="kpi-sub">${_lancamentos.filter(l=>l.status!=='pago').length} lançamentos</div>
          </div>
        </div>
        <div class="kpi-card ${qtdAtr>0?'kpi-card--alert':''}">
          <div class="kpi-icon kpi-icon--preto">◉</div>
          <div class="kpi-content">
            <div class="kpi-value ${qtdAtr>0?'text-danger':''}">${qtdAtr}</div>
            <div class="kpi-label">Em atraso</div>
            <div class="kpi-sub ${qtdAtr>0?'text-danger':''}">${UI.formatBRL(totAtr)}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon--azul">◎</div>
          <div class="kpi-content">
            <div class="kpi-value">${_lancamentos.length}</div>
            <div class="kpi-label">Total de lançamentos</div>
            <div class="kpi-sub">${_clientes.length} cliente${_clientes.length!==1?'s':''}</div>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header"><h3>Fluxo — últimos 6 meses</h3></div>
          <div class="card-body" style="min-height:230px">
            <canvas id="chart-fluxo"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Status dos lançamentos</h3></div>
          <div class="card-body" style="display:flex;align-items:center;justify-content:center;min-height:230px">
            <canvas id="chart-status" style="max-height:230px"></canvas>
          </div>
        </div>
      </div>`;
  }

  // ── RENDER ITEM ───────────────────────────────
  function _renderItem(l) {
    const cli = _clientes.find(c => c.id === l.cliente_id);
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const diff = Math.round((new Date(l.vencimento+'T00:00') - hoje) / 86400000);

    let vencHtml = _fmtData(l.vencimento);
    if (l.status !== 'pago') {
      if (diff < 0)       vencHtml += ` <span class="text-danger">(${Math.abs(diff)}d atraso)</span>`;
      else if (diff === 0) vencHtml += ` <span style="color:var(--dourado)">(Hoje)</span>`;
      else if (diff <= 3)  vencHtml += ` <span style="color:var(--dourado)">(em ${diff}d)</span>`;
    }

    return `<div class="fin-item fin-item--${l.status}">
      <div class="fin-item-valor">${UI.formatBRL(l.valor||0)}</div>
      <div class="fin-item-info">
        <div class="fin-item-desc">${esc(l.descricao||'—')}</div>
        <div class="fin-item-meta">
          <span>◷ ${vencHtml}</span>
          ${cli ? `<span>◉ ${esc(cli.nome)}</span>` : ''}
          ${l.pago_em ? `<span>✓ Pago em ${_fmtData(l.pago_em)}</span>` : ''}
        </div>
      </div>
      <div class="fin-item-badges">
        ${UI.statusBadge(l.status, STATUS)}
      </div>
      <div class="fin-item-actions">
        ${l.status !== 'pago' ? `<button class="btn btn--sm btn--primary" data-action="pagar" data-id="${l.id}" aria-label="Marcar como pago">✓ Pago</button>` : ''}
        <button class="btn btn--sm btn--ghost" data-action="editar" data-id="${l.id}" aria-label="Editar lançamento">Editar</button>
        <button class="btn btn--sm btn--ghost text-danger" data-action="excluir" data-id="${l.id}" aria-label="Excluir lançamento">×</button>
      </div>
    </div>`;
  }

  // ── EVENTOS ───────────────────────────────────
  function _attachAbaEvents() {
    if (_aba !== 'historico') return;
    document.getElementById('filtro-mes')?.addEventListener('change', e => { _filtroMes = e.target.value; _drawPage(); });
    document.getElementById('btn-limpar-mes')?.addEventListener('click', () => { _filtroMes = ''; _drawPage(); });
    document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
      const lista = _lancamentos.filter(l => !_filtroMes || (l.vencimento||'').startsWith(_filtroMes));
      _exportPDF(lista, _filtroMes ? `Relatório_${_filtroMes}` : 'Histórico_Financeiro');
    });
    document.getElementById('btn-export-xls')?.addEventListener('click', () => {
      const lista = _lancamentos.filter(l => !_filtroMes || (l.vencimento||'').startsWith(_filtroMes));
      _exportExcel(lista, _filtroMes ? `Relatório_${_filtroMes}` : 'Histórico_Financeiro');
    });
  }

  // ── GRÁFICOS ──────────────────────────────────
  function _initCharts() {
    _initChartFluxo();
    _initChartStatus();
  }

  function _initChartFluxo() {
    const ctx = document.getElementById('chart-fluxo');
    if (!ctx) return;
    if (_chart1) { _chart1.destroy(); _chart1 = null; }

    const labels = [], recebido = [], aReceber = [];
    const hoje = new Date();
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(hoje.getFullYear(), hoje.getMonth()-i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      labels.push(d.toLocaleDateString('pt-BR', {month:'short', year:'2-digit'}));
      recebido.push(_lancamentos.filter(l=>l.status==='pago' && (l.pago_em||'').startsWith(key)).reduce((s,l)=>s+(l.valor||0),0));
      aReceber.push(_lancamentos.filter(l=>l.status!=='pago' && (l.vencimento||'').startsWith(key)).reduce((s,l)=>s+(l.valor||0),0));
    }

    _chart1 = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Recebido', data: recebido, backgroundColor: '#2E7D32', borderRadius: 4 },
          { label: 'A receber', data: aReceber, backgroundColor: '#C5A04A', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position:'bottom', labels:{font:{family:'Inter,sans-serif',size:12},padding:14,boxWidth:12} },
          tooltip: { callbacks: { label: c => ` ${UI.formatBRL(c.raw)}` } },
        },
        scales: {
          y: { ticks: { callback: v => UI.formatBRL(v) }, grid: { color:'rgba(0,0,0,0.05)' } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  function _initChartStatus() {
    const ctx = document.getElementById('chart-status');
    if (!ctx) return;
    if (_chart2) { _chart2.destroy(); _chart2 = null; }

    if (!_lancamentos.length) {
      ctx.parentElement.innerHTML = '<div class="empty-state-sm"><p>Sem dados ainda.</p></div>';
      return;
    }

    const counts = {
      Pago:     _lancamentos.filter(l=>l.status==='pago').length,
      Pendente: _lancamentos.filter(l=>l.status==='pendente').length,
      Atrasado: _lancamentos.filter(l=>l.status==='atrasado').length,
    };

    _chart2 = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(counts),
        datasets: [{ data: Object.values(counts), backgroundColor:['#2E7D32','#C5A04A','#C62828'], borderWidth:0, hoverOffset:4 }],
      },
      options: {
        responsive: true, maintainAspectRatio: true, cutout: '62%',
        plugins: { legend: { position:'bottom', labels:{font:{family:'Inter,sans-serif',size:12},padding:14,boxWidth:12} } },
      },
    });
  }

  // ── MODAL CRUD ────────────────────────────────
  async function abrirModal(id) {
    const l = id ? await DB.get('lancamentos', id) : null;
    const orcsAprovados = _orcamentos.filter(o => o.status === 'aprovado');

    const html = `
      <form id="form-lanc" class="form">
        <div class="form-grid">
          <div class="form-group form-group--full">
            <label class="form-label">Descrição *</label>
            <input class="input" name="descricao" required value="${esc(l?.descricao||'')}" placeholder="Ex: PMOC — Condomínio Alpha — Jan/2026">
          </div>
          <div class="form-group">
            <label class="form-label">Valor (R$) *</label>
            <input class="input" name="valor" type="number" min="0" step="0.01" required value="${l?.valor||''}">
          </div>
          <div class="form-group">
            <label class="form-label">Vencimento *</label>
            <input class="input" type="date" name="vencimento" required value="${l?.vencimento||''}">
          </div>
          <div class="form-group">
            <label class="form-label">Cliente</label>
            <select class="input" name="cliente_id">
              <option value="">— Sem cliente —</option>
              ${_clientes.map(c=>`<option value="${c.id}" ${l?.cliente_id===c.id?'selected':''}>${esc(c.nome)}</option>`).join('')}
            </select>
          </div>
          ${orcsAprovados.length ? `
          <div class="form-group">
            <label class="form-label">Orçamento aprovado</label>
            <select class="input" name="orcamento_id" id="sel-orc">
              <option value="">— Nenhum —</option>
              ${orcsAprovados.map(o=>`<option value="${o.id}" ${l?.orcamento_id===o.id?'selected':''}>${esc(o.numero)} — ${UI.formatBRL(o.total||0)}</option>`).join('')}
            </select>
          </div>` : ''}
          ${!l ? `
          <div class="form-group">
            <label class="form-label">Recorrência</label>
            <select class="input" name="recorrencia">
              <option value="pontual">Pontual (único lançamento)</option>
              <option value="mensal">Mensal — gera 12 parcelas</option>
            </select>
          </div>` : ''}
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="input" name="status" id="sel-status">
              <option value="pendente" ${(!l||l.status==='pendente')?'selected':''}>Pendente</option>
              <option value="pago"     ${l?.status==='pago'    ?'selected':''}>Pago</option>
              <option value="atrasado" ${l?.status==='atrasado'?'selected':''}>Atrasado</option>
            </select>
          </div>
          <div class="form-group" id="grp-pago-em" style="${l?.status==='pago'?'':'display:none'}">
            <label class="form-label">Data de pagamento</label>
            <input class="input" type="date" name="pago_em" value="${l?.pago_em||''}">
          </div>
          <div class="form-group form-group--full">
            <label class="form-label">Observações</label>
            <textarea class="input" name="obs" rows="2">${esc(l?.obs||'')}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          ${l ? `<button type="button" class="btn btn--danger btn--sm" id="btn-excluir-lanc">Excluir</button>` : ''}
          <button type="button" class="btn btn--ghost" id="btn-cancelar-lanc">Cancelar</button>
          <button type="submit" class="btn btn--primary">${l ? 'Salvar alterações' : 'Criar lançamento'}</button>
        </div>
      </form>`;

    UI.openModal(l ? 'Editar Lançamento' : 'Novo Lançamento', html);

    document.getElementById('btn-cancelar-lanc').addEventListener('click', () => UI.closeModal());
    if (l) {
      document.getElementById('btn-excluir-lanc').addEventListener('click', () => _excluir(l.id));
    }

    // Mostrar campo pago_em ao selecionar "Pago"
    document.getElementById('sel-status')?.addEventListener('change', e => {
      const grp = document.getElementById('grp-pago-em');
      if (grp) grp.style.display = e.target.value === 'pago' ? '' : 'none';
    });

    // Preencher dados do orçamento selecionado
    document.getElementById('sel-orc')?.addEventListener('change', e => {
      const orc = _orcamentos.find(o => o.id === Number(e.target.value));
      if (!orc) return;
      const descEl = document.querySelector('[name="descricao"]');
      const valEl  = document.querySelector('[name="valor"]');
      const cliEl  = document.querySelector('[name="cliente_id"]');
      if (descEl && !descEl.value) descEl.value = `Orçamento ${orc.numero}`;
      if (valEl  && !valEl.value)  valEl.value  = orc.total || '';
      if (cliEl  && orc.cliente_id) cliEl.value = orc.cliente_id;
    });

    document.getElementById('form-lanc').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = e.target.querySelector('[type="submit"]');
      btn.disabled = true;
      try {
        const fd = new FormData(e.target);
        const recorrencia = fd.get('recorrencia') || 'pontual';
        const base = {
          descricao:    fd.get('descricao').trim(),
          valor:        Number(fd.get('valor')),
          vencimento:   fd.get('vencimento'),
          cliente_id:   Number(fd.get('cliente_id')) || null,
          orcamento_id: Number(fd.get('orcamento_id')) || null,
          status:       fd.get('status'),
          pago_em:      fd.get('pago_em') || null,
          obs:          fd.get('obs').trim() || null,
        };

        if (l?.id) {
          base.id = l.id;
          base.criado_em = l.criado_em;
          await DB.put('lancamentos', base);
          UI.showToast('Lançamento atualizado.', 'success');
        } else if (recorrencia === 'mensal') {
          let d = new Date(base.vencimento + 'T12:00');
          for (let i = 0; i < 12; i++) {
            const mes = d.toLocaleDateString('pt-BR', {month:'long', year:'numeric'});
            await DB.add('lancamentos', {
              ...base,
              descricao: `${base.descricao} — ${mes}`,
              vencimento: d.toISOString().slice(0,10),
              status: 'pendente',
              pago_em: null,
              criado_em: new Date().toISOString(),
            });
            // Clamp ao último dia do próximo mês (evita overflow: 31/jan→03/mar)
            const nextY = d.getFullYear(), nextM = d.getMonth() + 1;
            const maxDay = new Date(nextY, nextM + 1, 0).getDate();
            d = new Date(nextY, nextM, Math.min(d.getDate(), maxDay));
          }
          UI.showToast('12 parcelas mensais criadas!', 'success');
        } else {
          base.status = _calcStatus(base);
          base.criado_em = new Date().toISOString();
          await DB.add('lancamentos', base);
          UI.showToast('Lançamento criado!', 'success');
        }

        UI.closeModal();
        await render(_container);
      } catch (err) {
        UI.handleError(err, 'Erro ao salvar lançamento');
        btn.disabled = false;
      }
    });
  }

  async function _marcarPago(id) {
    const l = await DB.get('lancamentos', id);
    if (!l) return;
    l.status = 'pago';
    l.pago_em = new Date().toISOString().slice(0,10);
    await DB.put('lancamentos', l);
    UI.showToast('Marcado como pago!', 'success');
    await render(_container);
  }

  async function _editar(id) { await abrirModal(id); }

  async function _excluir(id) {
    const ok = await UI.showConfirm('Excluir lançamento', 'Tem certeza que deseja excluir este lançamento?', 'Excluir');
    if (!ok) return;
    await DB.remove('lancamentos', id);
    UI.showToast('Lançamento excluído.', 'success');
    UI.closeModal();
    await render(_container);
  }

  // ── EXPORTS ───────────────────────────────────
  function _exportPDF(lista, nomeArquivo) {
    if (!lista.length) { UI.showToast('Nenhum lançamento para exportar.', 'warning'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });

    doc.setFillColor(26,26,26);
    doc.rect(0, 0, 210, 22, 'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(14);
    doc.setTextColor(197,160,74);
    doc.text('JOTEC Soluções', 14, 10);
    doc.setFontSize(9);
    doc.setTextColor(200,200,200);
    doc.text('Engenharia · Segurança · Conformidade', 14, 16);
    doc.setTextColor(255,255,255);
    doc.text(nomeArquivo.replace(/_/g,' '), 196, 10, {align:'right'});
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 196, 16, {align:'right'});

    const totRec  = lista.filter(l=>l.status==='pago').reduce((s,l)=>s+(l.valor||0),0);
    const totPend = lista.filter(l=>l.status!=='pago').reduce((s,l)=>s+(l.valor||0),0);
    doc.setTextColor(40,40,40);
    doc.setFontSize(8);
    doc.setFont('helvetica','normal');
    doc.text(`Total: ${UI.formatBRL(totRec+totPend)}  |  Recebido: ${UI.formatBRL(totRec)}  |  A receber: ${UI.formatBRL(totPend)}`, 14, 30);

    doc.autoTable({
      startY: 35,
      head: [['Vencimento','Descrição','Cliente','Valor','Status','Pago em']],
      body: lista.map(l => {
        const cli = _clientes.find(c=>c.id===l.cliente_id);
        return [
          _fmtData(l.vencimento),
          l.descricao||'—',
          cli?.nome||'—',
          UI.formatBRL(l.valor||0),
          STATUS[l.status]?.label||l.status,
          l.pago_em ? _fmtData(l.pago_em) : '—',
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor:[26,26,26], textColor:[197,160,74], fontStyle:'bold', fontSize:8 },
      bodyStyles: { fontSize:8, textColor:[40,40,40] },
      alternateRowStyles: { fillColor:[248,246,242] },
      columnStyles: { 0:{cellWidth:22}, 1:{cellWidth:68}, 2:{cellWidth:36}, 3:{cellWidth:24,halign:'right'}, 4:{cellWidth:20}, 5:{cellWidth:22} },
    });

    doc.save(`${nomeArquivo}.pdf`);
    UI.showToast('PDF exportado!', 'success');
  }

  function _exportExcel(lista, nomeArquivo) {
    if (!lista.length) { UI.showToast('Nenhum lançamento para exportar.', 'warning'); return; }
    const ws = XLSX.utils.json_to_sheet(lista.map(l => {
      const cli = _clientes.find(c=>c.id===l.cliente_id);
      return {
        'Vencimento':  l.vencimento||'',
        'Descrição':   l.descricao||'',
        'Cliente':     cli?.nome||'',
        'Valor (R$)':  l.valor||0,
        'Status':      STATUS[l.status]?.label||l.status,
        'Pago em':     l.pago_em||'',
        'Observações': l.obs||'',
      };
    }));
    ws['!cols'] = [{wch:14},{wch:55},{wch:30},{wch:14},{wch:12},{wch:14},{wch:30}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Financeiro');
    XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
    UI.showToast('Excel exportado!', 'success');
  }

  return { render, _editar, _excluir, _marcarPago };
})();
