const Servicos = (() => {

  const RECORRENCIA = {
    pontual: { label: 'Pontual',  cls: 'badge--default' },
    mensal:  { label: 'Mensal',   cls: 'badge--verde' },
    anual:   { label: 'Anual',    cls: 'badge--azul' },
  };

  let _todos = [];

  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  async function render(container) {
    _todos = await DB.getAll('servicos');
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Serviços</h1>
        <button class="btn btn--primary" id="btn-novo-servico">+ Novo Serviço</button>
      </div>
      <div class="toolbar">
        <input type="text" id="filtro-servicos" class="input-busca" placeholder="Buscar por nome ou categoria...">
        <select id="filtro-rec" class="select-sm">
          <option value="">Todas as recorrências</option>
          <option value="pontual">Pontual</option>
          <option value="mensal">Mensal</option>
          <option value="anual">Anual</option>
        </select>
      </div>
      <div id="lista-servicos"></div>
    `;

    document.getElementById('btn-novo-servico').addEventListener('click', () => abrirModal());
    document.getElementById('filtro-servicos').addEventListener('input', renderLista);
    document.getElementById('filtro-rec').addEventListener('change', renderLista);
    renderLista();
  }

  function renderLista() {
    const busca = (document.getElementById('filtro-servicos')?.value || '').toLowerCase();
    const rec   = document.getElementById('filtro-rec')?.value || '';

    const lista = _todos.filter(s => {
      const ok_b = !busca || (s.nome || '').toLowerCase().includes(busca) || (s.categoria || '').toLowerCase().includes(busca);
      const ok_r = !rec || s.recorrencia === rec;
      return ok_b && ok_r;
    });

    const container = document.getElementById('lista-servicos');
    if (!container) return;

    if (!lista.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">◎</div>
          <h3>${_todos.length ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}</h3>
          <p>${_todos.length ? 'Tente outros termos.' : 'Cadastre os serviços da Reverse Engenharia.'}</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="table-info">${lista.length} serviço${lista.length !== 1 ? 's' : ''}</div>
      <div class="servicos-grid">
        ${lista.map(s => `
          <div class="servico-card">
            <div class="servico-card-header">
              <div style="flex:1;min-width:0">
                <h4 class="servico-nome">${esc(s.nome)}</h4>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
                  <span class="badge badge--category">${esc(s.categoria || 'Geral')}</span>
                  ${UI.statusBadge(s.recorrencia || 'pontual', RECORRENCIA)}
                </div>
              </div>
              <div class="servico-actions">
                <button class="btn-icon" title="Editar" onclick="Servicos._editar(${s.id})">✎</button>
                <button class="btn-icon btn-icon--danger" title="Excluir" onclick="Servicos._excluir(${s.id})">✕</button>
              </div>
            </div>
            ${s.descricao ? `<p class="servico-desc">${esc(s.descricao)}</p>` : ''}
            <div class="servico-precos">
              <div class="preco-item">
                <span class="preco-label">Mínimo</span>
                <span class="preco-val">${UI.formatBRL(s.preco_min)}</span>
              </div>
              <div class="preco-item preco-item--ideal">
                <span class="preco-label">Ideal ★</span>
                <span class="preco-val preco-val--dourado">${UI.formatBRL(s.preco_ideal)}</span>
              </div>
              <div class="preco-item">
                <span class="preco-label">Máximo</span>
                <span class="preco-val">${UI.formatBRL(s.preco_max)}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>`;
  }

  function abrirModal(servico = null) {
    const edit = !!servico;
    const v = (f) => esc(servico?.[f] || '');

    UI.openModal(edit ? `Editar: ${esc(servico.nome)}` : 'Novo Serviço', `
      <form id="form-servico" class="form" onsubmit="return false">
        <div class="form-grid">
          <div class="form-group form-group--full">
            <label>Nome do Serviço *</label>
            <input type="text" name="nome" class="input" required value="${v('nome')}"
              placeholder="Ex: PMOC — Plano de Manutenção, Operação e Controle" autofocus>
          </div>
          <div class="form-group">
            <label>Categoria</label>
            <input type="text" name="categoria" class="input" value="${v('categoria')}"
              placeholder="Ex: PMOC, Laudo, Perícia, ART">
          </div>
          <div class="form-group">
            <label>Recorrência</label>
            <select name="recorrencia" class="input">
              <option value="pontual" ${(servico?.recorrencia||'pontual')==='pontual'?'selected':''}>Pontual (único)</option>
              <option value="mensal"  ${servico?.recorrencia==='mensal'?'selected':''}>Mensal (recorrente)</option>
              <option value="anual"   ${servico?.recorrencia==='anual'?'selected':''}>Anual (recorrente)</option>
            </select>
          </div>
          <div class="form-group form-group--full">
            <label>Descrição</label>
            <textarea name="descricao" class="input textarea" rows="3"
              placeholder="Descreva o serviço, normas aplicáveis, entregáveis...">${v('descricao')}</textarea>
          </div>
          <div class="form-group">
            <label>Preço Mínimo (R$)</label>
            <input type="number" name="preco_min" class="input" step="0.01" min="0"
              value="${servico?.preco_min || ''}" placeholder="0,00">
          </div>
          <div class="form-group">
            <label>Preço Ideal (R$) ★</label>
            <input type="number" name="preco_ideal" class="input" step="0.01" min="0"
              value="${servico?.preco_ideal || ''}" placeholder="0,00">
          </div>
          <div class="form-group">
            <label>Preço Máximo (R$)</label>
            <input type="number" name="preco_max" class="input" step="0.01" min="0"
              value="${servico?.preco_max || ''}" placeholder="0,00">
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn--ghost" onclick="UI.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn--primary">${edit ? 'Salvar Alterações' : 'Cadastrar Serviço'}</button>
        </div>
      </form>
    `);

    document.getElementById('form-servico').addEventListener('submit', async () => {
      const btn = document.querySelector('#form-servico [type="submit"]');
      btn.disabled = true;
      try {
        const fd   = new FormData(document.getElementById('form-servico'));
        const data = Object.fromEntries(fd.entries());
        data.preco_min   = parseFloat(data.preco_min)   || 0;
        data.preco_ideal = parseFloat(data.preco_ideal) || 0;
        data.preco_max   = parseFloat(data.preco_max)   || 0;

        if (edit) {
          await DB.put('servicos', { ...servico, ...data });
          UI.showToast('Serviço atualizado!', 'success');
        } else {
          await DB.add('servicos', data);
          UI.showToast('Serviço cadastrado!', 'success');
        }

        UI.closeModal();
        _todos = await DB.getAll('servicos');
        renderLista();
      } catch (err) {
        UI.handleError(err, 'Erro ao salvar serviço');
        btn.disabled = false;
      }
    });
  }

  async function _editar(id) {
    const s = await DB.get('servicos', id);
    if (s) abrirModal(s);
  }

  async function _excluir(id) {
    const s = await DB.get('servicos', id);
    if (!s) return;
    const ok = await UI.showConfirm('Excluir Serviço', `Deseja excluir <strong>${esc(s.nome)}</strong>?`, 'Excluir');
    if (!ok) return;
    await DB.remove('servicos', id);
    UI.showToast('Serviço excluído.', 'info');
    _todos = await DB.getAll('servicos');
    renderLista();
  }

  return { render, _editar, _excluir };
})();
