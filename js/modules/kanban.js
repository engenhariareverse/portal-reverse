const Kanban = (() => {
  let _cards = [];
  let _clientes = [];
  let _servicos = [];
  let _container = null;
  let _filtros = { busca: '', cliente: '', prioridade: '' };
  let _checklistTemp = [];
  let _sortables = [];
  let _debounceTimer = null;

  const COLUNAS = [
    { id: 'a_fazer',       label: 'A Fazer',            icon: '○', cor: 'var(--grafite)' },
    { id: 'em_andamento',  label: 'Em Andamento',       icon: '◐', cor: 'var(--azul)' },
    { id: 'aguardando',    label: 'Ag. Cliente',        icon: '◷', cor: 'var(--dourado)' },
    { id: 'concluido',     label: 'Concluído',          icon: '●', cor: 'var(--verde)' },
  ];

  const PRIORIDADE = {
    alta:  { label: 'Alta',  cls: 'badge--vermelho' },
    media: { label: 'Média', cls: 'badge--dourado'  },
    baixa: { label: 'Baixa', cls: 'badge--default'  },
  };

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _prazoInfo(prazoStr) {
    if (!prazoStr) return null;
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const prazo = new Date(prazoStr + 'T00:00');
    const diff = Math.round((prazo - hoje) / 86400000);
    if (diff < 0)  return { texto: `${Math.abs(diff)}d atraso`, cls: 'prazo--atrasado', urgente: false, atrasado: true };
    if (diff === 0) return { texto: 'Hoje',      cls: 'prazo--urgente', urgente: true,  atrasado: false };
    if (diff === 1) return { texto: 'Amanhã',    cls: 'prazo--urgente', urgente: true,  atrasado: false };
    if (diff <= 3)  return { texto: `Em ${diff}d`, cls: 'prazo--urgente', urgente: true, atrasado: false };
    return {
      texto: new Date(prazoStr + 'T00:00').toLocaleDateString('pt-BR', {day:'numeric', month:'short'}),
      cls: '', urgente: false, atrasado: false,
    };
  }

  function _cardsFiltrados() {
    let list = [..._cards];
    if (_filtros.busca) {
      const q = _filtros.busca.toLowerCase();
      list = list.filter(c =>
        c.titulo.toLowerCase().includes(q) ||
        (_clientes.find(cl => cl.id === c.cliente_id)?.nome || '').toLowerCase().includes(q)
      );
    }
    if (_filtros.cliente)    list = list.filter(c => c.cliente_id === Number(_filtros.cliente));
    if (_filtros.prioridade) list = list.filter(c => c.prioridade === _filtros.prioridade);
    return list;
  }

  // ── RENDER PRINCIPAL ─────────────────────────
  async function render(container) {
    _container = container;
    [_cards, _clientes, _servicos] = await Promise.all([
      DB.getAll('kanban_cards'),
      DB.getAll('clientes'),
      DB.getAll('servicos'),
    ]);
    _drawPage();
  }

  function _drawPage() {
    const cards = _cardsFiltrados();
    const temFiltros = _filtros.busca || _filtros.cliente || _filtros.prioridade;

    _container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Kanban</h1>
        <button class="btn btn--primary" id="btn-novo-card">+ Novo Card</button>
      </div>

      <div class="kanban-filtros">
        <input class="input input--sm" id="kb-busca" placeholder="Buscar..." value="${esc(_filtros.busca)}" style="width:200px">
        <select class="input input--sm" id="kb-cliente" style="width:190px">
          <option value="">Todos os clientes</option>
          ${_clientes.map(c => `<option value="${c.id}" ${_filtros.cliente==c.id?'selected':''}>${esc(c.nome)}</option>`).join('')}
        </select>
        <select class="input input--sm" id="kb-prioridade" style="width:160px">
          <option value="">Todas prioridades</option>
          <option value="alta"  ${_filtros.prioridade==='alta' ?'selected':''}>Alta</option>
          <option value="media" ${_filtros.prioridade==='media'?'selected':''}>Média</option>
          <option value="baixa" ${_filtros.prioridade==='baixa'?'selected':''}>Baixa</option>
        </select>
        ${temFiltros ? `<button class="btn btn--ghost btn--sm" id="kb-limpar">✕ Limpar</button>` : ''}
        <span class="kanban-total">${cards.length} card${cards.length!==1?'s':''}</span>
      </div>

      <div class="kanban-board" id="kanban-board">
        ${COLUNAS.map(col => {
          const colCards = cards.filter(c => c.coluna === col.id)
            .sort((a,b) => (a.ordem||0) - (b.ordem||0));
          return `
            <div class="kanban-col" style="border-top:3px solid ${col.cor}">
              <div class="kanban-col-header">
                <div class="kanban-col-titulo">
                  <span class="kanban-col-icon">${col.icon}</span>
                  <span>${col.label}</span>
                </div>
                <div class="kanban-col-acoes">
                  <span class="kanban-col-count">${colCards.length}</span>
                  <button class="kanban-col-add" data-add-coluna="${col.id}" title="Novo card aqui" aria-label="Novo card em ${col.label}">+</button>
                </div>
              </div>
              <div class="kanban-col-body" data-coluna="${col.id}" id="col-${col.id}">
                ${colCards.map(card => _renderCard(card)).join('')}
                ${colCards.length === 0 ? `<div class="kanban-vazio">Solte aqui ou clique em +</div>` : ''}
              </div>
            </div>`;
        }).join('')}
      </div>`;

    document.getElementById('btn-novo-card').addEventListener('click', () => abrirModal());

    // Busca com debounce (evita recriar 4 SortableJS a cada tecla)
    document.getElementById('kb-busca').addEventListener('input', e => {
      _filtros.busca = e.target.value;
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(() => _drawPage(), 250);
    });

    document.getElementById('kb-cliente').addEventListener('change', e => { _filtros.cliente = e.target.value; _drawPage(); });
    document.getElementById('kb-prioridade').addEventListener('change', e => { _filtros.prioridade = e.target.value; _drawPage(); });
    document.getElementById('kb-limpar')?.addEventListener('click', () => {
      _filtros = {busca:'',cliente:'',prioridade:''};
      clearTimeout(_debounceTimer);
      _drawPage();
    });

    // Delegação para ações nos cards e nos botões "+" de coluna
    document.getElementById('kanban-board').addEventListener('click', (e) => {
      const addBtn = e.target.closest('[data-add-coluna]');
      if (addBtn) { abrirModal(null, addBtn.dataset.addColuna); return; }
      const actionBtn = e.target.closest('[data-action]');
      if (!actionBtn) return;
      const id = parseInt(actionBtn.dataset.id);
      const action = actionBtn.dataset.action;
      if (action === 'editar')  _editar(id);
      if (action === 'excluir') _excluir(id);
    });

    // Inicializa SortableJS
    _sortables.forEach(s => s.destroy?.());
    _sortables = [];
    COLUNAS.forEach(col => {
      const el = document.getElementById(`col-${col.id}`);
      if (!el) return;
      _sortables.push(Sortable.create(el, {
        group:      'kanban',
        animation:  180,
        handle:     '.kanban-card-drag',
        ghostClass: 'kanban-card--ghost',
        filter:     '.kanban-vazio',
        onEnd: async (evt) => {
          const cardId = Number(evt.item.dataset.id);
          const novaColuna = evt.to.dataset.coluna;
          const card = _cards.find(c => c.id === cardId);
          if (!card) return;
          card.coluna = novaColuna;
          await _salvarOrdem(evt.from);
          if (evt.from !== evt.to) await _salvarOrdem(evt.to);
          _atualizarVazios();
        },
      }));
    });
  }

  async function _salvarOrdem(colEl) {
    const els = [...colEl.querySelectorAll('.kanban-card[data-id]')];
    for (let i = 0; i < els.length; i++) {
      const c = _cards.find(x => x.id === Number(els[i].dataset.id));
      if (c) { c.ordem = i; await DB.put('kanban_cards', c); }
    }
  }

  function _atualizarVazios() {
    COLUNAS.forEach(col => {
      const el = document.getElementById(`col-${col.id}`);
      if (!el) return;
      const n = el.querySelectorAll('.kanban-card[data-id]').length;
      const vazio = el.querySelector('.kanban-vazio');
      if (n > 0 && vazio) vazio.remove();
      if (n === 0 && !vazio) el.insertAdjacentHTML('beforeend', `<div class="kanban-vazio">Solte aqui ou clique em +</div>`);
      const countEl = el.closest('.kanban-col')?.querySelector('.kanban-col-count');
      if (countEl) countEl.textContent = n;
    });
  }

  // ── RENDER CARD ──────────────────────────────
  function _renderCard(card) {
    const cli = _clientes.find(c => c.id === card.cliente_id);
    const srv = _servicos.find(s => s.id === card.servico_id);
    const prazoInfo = _prazoInfo(card.prazo);
    const checklist = card.checklist || [];
    const feitos = checklist.filter(i => i.feito).length;
    const total = checklist.length;
    const pct = total > 0 ? Math.round(feitos / total * 100) : 0;

    const cls = ['kanban-card',
      prazoInfo?.atrasado ? 'kanban-card--atrasado' : '',
      prazoInfo?.urgente  ? 'kanban-card--urgente'  : '',
    ].filter(Boolean).join(' ');

    return `<div class="${cls}" data-id="${card.id}">
      <div class="kanban-card-drag" title="Arrastar">⠿</div>
      <div class="kanban-card-corpo">
        <div class="kanban-card-top">
          <div class="kanban-card-titulo" data-action="editar" data-id="${card.id}" style="cursor:pointer">${esc(card.titulo)}</div>
          <button class="kanban-card-del" data-action="excluir" data-id="${card.id}" title="Excluir" aria-label="Excluir card">×</button>
        </div>
        ${(cli || srv) ? `<div class="kanban-card-meta">
          ${cli ? `<span class="kanban-meta-item">◉ ${esc(cli.nome)}</span>` : ''}
          ${srv ? `<span class="kanban-meta-item">◎ ${esc(srv.nome.split('—')[0].trim())}</span>` : ''}
        </div>` : ''}
        <div class="kanban-card-footer">
          ${prazoInfo ? `<span class="kanban-prazo ${prazoInfo.cls}">◷ ${prazoInfo.texto}</span>` : ''}
          ${UI.statusBadge(card.prioridade || 'media', PRIORIDADE)}
          ${total > 0 ? `<span class="kanban-chk-info" title="${feitos}/${total} feitos">☑ ${feitos}/${total}</span>` : ''}
        </div>
        ${total > 0 ? `<div class="kanban-progress"><div class="kanban-progress-bar" style="width:${pct}%"></div></div>` : ''}
      </div>
    </div>`;
  }

  // ── MODAL CRUD ────────────────────────────────
  async function abrirModal(id, colunaDefault) {
    let card = id ? await DB.get('kanban_cards', id) : null;
    _checklistTemp = card ? JSON.parse(JSON.stringify(card.checklist || [])) : [];
    const colunaVal = card?.coluna || colunaDefault || 'a_fazer';

    const html = `
      <form id="form-card" class="form">
        <div class="form-grid">
          <div class="form-group form-group--full">
            <label class="form-label">Título *</label>
            <input class="input" name="titulo" required value="${esc(card?.titulo||'')}" placeholder="Ex: Elaborar PMOC — Condomínio X">
          </div>
          <div class="form-group">
            <label class="form-label">Coluna</label>
            <select class="input" name="coluna">
              ${COLUNAS.map(c => `<option value="${c.id}" ${colunaVal===c.id?'selected':''}>${c.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Prioridade</label>
            <select class="input" name="prioridade">
              <option value="alta"  ${(!card||card.prioridade==='alta')  ?'selected':''}>Alta</option>
              <option value="media" ${card?.prioridade==='media'?'selected':''}>Média</option>
              <option value="baixa" ${card?.prioridade==='baixa'?'selected':''}>Baixa</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Cliente</label>
            <select class="input" name="cliente_id">
              <option value="">— Sem cliente —</option>
              ${_clientes.map(c => `<option value="${c.id}" ${card?.cliente_id===c.id?'selected':''}>${esc(c.nome)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Serviço</label>
            <select class="input" name="servico_id">
              <option value="">— Sem serviço —</option>
              ${_servicos.map(s => `<option value="${s.id}" ${card?.servico_id===s.id?'selected':''}>${esc(s.nome.split('—')[0].trim())}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Prazo</label>
            <input class="input" type="date" name="prazo" value="${card?.prazo||''}">
          </div>
          <div class="form-group form-group--full">
            <label class="form-label">Descrição</label>
            <textarea class="input" name="descricao" rows="2" placeholder="Detalhes, contexto, links...">${esc(card?.descricao||'')}</textarea>
          </div>
          <div class="form-group form-group--full">
            <label class="form-label">Checklist</label>
            <div id="checklist-items" class="checklist-lista"></div>
            <div class="checklist-novo">
              <input class="input" id="novo-chk" placeholder="Novo item... (Enter para adicionar)" style="flex:1">
              <button type="button" class="btn btn--ghost btn--sm" id="btn-add-chk">+ Adicionar</button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          ${card ? `<button type="button" class="btn btn--danger btn--sm" id="btn-excluir-card">Excluir</button>` : ''}
          <button type="button" class="btn btn--ghost" id="btn-cancelar-card">Cancelar</button>
          <button type="submit" class="btn btn--primary">${card ? 'Salvar alterações' : 'Criar card'}</button>
        </div>
      </form>`;

    UI.openModal(card ? 'Editar Card' : 'Novo Card', html);

    document.getElementById('btn-cancelar-card').addEventListener('click', () => UI.closeModal());
    if (card) {
      document.getElementById('btn-excluir-card').addEventListener('click', () => _excluir(card.id));
    }

    _renderChecklistModal();

    document.getElementById('btn-add-chk').addEventListener('click', _adicionarItemChk);
    document.getElementById('novo-chk').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); _adicionarItemChk(); }
    });

    document.getElementById('form-card').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = e.target.querySelector('[type="submit"]');
      btn.disabled = true;
      try {
        const fd = new FormData(e.target);
        const obj = {
          titulo:     fd.get('titulo').trim(),
          coluna:     fd.get('coluna'),
          prioridade: fd.get('prioridade'),
          cliente_id: Number(fd.get('cliente_id')) || null,
          servico_id: Number(fd.get('servico_id')) || null,
          prazo:      fd.get('prazo') || null,
          descricao:  fd.get('descricao').trim() || null,
          checklist:  _checklistTemp,
        };
        if (card?.id) {
          obj.id = card.id;
          obj.criado_em = card.criado_em;
          obj.ordem = card.ordem ?? 0;
          await DB.put('kanban_cards', obj);
          UI.showToast('Card atualizado.', 'success');
        } else {
          obj.criado_em = new Date().toISOString();
          obj.ordem = _cards.filter(c => c.coluna === obj.coluna).length;
          await DB.add('kanban_cards', obj);
          UI.showToast('Card criado!', 'success');
        }
        UI.closeModal();
        await render(_container);
      } catch (err) {
        UI.handleError(err, 'Erro ao salvar card');
        btn.disabled = false;
      }
    });
  }

  function _adicionarItemChk() {
    const inp = document.getElementById('novo-chk');
    const txt = inp?.value.trim();
    if (!txt) return;
    _checklistTemp.push({ texto: txt, feito: false });
    inp.value = '';
    _renderChecklistModal();
    inp.focus();
  }

  function _renderChecklistModal() {
    const el = document.getElementById('checklist-items');
    if (!el) return;
    if (!_checklistTemp.length) {
      el.innerHTML = '<div class="checklist-vazio">Nenhum item. Adicione abaixo.</div>';
      return;
    }
    el.innerHTML = _checklistTemp.map((item, i) => `
      <div class="checklist-item">
        <input type="checkbox" class="checklist-check" data-idx="${i}" ${item.feito?'checked':''}>
        <span class="checklist-texto ${item.feito?'checklist-texto--feito':''}">${esc(item.texto)}</span>
        <button type="button" class="checklist-del" data-idx="${i}" title="Remover item">×</button>
      </div>`).join('');

    el.querySelectorAll('.checklist-check').forEach(cb => {
      cb.addEventListener('change', () => {
        _checklistTemp[Number(cb.dataset.idx)].feito = cb.checked;
        _renderChecklistModal();
      });
    });
    el.querySelectorAll('.checklist-del').forEach(btn => {
      btn.addEventListener('click', () => {
        _checklistTemp.splice(Number(btn.dataset.idx), 1);
        _renderChecklistModal();
      });
    });
  }

  async function _editar(id)   { await abrirModal(id); }

  async function _excluir(id) {
    const ok = await UI.showConfirm('Excluir card', 'Tem certeza que deseja excluir este card?', 'Excluir');
    if (!ok) return;
    await DB.remove('kanban_cards', id);
    UI.showToast('Card excluído.', 'success');
    UI.closeModal();
    await render(_container);
  }

  function _novoNaColuna(coluna) { abrirModal(null, coluna); }

  return { render, _editar, _excluir, _novoNaColuna };
})();
