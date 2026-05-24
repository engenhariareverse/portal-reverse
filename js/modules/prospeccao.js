const Prospeccao = (() => {
  let _container = null;
  let _aba = 'dashboard';
  let _leads = [];
  let _offline = false;
  let _chartFunil = null;
  let _chartOrigem = null;
  let _filtros = { status: '', origem: '', cidade: '', texto: '' };

  const STATUSES = [
    'Novo', 'Pesquisado', '1ª abordagem', 'Em conversa',
    'Proposta enviada', 'Quente', 'Frio', 'Convertido', 'Perdido',
  ];

  const STATUS_COR = {
    'Novo':             '#E8F0FE', 'Pesquisado':       '#D2E3FC',
    '1ª abordagem':     '#FEEFC3', 'Em conversa':      '#FDE293',
    'Proposta enviada': '#FBBC04', 'Quente':           '#EA4335',
    'Frio':             '#BDC1C6', 'Convertido':       '#34A853',
    'Perdido':          '#5F6368',
  };

  const STATUS_TEXT = {
    'Quente': '#FFF', 'Convertido': '#FFF', 'Perdido': '#FFF',
  };

  const ORIGENS = ['LinkedIn', 'Google Maps', 'Indicação', 'Evento', 'Site', 'Outro'];

  const CORES_GRAFICO = ['#4285F4','#EA4335','#FBBC04','#34A853','#9C27B0','#FF6D00'];

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _fmtData(str) {
    if (!str) return '';
    const s = String(str).slice(0, 10);
    const [y, m, d] = s.split('-');
    if (!y || !m || !d) return str;
    return `${d}/${m}/${y}`;
  }

  function _hoje() { return new Date().toISOString().slice(0, 10); }

  function _badge(status) {
    const bg  = STATUS_COR[status]  || '#EEE';
    const txt = STATUS_TEXT[status] || '#1A1A1A';
    return `<span style="background:${bg};color:${txt};padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;white-space:nowrap;display:inline-block">${esc(status || '—')}</span>`;
  }

  function _idMatch(lead, id) {
    return lead.id === id || String(lead.id) === String(id);
  }

  function _normId(rawId) {
    const n = Number(rawId);
    return Number.isFinite(n) && !String(rawId).startsWith('local_') ? n : rawId;
  }

  // ── RENDER PRINCIPAL ──────────────────────────────────────────

  async function render(container) {
    _container = container;
    _container.innerHTML = '<div class="empty-state"><div class="empty-icon">🎯</div><p>Carregando prospecção…</p></div>';
    const result = await SheetsAPI.list();
    _leads   = result.data || [];
    _offline = !!result.offline;
    _drawPage();
  }

  function _drawPage() {
    const offTag = _offline
      ? '<span style="background:#BDC1C6;color:#1A1A1A;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;margin-left:8px">Modo offline</span>'
      : '';

    _container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">🎯 Prospecção${offTag}</h1>
        <button class="btn btn--primary" id="btn-novo-lead">+ Novo contato</button>
      </div>

      <div class="fin-tabs">
        ${['dashboard','lista','kanban','followup','config'].map(a =>
          `<button class="fin-tab ${_aba===a?'fin-tab--ativo':''}" data-aba="${a}">${
            {dashboard:'Dashboard',lista:'Lista',kanban:'Kanban',followup:'Follow-up',config:'Configurações'}[a]
          }</button>`
        ).join('')}
      </div>

      <div id="prosp-corpo">${_renderAba()}</div>`;

    document.getElementById('btn-novo-lead').addEventListener('click', () => _abrirModalContato());
    document.querySelectorAll('.fin-tab').forEach(btn =>
      btn.addEventListener('click', () => { _aba = btn.dataset.aba; _drawPage(); })
    );
    _attachAbaEvents();
  }

  function _renderAba() {
    if (_aba === 'dashboard') return _renderDashboard();
    if (_aba === 'lista')     return _renderLista();
    if (_aba === 'kanban')    return _renderKanban();
    if (_aba === 'followup')  return _renderFollowup();
    return '<div class="empty-state"><div class="empty-icon">⚙️</div><p>Carregando configurações…</p></div>';
  }

  // ── ABA: DASHBOARD ────────────────────────────────────────────

  function _renderDashboard() {
    const hoje       = _hoje();
    const atrasados  = _leads.filter(l => l.proximo_followup && l.proximo_followup < hoje);
    const hoje_list  = _leads.filter(l => l.proximo_followup === hoje);
    const temAlerta  = atrasados.length > 0;
    const ultimos5   = [..._leads]
      .sort((a, b) => ((b.criado_em || '') > (a.criado_em || '') ? 1 : -1))
      .slice(0, 5);

    return `
      <div class="kpi-grid" style="margin-bottom:20px">
        <div class="kpi-card ${temAlerta ? 'kpi-card--alert' : ''}">
          <div class="kpi-icon kpi-icon--preto" style="font-size:20px">🔴</div>
          <div class="kpi-content">
            <div class="kpi-value ${temAlerta ? 'text-danger' : ''}">${atrasados.length}</div>
            <div class="kpi-label">Follow-ups atrasados</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon--dourado" style="font-size:20px">🟡</div>
          <div class="kpi-content">
            <div class="kpi-value">${hoje_list.length}</div>
            <div class="kpi-label">Follow-ups hoje</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon--preto">◉</div>
          <div class="kpi-content">
            <div class="kpi-value">${_leads.length}</div>
            <div class="kpi-label">Total de leads</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon--verde">◎</div>
          <div class="kpi-content">
            <div class="kpi-value">${_leads.filter(l => l.status === 'Convertido').length}</div>
            <div class="kpi-label">Convertidos</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom:16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn btn--ghost" id="btn-atualizar-leads">🔄 Atualizar do Sheets</button>
        ${_offline ? '<span style="font-size:12px;color:#888">Trabalhando com cache local</span>' : ''}
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header"><h3>Funil de vendas</h3></div>
          <div class="card-body"><canvas id="chart-funil"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Leads por origem</h3></div>
          <div class="card-body" style="display:flex;align-items:center;justify-content:center;min-height:220px">
            <canvas id="chart-origem" style="max-height:220px"></canvas>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:20px">
        <div class="card-header"><h3>Últimos cadastrados</h3></div>
        <div class="card-body">
          ${ultimos5.length === 0
            ? '<p style="color:#888;font-size:13px">Nenhum contato ainda.</p>'
            : ultimos5.map(l => `
                <div class="fin-item" style="cursor:pointer" data-action="detalhe" data-id="${l.id}">
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:14px">${esc(l.empresa)}</div>
                    <div style="color:#666;font-size:12px;margin-top:2px">${esc(l.contato_nome || '')}${l.cidade ? ` · ${esc(l.cidade)}` : ''}</div>
                  </div>
                  <div>${_badge(l.status)}</div>
                  <div style="font-size:11px;color:#888">${_fmtData(l.criado_em)}</div>
                </div>`).join('')
          }
        </div>
      </div>`;
  }

  // ── ABA: LISTA ────────────────────────────────────────────────

  function _renderLista() {
    const leads  = _leadsFiltered();
    const cidades = [...new Set(_leads.map(l => l.cidade).filter(Boolean))].sort();

    return `
      <div class="fin-hist-filtros" style="flex-wrap:wrap;gap:8px;margin-bottom:14px">
        <input class="input input--sm" id="filtro-texto" placeholder="Buscar empresa ou contato…"
               value="${esc(_filtros.texto)}" style="min-width:200px;flex:1">
        <select class="input input--sm" id="filtro-status-lista" style="min-width:160px">
          <option value="">Todos os status</option>
          ${STATUSES.map(s => `<option value="${esc(s)}" ${_filtros.status === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
        </select>
        <select class="input input--sm" id="filtro-origem-lista" style="min-width:140px">
          <option value="">Todas as origens</option>
          ${ORIGENS.map(o => `<option value="${esc(o)}" ${_filtros.origem === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}
        </select>
        <select class="input input--sm" id="filtro-cidade-lista" style="min-width:140px">
          <option value="">Todas as cidades</option>
          ${cidades.map(c => `<option value="${esc(c)}" ${_filtros.cidade === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
        <span style="font-size:13px;color:#888;white-space:nowrap;align-self:center">${leads.length} lead${leads.length !== 1 ? 's' : ''}</span>
        <div style="margin-left:auto;display:flex;gap:6px">
          <button class="btn btn--ghost btn--sm" id="btn-export-excel-lista">↓ Excel</button>
          <button class="btn btn--ghost btn--sm" id="btn-export-csv-lista">↓ CSV</button>
        </div>
      </div>

      ${leads.length === 0
        ? `<div class="empty-state">
             <div class="empty-icon">🎯</div>
             <p>Nenhum contato encontrado.</p>
             <button class="btn btn--primary" id="btn-empty-lead">+ Novo contato</button>
           </div>`
        : leads.map(l => `
            <div class="fin-item" style="cursor:pointer" data-action="detalhe" data-id="${l.id}">
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:14px">${esc(l.empresa || '—')}</div>
                <div style="color:#666;font-size:12px;margin-top:2px">
                  ${esc(l.contato_nome || '')}${l.telefone ? ` · ${esc(l.telefone)}` : ''}${l.cidade ? ` · ${esc(l.cidade)}` : ''}
                </div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
                ${_badge(l.status)}
                ${l.origem ? `<span style="font-size:11px;color:#888">${esc(l.origem)}</span>` : ''}
              </div>
              <div style="font-size:11px;color:#888;flex-shrink:0;text-align:right">
                ${l.proximo_followup ? `📅 ${_fmtData(l.proximo_followup)}` : ''}
              </div>
            </div>`).join('')
      }`;
  }

  function _leadsFiltered() {
    return _leads.filter(l => {
      if (_filtros.texto) {
        const q   = _filtros.texto.toLowerCase();
        const txt = `${l.empresa || ''} ${l.contato_nome || ''}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      if (_filtros.status && l.status !== _filtros.status) return false;
      if (_filtros.origem && l.origem !== _filtros.origem) return false;
      if (_filtros.cidade && l.cidade !== _filtros.cidade) return false;
      return true;
    });
  }

  // ── ABA: KANBAN ───────────────────────────────────────────────

  function _renderKanban() {
    return `
      <div style="overflow-x:auto;padding-bottom:12px">
        <div style="display:flex;gap:10px;min-width:max-content;align-items:flex-start">
          ${STATUSES.map(status => {
            const cards = _leads.filter(l => l.status === status);
            const bg    = STATUS_COR[status] || '#EEE';
            const cor   = STATUS_TEXT[status] || '#1A1A1A';
            return `
              <div style="width:190px;flex-shrink:0">
                <div style="background:${bg};color:${cor};padding:7px 10px;border-radius:6px 6px 0 0;
                            font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.4px;
                            display:flex;justify-content:space-between;align-items:center">
                  <span>${esc(status)}</span>
                  <span style="opacity:.7;font-size:12px">${cards.length}</span>
                </div>
                <div class="prosp-kanban-col" data-status="${esc(status)}"
                     style="background:#F0EDE8;padding:8px;border-radius:0 0 6px 6px;min-height:130px">
                  ${cards.map(l => `
                    <div class="kanban-card" data-id="${l.id}" data-action="detalhe"
                         style="background:#fff;border-radius:6px;padding:10px;margin-bottom:8px;
                                box-shadow:0 1px 4px rgba(0,0,0,.1);cursor:pointer;user-select:none">
                      <div style="font-weight:600;font-size:13px;margin-bottom:3px">${esc(l.empresa || '—')}</div>
                      <div style="font-size:11px;color:#666">${esc(l.contato_nome || '')}</div>
                      ${l.telefone ? `<div style="font-size:11px;color:#888;margin-top:3px">📞 ${esc(l.telefone)}</div>` : ''}
                      ${l.proximo_followup ? `
                        <div style="font-size:11px;margin-top:4px;font-weight:500;
                                    color:${l.proximo_followup < _hoje() ? '#C62828' : '#555'}">
                          📅 ${_fmtData(l.proximo_followup)}
                        </div>` : ''}
                    </div>`).join('')}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  function _initKanban() {
    let _dragging = false;
    document.querySelectorAll('.prosp-kanban-col').forEach(col => {
      Sortable.create(col, {
        group:     'prosp-kanban',
        animation: 150,
        onStart:   () => { _dragging = true; },
        onEnd: async (evt) => {
          setTimeout(() => { _dragging = false; }, 0);
          const novoStatus = evt.to.dataset.status;
          const rawId = evt.item.dataset.id;
          if (!novoStatus || !rawId) return;
          const id   = _normId(rawId);
          const lead = _leads.find(l => _idMatch(l, id));
          if (!lead || lead.status === novoStatus) return;
          lead.status = novoStatus;
          await SheetsAPI.update(id, { status: novoStatus });
          UI.showToast(`${lead.empresa} → ${novoStatus}`, 'success');
        },
      });
    });

    // Clique em card do Kanban — guarda flag para não disparar após drag
    document.getElementById('prosp-corpo').addEventListener('click', (e) => {
      if (_dragging) return;
      const card = e.target.closest('.kanban-card[data-action="detalhe"]');
      if (!card) return;
      e.stopPropagation();
      const id = _normId(card.dataset.id);
      _abrirDetalhe(id);
    }, true);
  }

  // ── ABA: FOLLOW-UP ────────────────────────────────────────────

  function _renderFollowup() {
    const hoje  = _hoje();
    const em7   = new Date(); em7.setDate(em7.getDate() + 7);
    const em7s  = em7.toISOString().slice(0, 10);

    const atrasados = _leads.filter(l => l.proximo_followup && l.proximo_followup < hoje)
                            .sort((a, b) => a.proximo_followup > b.proximo_followup ? 1 : -1);
    const hoje_l    = _leads.filter(l => l.proximo_followup === hoje);
    const proximos  = _leads.filter(l => l.proximo_followup && l.proximo_followup > hoje && l.proximo_followup <= em7s)
                            .sort((a, b) => a.proximo_followup > b.proximo_followup ? 1 : -1);
    const depois    = _leads.filter(l => l.proximo_followup && l.proximo_followup > em7s)
                            .sort((a, b) => a.proximo_followup > b.proximo_followup ? 1 : -1);
    const semData   = _leads.filter(l => !l.proximo_followup);

    const total = atrasados.length + hoje_l.length + proximos.length + depois.length;

    if (total === 0 && !semData.length) {
      return '<div class="empty-state"><div class="empty-icon">🎯</div><p>Nenhum follow-up agendado.</p></div>';
    }

    function _card(l) {
      const hist    = (l.historico || '').split('\n').filter(Boolean);
      const ultima  = hist[hist.length - 1] || '';
      const tel     = (l.telefone || '').replace(/\D/g, '');
      const telWA   = tel.length <= 11 ? '55' + tel : tel;
      return `
        <div class="fin-item" data-id="${l.id}">
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:14px">${esc(l.empresa || '—')}</div>
            <div style="font-size:12px;color:#666;margin-top:2px">
              ${esc(l.contato_nome || '')}${l.telefone ? ` · ${esc(l.telefone)}` : ''}
            </div>
            ${ultima ? `<div style="font-size:11px;color:#888;margin-top:4px;font-style:italic">${esc(ultima)}</div>` : ''}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;flex-shrink:0;align-items:center">
            ${tel ? `<button class="btn btn--sm btn--ghost" data-action="whatsapp" data-id="${l.id}" data-tel="${telWA}">💬 WhatsApp</button>` : ''}
            ${l.email ? `<button class="btn btn--sm btn--ghost" data-action="email" data-id="${l.id}" data-email="${esc(l.email)}" data-empresa="${esc(l.empresa || '')}">📧 Email</button>` : ''}
            <button class="btn btn--sm btn--ghost" data-action="ligou" data-id="${l.id}">📞 Liguei</button>
            <button class="btn btn--sm btn--ghost" data-action="adiar7" data-id="${l.id}">⏭ +7 dias</button>
            <button class="btn btn--sm btn--ghost" data-action="adiar1" data-id="${l.id}">✅ +1 dia</button>
          </div>
        </div>`;
    }

    function _grupo(emoji, titulo, lista) {
      if (!lista.length) return '';
      return `
        <div style="margin-bottom:22px">
          <h3 style="font-size:13px;font-weight:700;color:#444;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">
            ${emoji} ${titulo} (${lista.length})
          </h3>
          ${lista.map(_card).join('')}
        </div>`;
    }

    return `
      ${_grupo('🔴', 'Atrasados', atrasados)}
      ${_grupo('🟡', 'Hoje', hoje_l)}
      ${_grupo('🟢', 'Próximos 7 dias', proximos)}
      ${depois.length ? _grupo('⚪', 'Depois', depois) : ''}
      ${semData.length ? `<p style="color:#888;font-size:12px;margin-top:8px">${semData.length} contato${semData.length !== 1 ? 's' : ''} sem data de follow-up.</p>` : ''}`;
  }

  // ── ABA: CONFIGURAÇÕES ────────────────────────────────────────

  async function _renderConfigAsync() {
    const url     = await SheetsAPI.getUrl() || '';
    const pending = await DB.getAll('prospeccao_pending');
    return `
      <div class="card" style="max-width:520px">
        <div class="card-header"><h3>URL do Apps Script</h3></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Cole aqui a URL do seu Apps Script Web App</label>
            <input class="input" id="input-sheets-url" value="${esc(url)}"
                   placeholder="https://script.google.com/macros/s/…/exec">
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
            <button class="btn btn--primary" id="btn-salvar-url">Salvar URL</button>
            <button class="btn btn--ghost"   id="btn-testar-url">Testar conexão</button>
          </div>
          <p style="font-size:12px;color:#888;margin-top:12px">
            ${pending.length > 0
              ? `<strong style="color:#C62828">${pending.length} write${pending.length !== 1 ? 's' : ''} pendente${pending.length !== 1 ? 's' : ''}</strong> na fila offline.
                 <button class="btn btn--ghost btn--sm" style="margin-left:8px" id="btn-sync-pending">Sincronizar agora</button>`
              : '✅ Nenhum write pendente.'
            }
          </p>
        </div>
      </div>

      <div class="card" style="max-width:520px;margin-top:16px">
        <div class="card-header"><h3>Cache e sincronização</h3></div>
        <div class="card-body">
          <p style="font-size:13px;color:#666;margin-bottom:12px">
            ${_leads.length} contato${_leads.length !== 1 ? 's' : ''} no cache local.
          </p>
          <button class="btn btn--ghost" id="btn-resync">
            🔄 Re-sincronizar tudo (limpar cache e baixar do Sheets)
          </button>
          <p style="font-size:12px;color:#888;margin-top:14px">
            <a href="docs/SETUP_PROSPECCAO.md" target="_blank" style="color:var(--dourado)">
              📄 Ver guia de configuração (SETUP_PROSPECCAO.md)
            </a>
          </p>
        </div>
      </div>`;
  }

  function _attachConfigEvents() {
    document.getElementById('btn-salvar-url')?.addEventListener('click', async () => {
      const url = document.getElementById('input-sheets-url').value.trim();
      await SheetsAPI.setUrl(url);
      UI.showToast('URL salva!', 'success');
    });

    document.getElementById('btn-testar-url')?.addEventListener('click', async () => {
      const url = document.getElementById('input-sheets-url').value.trim();
      if (!url) { UI.showToast('Cole a URL primeiro.', 'warning'); return; }
      await SheetsAPI.setUrl(url);
      const btn = document.getElementById('btn-testar-url');
      btn.disabled = true; btn.textContent = 'Testando…';
      try {
        const r = await SheetsAPI.ping();
        UI.showToast(r.ok ? '✅ Conexão OK!' : '❌ Apps Script retornou erro.', r.ok ? 'success' : 'warning');
      } catch (e) {
        UI.showToast('❌ Falha: ' + e.message, 'error');
      } finally {
        btn.disabled = false; btn.textContent = 'Testar conexão';
      }
    });

    document.getElementById('btn-resync')?.addEventListener('click', async () => {
      const ok = await UI.showConfirm('Re-sincronizar', 'Limpar o cache local e baixar tudo do Google Sheets?', 'Sincronizar');
      if (!ok) return;
      const result = await SheetsAPI.list({ force: true });
      _leads   = result.data || [];
      _offline = !!result.offline;
      UI.showToast(result.offline ? 'Sem conexão.' : `${_leads.length} contato(s) baixado(s)!`, result.offline ? 'warning' : 'success');
      _drawPage();
    });

    document.getElementById('btn-sync-pending')?.addEventListener('click', async () => {
      const r = await SheetsAPI.syncPending();
      UI.showToast(`Sincronizados: ${r.synced} · Falhas: ${r.failed}`, r.failed > 0 ? 'warning' : 'success');
      _drawPage();
    });
  }

  // ── ATTACH EVENTS ─────────────────────────────────────────────

  function _attachAbaEvents() {
    const corpo = document.getElementById('prosp-corpo');
    if (!corpo) return;

    // Delegação geral (exceto Kanban que tem seu próprio listener)
    if (_aba !== 'kanban') {
      corpo.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const rawId = btn.dataset.id;
        const id    = rawId ? _normId(rawId) : null;
        const act   = btn.dataset.action;
        if (act === 'detalhe' && id != null) { _abrirDetalhe(id); return; }
        if (act === 'whatsapp')              { _acaoWhatsApp(btn); return; }
        if (act === 'email')                 { _acaoEmail(btn); return; }
        if (act === 'ligou'  && id != null)  { _acaoLigou(id); return; }
        if (act === 'adiar7' && id != null)  { _acaoAdiar(id, 7); return; }
        if (act === 'adiar1' && id != null)  { _acaoAdiar(id, 1); return; }
      });
    }

    // Dashboard
    document.getElementById('btn-atualizar-leads')?.addEventListener('click', async () => {
      const result = await SheetsAPI.list({ force: true });
      _leads   = result.data || [];
      _offline = !!result.offline;
      _drawPage();
      UI.showToast(
        result.offline ? 'Sem conexão — exibindo cache.' : `${_leads.length} contato(s) sincronizado(s)!`,
        result.offline ? 'warning' : 'success'
      );
    });

    // Lista
    document.getElementById('btn-empty-lead')?.addEventListener('click', () => _abrirModalContato());
    document.getElementById('filtro-status-lista')?.addEventListener('change', e => { _filtros.status = e.target.value; _drawPage(); });
    document.getElementById('filtro-origem-lista')?.addEventListener('change', e => { _filtros.origem = e.target.value; _drawPage(); });
    document.getElementById('filtro-cidade-lista')?.addEventListener('change', e => { _filtros.cidade = e.target.value; _drawPage(); });
    document.getElementById('filtro-texto')?.addEventListener('change', e => { _filtros.texto = e.target.value; _drawPage(); });
    document.getElementById('btn-export-excel-lista')?.addEventListener('click', () => _exportExcel(_leadsFiltered()));
    document.getElementById('btn-export-csv-lista')?.addEventListener('click',  () => _exportCSV(_leadsFiltered()));

    // Kanban
    if (_aba === 'kanban') setTimeout(_initKanban, 50);

    // Dashboard charts
    if (_aba === 'dashboard') setTimeout(_initCharts, 0);

    // Configurações (carregamento async)
    if (_aba === 'config') {
      _renderConfigAsync().then(html => {
        const el = document.getElementById('prosp-corpo');
        if (el) { el.innerHTML = html; _attachConfigEvents(); }
      });
    }
  }

  // ── GRÁFICOS ──────────────────────────────────────────────────

  function _initCharts() {
    _initChartFunil();
    _initChartOrigem();
  }

  function _initChartFunil() {
    const ctx = document.getElementById('chart-funil');
    if (!ctx) return;
    if (_chartFunil) { _chartFunil.destroy(); _chartFunil = null; }
    _chartFunil = new Chart(ctx, {
      type: 'bar',
      data: {
        labels:   STATUSES,
        datasets: [{
          label: 'Leads',
          data:  STATUSES.map(s => _leads.filter(l => l.status === s).length),
          backgroundColor: STATUSES.map(s => STATUS_COR[s] || '#CCC'),
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,.05)' } },
          y: { grid: { display: false } },
        },
      },
    });
  }

  function _initChartOrigem() {
    const ctx = document.getElementById('chart-origem');
    if (!ctx) return;
    if (_chartOrigem) { _chartOrigem.destroy(); _chartOrigem = null; }
    if (!_leads.length) {
      ctx.parentElement.innerHTML = '<p style="color:#888;font-size:13px;text-align:center">Sem dados ainda.</p>';
      return;
    }
    const counts = {};
    _leads.forEach(l => { const o = l.origem || 'Outro'; counts[o] = (counts[o] || 0) + 1; });
    const labels = Object.keys(counts);
    _chartOrigem = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data:            Object.values(counts),
          backgroundColor: labels.map((_, i) => CORES_GRAFICO[i % CORES_GRAFICO.length]),
          borderWidth: 0,
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: true, cutout: '55%',
        plugins: { legend: { position: 'bottom', labels: { font: { family: 'Inter,sans-serif', size: 12 }, padding: 12, boxWidth: 12 } } },
      },
    });
  }

  // ── AÇÕES FOLLOW-UP ───────────────────────────────────────────

  async function _acaoWhatsApp(btn) {
    const id  = _normId(btn.dataset.id);
    const tel = btn.dataset.tel;
    await _addHistorico(id, 'WhatsApp enviado');
    window.open(`https://wa.me/${tel}`, '_blank');
  }

  async function _acaoEmail(btn) {
    const id      = _normId(btn.dataset.id);
    const email   = btn.dataset.email;
    const empresa = btn.dataset.empresa || '';
    await _addHistorico(id, 'Email enviado');
    window.location.href = `mailto:${email}?subject=${encodeURIComponent('JOTEC Soluções — ' + empresa)}`;
  }

  async function _acaoLigou(id) {
    await _addHistorico(id, 'Ligação realizada');
    UI.showToast('Interação registrada!', 'success');
    _drawPage();
  }

  async function _acaoAdiar(id, dias) {
    const lead = _leads.find(l => _idMatch(l, id));
    if (!lead) return;
    const base = lead.proximo_followup || _hoje();
    const d    = new Date(base + 'T12:00');
    d.setDate(d.getDate() + dias);
    const nova = d.toISOString().slice(0, 10);
    lead.proximo_followup = nova;
    await SheetsAPI.update(id, { proximo_followup: nova });
    UI.showToast(`Follow-up adiado para ${_fmtData(nova)}`, 'success');
    _drawPage();
  }

  async function _addHistorico(id, acao) {
    const lead = _leads.find(l => _idMatch(l, id));
    if (!lead) return;
    const linha = `${_hoje()}: ${acao}`;
    lead.historico = lead.historico ? lead.historico + '\n' + linha : linha;
    await SheetsAPI.update(id, { historico: lead.historico });
  }

  // ── MODAL DETALHE ─────────────────────────────────────────────

  async function _abrirDetalhe(id) {
    const lead = _leads.find(l => _idMatch(l, id));
    if (lead) _renderDetalhe(lead);
  }

  function _renderDetalhe(lead) {
    const hist = (lead.historico || '').split('\n').filter(Boolean);
    const campos = [
      ['Empresa', lead.empresa], ['Contato', lead.contato_nome],
      ['Cargo', lead.contato_cargo], ['Telefone', lead.telefone],
      ['Email', lead.email], ['Cidade / UF', [lead.cidade, lead.uf].filter(Boolean).join('/')],
      ['Segmento', lead.segmento], ['Tipo de serviço', lead.tipo_servico],
      ['Origem', lead.origem], ['Status', lead.status],
      ['Próx. Follow-up', _fmtData(lead.proximo_followup)],
    ];

    UI.openModal(esc(lead.empresa || 'Contato'), `
      <div style="min-width:320px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;margin-bottom:16px;font-size:13px">
          ${campos.map(([k, v]) => `
            <div>
              <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">${k}</div>
              <div style="font-weight:500">${esc(v) || '<span style="color:#bbb">—</span>'}</div>
            </div>`).join('')}
        </div>
        ${lead.obs ? `
          <div style="margin-bottom:16px">
            <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Observações</div>
            <div style="font-size:13px">${esc(lead.obs)}</div>
          </div>` : ''}

        <hr style="border:none;border-top:1px solid #E8E3DA;margin:14px 0">

        <div>
          <div style="font-size:11px;font-weight:700;color:#444;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">
            Histórico de interações
          </div>
          <div style="max-height:140px;overflow-y:auto;margin-bottom:10px">
            ${hist.length
              ? hist.map(h => `<div style="font-size:12px;color:#555;padding:4px 0;border-bottom:1px solid #F0EDE8">${esc(h)}</div>`).join('')
              : '<div style="font-size:12px;color:#888;font-style:italic">Nenhuma interação ainda.</div>'
            }
          </div>
          <div style="display:flex;gap:8px">
            <input class="input input--sm" id="nova-interacao" placeholder="Registrar interação…" style="flex:1">
            <button class="btn btn--sm btn--primary" id="btn-add-interacao">Registrar</button>
          </div>
        </div>

        <div class="modal-footer" style="margin-top:16px">
          <button class="btn btn--danger btn--sm" id="btn-excluir-lead">Excluir</button>
          <button class="btn btn--ghost" id="btn-cancelar-detalhe">Fechar</button>
          <button class="btn btn--primary" id="btn-editar-lead">Editar</button>
        </div>
      </div>`);

    document.getElementById('btn-cancelar-detalhe').addEventListener('click', () => UI.closeModal());

    document.getElementById('btn-add-interacao').addEventListener('click', async () => {
      const txt = document.getElementById('nova-interacao').value.trim();
      if (!txt) return;
      const linha = `${_hoje()}: ${txt}`;
      lead.historico = lead.historico ? lead.historico + '\n' + linha : linha;
      await SheetsAPI.update(lead.id, { historico: lead.historico });
      UI.showToast('Interação registrada!', 'success');
      UI.closeModal();
      _renderDetalhe(lead);
    });

    document.getElementById('btn-excluir-lead').addEventListener('click', async () => {
      const ok = await UI.showConfirm(
        'Excluir contato',
        `Excluir ${lead.empresa}? O contato será marcado como inativo no Sheets.`,
        'Excluir'
      );
      if (!ok) return;
      await SheetsAPI.delete(lead.id);
      _leads = _leads.filter(l => !_idMatch(l, lead.id));
      UI.showToast('Contato excluído.', 'success');
      UI.closeModal();
      _drawPage();
    });

    document.getElementById('btn-editar-lead').addEventListener('click', () => {
      UI.closeModal();
      _abrirModalContato(lead);
    });
  }

  // ── MODAL CRIAR / EDITAR ──────────────────────────────────────

  async function _abrirModalContato(lead = null) {
    const d = lead || {};
    UI.openModal(lead ? `Editar — ${esc(lead.empresa)}` : 'Novo contato', `
      <form id="form-contato" class="form">
        <div class="form-grid">
          <div class="form-group form-group--full">
            <label class="form-label">Empresa *</label>
            <input class="input" name="empresa" required value="${esc(d.empresa || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Nome do contato</label>
            <input class="input" name="contato_nome" value="${esc(d.contato_nome || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Cargo</label>
            <input class="input" name="contato_cargo" value="${esc(d.contato_cargo || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Telefone</label>
            <input class="input" name="telefone" value="${esc(d.telefone || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="input" type="email" name="email" value="${esc(d.email || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Cidade</label>
            <input class="input" name="cidade" value="${esc(d.cidade || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">UF</label>
            <input class="input" name="uf" maxlength="2" style="text-transform:uppercase" value="${esc(d.uf || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Segmento</label>
            <input class="input" name="segmento" value="${esc(d.segmento || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Tipo de serviço</label>
            <input class="input" name="tipo_servico" value="${esc(d.tipo_servico || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Origem</label>
            <select class="input" name="origem">
              <option value="">—</option>
              ${ORIGENS.map(o => `<option value="${esc(o)}" ${d.origem === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="input" name="status">
              ${STATUSES.map(s => `<option value="${esc(s)}" ${(d.status || 'Novo') === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Próximo follow-up</label>
            <input class="input" type="date" name="proximo_followup" value="${esc(d.proximo_followup || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Website</label>
            <input class="input" name="website" value="${esc(d.website || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">LinkedIn</label>
            <input class="input" name="linkedin" value="${esc(d.linkedin || '')}">
          </div>
          <div class="form-group form-group--full">
            <label class="form-label">Observações</label>
            <textarea class="input" name="obs" rows="2">${esc(d.obs || '')}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn--ghost" id="btn-cancelar-contato">Cancelar</button>
          <button type="submit" class="btn btn--primary">${lead ? 'Salvar alterações' : 'Criar contato'}</button>
        </div>
      </form>`);

    document.getElementById('btn-cancelar-contato').addEventListener('click', () => UI.closeModal());

    document.getElementById('form-contato').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('[type="submit"]');
      btn.disabled = true;
      try {
        const fd      = new FormData(e.target);
        const payload = {};
        for (const [k, v] of fd.entries()) payload[k] = v.trim();

        if (lead) {
          await SheetsAPI.update(lead.id, payload);
          Object.assign(lead, payload);
          UI.showToast('Contato atualizado!', 'success');
        } else {
          payload.status = payload.status || 'Novo';
          const result = await SheetsAPI.create(payload);
          if (result.data) {
            _leads.unshift(result.data);
          } else if (result.id) {
            _leads.unshift({ ...payload, id: result.id, _pendente: true });
          }
          UI.showToast(
            result.offline ? 'Contato salvo localmente (offline).' : 'Contato criado!',
            result.offline ? 'warning' : 'success'
          );
        }
        UI.closeModal();
        _drawPage();
      } catch (err) {
        UI.handleError(err, 'Erro ao salvar contato');
        btn.disabled = false;
      }
    });
  }

  // ── EXPORTS ───────────────────────────────────────────────────

  function _exportExcel(leads) {
    if (!leads.length) { UI.showToast('Nenhum contato para exportar.', 'warning'); return; }
    const ws = XLSX.utils.json_to_sheet(leads.map(l => ({
      'Empresa':          l.empresa        || '',
      'Contato':          l.contato_nome   || '',
      'Cargo':            l.contato_cargo  || '',
      'Telefone':         l.telefone       || '',
      'Email':            l.email          || '',
      'Cidade':           l.cidade         || '',
      'UF':               l.uf             || '',
      'Segmento':         l.segmento       || '',
      'Tipo de serviço':  l.tipo_servico   || '',
      'Origem':           l.origem         || '',
      'Status':           l.status         || '',
      'Próx. Follow-up':  l.proximo_followup || '',
      'Observações':      l.obs            || '',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Prospecção');
    XLSX.writeFile(wb, 'Prospeccao_JOTEC.xlsx');
    UI.showToast('Excel exportado!', 'success');
  }

  function _exportCSV(leads) {
    if (!leads.length) { UI.showToast('Nenhum contato para exportar.', 'warning'); return; }
    const cols = ['empresa','contato_nome','telefone','email','cidade','uf','origem','status','proximo_followup'];
    const rows = leads.map(l => cols.map(k => `"${String(l[k] || '').replace(/"/g, '""')}"`).join(','));
    const csv  = [cols.join(','), ...rows].join('\n');
    const a    = Object.assign(document.createElement('a'), {
      href:     URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })),
      download: 'Prospeccao_JOTEC.csv',
    });
    a.click();
    URL.revokeObjectURL(a.href);
    UI.showToast('CSV exportado!', 'success');
  }

  return { render };
})();
