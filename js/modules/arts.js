const Arts = (() => {

  let _arts = [], _clientes = [], _servicos = [], _container = null;

  const STATUS = {
    ativa:     { label: 'Ativa',     cls: 'badge--verde'    },
    concluida: { label: 'Concluída', cls: 'badge--default'  },
    cancelada: { label: 'Cancelada', cls: 'badge--vermelho' },
  };

  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _fmtData(str) {
    if (!str) return '—';
    const [y, m, d] = str.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }

  function _nomeCliente(id) {
    const c = _clientes.find(x => x.id === Number(id));
    return c ? c.nome : '—';
  }

  function _nomeServico(id) {
    const s = _servicos.find(x => x.id === Number(id));
    return s ? s.nome : '—';
  }

  async function render(container) {
    _container = container;
    [_arts, _clientes, _servicos] = await Promise.all([
      DB.getAll('arts'),
      DB.getAll('clientes'),
      DB.getAll('servicos'),
    ]);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">ARTs — Anotações de Responsabilidade Técnica</h1>
          <p class="page-subtitle">Registro de ARTs emitidas junto ao CREA-SP</p>
        </div>
        <button class="btn btn--primary" id="btn-nova-art">+ Nova ART</button>
      </div>
      <div class="toolbar">
        <input type="text" id="filtro-arts" class="input-busca" placeholder="Buscar por número, cliente ou serviço...">
        <select id="filtro-art-status" class="select-sm">
          <option value="">Todos os status</option>
          <option value="ativa">Ativa</option>
          <option value="concluida">Concluída</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>
      <div id="tabela-arts"></div>
    `;

    document.getElementById('btn-nova-art').addEventListener('click', () => abrirModal());
    document.getElementById('filtro-arts').addEventListener('input', renderTabela);
    document.getElementById('filtro-art-status').addEventListener('change', renderTabela);
    renderTabela();
  }

  function renderTabela() {
    const busca  = (document.getElementById('filtro-arts')?.value || '').toLowerCase();
    const status = document.getElementById('filtro-art-status')?.value || '';

    const lista = _arts.filter(a => {
      const nomeC = _nomeCliente(a.cliente_id).toLowerCase();
      const nomeS = _nomeServico(a.servico_id).toLowerCase();
      const ok_busca = !busca ||
        (a.numero_art || '').toLowerCase().includes(busca) ||
        nomeC.includes(busca) ||
        nomeS.includes(busca);
      const ok_status = !status || a.status === status;
      return ok_busca && ok_status;
    });

    const el = document.getElementById('tabela-arts');
    if (!el) return;

    if (!lista.length) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">◈</div>
          <h3>${_arts.length ? 'Nenhuma ART encontrada' : 'Nenhuma ART registrada ainda'}</h3>
          <p>${_arts.length ? 'Tente outros termos ou remova os filtros.' : 'Registre as ARTs emitidas para rastrear responsabilidades técnicas CREA-SP.'}</p>
          ${!_arts.length ? '<button class="btn btn--primary" id="btn-empty-art">+ Registrar Primeira ART</button>' : ''}
        </div>`;
      if (!_arts.length) {
        document.getElementById('btn-empty-art')?.addEventListener('click', () => abrirModal());
      }
      return;
    }

    const totalValor = lista.reduce((s, a) => s + (Number(a.valor) || 0), 0);

    el.innerHTML = `
      <div class="table-info">${lista.length} ART${lista.length !== 1 ? 's' : ''} · Total de taxas: <strong>${UI.formatBRL(totalValor)}</strong></div>
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Número ART</th>
              <th>Cliente</th>
              <th>Serviço / Atividade</th>
              <th>Valor da Taxa</th>
              <th>Data de Emissão</th>
              <th>Status</th>
              <th class="th-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${lista.map(a => `
              <tr>
                <td><span class="art-numero">${esc(a.numero_art) || '—'}</span></td>
                <td>${esc(_nomeCliente(a.cliente_id))}</td>
                <td class="td-wrap">${esc(_nomeServico(a.servico_id))}</td>
                <td><strong>${UI.formatBRL(a.valor)}</strong></td>
                <td>${_fmtData(a.data_emissao)}</td>
                <td>${UI.statusBadge(a.status || 'ativa', STATUS)}</td>
                <td class="td-actions">
                  <button class="btn-icon" title="Editar" onclick="Arts._editar(${a.id})">✎</button>
                  <button class="btn-icon btn-icon--danger" title="Excluir" onclick="Arts._excluir(${a.id})">✕</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function abrirModal(art = null) {
    const edit = !!art;
    const v = (f) => esc(art?.[f] || '');

    const optsClientes = _clientes.map(c =>
      `<option value="${c.id}" ${art?.cliente_id == c.id ? 'selected' : ''}>${esc(c.nome)}</option>`
    ).join('');

    const optsServicos = _servicos.map(s =>
      `<option value="${s.id}" ${art?.servico_id == s.id ? 'selected' : ''}>${esc(s.nome)}</option>`
    ).join('');

    UI.openModal(edit ? `Editar ART: ${v('numero_art')}` : 'Registrar Nova ART', `
      <form id="form-art" class="form" onsubmit="return false">
        <div class="form-grid">
          <div class="form-group">
            <label>Número da ART *</label>
            <input type="text" name="numero_art" class="input" required value="${v('numero_art')}"
              placeholder="Ex: 1234567890" autofocus>
          </div>
          <div class="form-group">
            <label>Data de Emissão *</label>
            <input type="date" name="data_emissao" class="input" required value="${v('data_emissao')}">
          </div>
          <div class="form-group form-group--full">
            <label>Cliente</label>
            <select name="cliente_id" class="input">
              <option value="">— Selecione um cliente —</option>
              ${optsClientes}
            </select>
          </div>
          <div class="form-group form-group--full">
            <label>Serviço / Atividade</label>
            <select name="servico_id" class="input">
              <option value="">— Selecione um serviço —</option>
              ${optsServicos}
            </select>
          </div>
          <div class="form-group">
            <label>Valor da Taxa (R$)</label>
            <input type="number" name="valor" class="input" min="0" step="0.01"
              value="${art?.valor || ''}" placeholder="0,00">
          </div>
          <div class="form-group">
            <label>Status</label>
            <select name="status" class="input">
              <option value="ativa"     ${(art?.status || 'ativa') === 'ativa'     ? 'selected' : ''}>Ativa</option>
              <option value="concluida" ${art?.status === 'concluida' ? 'selected' : ''}>Concluída</option>
              <option value="cancelada" ${art?.status === 'cancelada' ? 'selected' : ''}>Cancelada</option>
            </select>
          </div>
          <div class="form-group form-group--full">
            <label>Observações</label>
            <textarea name="obs" class="input textarea" rows="3"
              placeholder="Notas sobre a ART, vínculo com processo, prazo, etc...">${v('obs')}</textarea>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn--ghost" onclick="UI.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn--primary">${edit ? 'Salvar Alterações' : 'Registrar ART'}</button>
        </div>
      </form>
    `);

    document.getElementById('form-art').addEventListener('submit', async () => {
      const btn = document.querySelector('#form-art [type="submit"]');
      btn.disabled = true;
      try {
        const fd   = new FormData(document.getElementById('form-art'));
        const data = Object.fromEntries(fd.entries());
        data.valor = parseFloat(data.valor) || 0;
        if (data.cliente_id) data.cliente_id = parseInt(data.cliente_id);
        if (data.servico_id) data.servico_id = parseInt(data.servico_id);

        if (edit) {
          await DB.put('arts', { ...art, ...data });
          UI.showToast('ART atualizada!', 'success');
        } else {
          data.criado_em = new Date().toISOString();
          await DB.add('arts', data);
          UI.showToast('ART registrada!', 'success');
        }

        UI.closeModal();
        _arts = await DB.getAll('arts');
        renderTabela();
      } catch (err) {
        UI.handleError(err, 'Erro ao salvar ART');
        btn.disabled = false;
      }
    });
  }

  async function _editar(id) {
    const a = await DB.get('arts', id);
    if (a) abrirModal(a);
  }

  async function _excluir(id) {
    const a = await DB.get('arts', id);
    if (!a) return;
    const ok = await UI.showConfirm(
      'Excluir ART',
      `Deseja excluir a ART <strong>${esc(a.numero_art)}</strong>? Esta ação não pode ser desfeita.`,
      'Excluir'
    );
    if (!ok) return;
    await DB.remove('arts', id);
    UI.showToast('ART excluída.', 'info');
    _arts = await DB.getAll('arts');
    renderTabela();
  }

  return { render, _editar, _excluir };
})();
