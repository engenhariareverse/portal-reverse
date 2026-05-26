const Clientes = (() => {

  const STATUS = {
    lead:      { label: 'Lead',      cls: 'badge--dourado' },
    prospecto: { label: 'Prospecto', cls: 'badge--azul' },
    ativo:     { label: 'Ativo',     cls: 'badge--verde' },
    inativo:   { label: 'Inativo',   cls: 'badge--default' },
  };

  let _todos = [];

  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  async function render(container) {
    _todos = await DB.getAll('clientes');
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Clientes</h1>
        <div class="page-header-actions">
          <button class="btn btn--ghost" id="btn-importar-crm">↑ Importar Excel</button>
          <button class="btn btn--primary" id="btn-novo-cliente">+ Novo Cliente</button>
        </div>
      </div>
      <div class="toolbar">
        <input type="text" id="filtro-clientes" class="input-busca" placeholder="Buscar por nome, CNPJ/CPF, e-mail ou cidade...">
        <select id="filtro-status" class="select-sm">
          <option value="">Todos os status</option>
          <option value="lead">Lead</option>
          <option value="prospecto">Prospecto</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
      </div>
      <div id="tabela-clientes"></div>
    `;

    document.getElementById('btn-novo-cliente').addEventListener('click', () => abrirModal());
    document.getElementById('btn-importar-crm').addEventListener('click', () => importarCRM());
    document.getElementById('filtro-clientes').addEventListener('input', renderTabela);
    document.getElementById('filtro-status').addEventListener('change', renderTabela);
    renderTabela();
  }

  function renderTabela() {
    const busca  = (document.getElementById('filtro-clientes')?.value || '').toLowerCase();
    const status = document.getElementById('filtro-status')?.value || '';

    const lista = _todos.filter(c => {
      const ok_busca = !busca ||
        esc(c.nome).toLowerCase().includes(busca) ||
        (c.cnpj_cpf || '').toLowerCase().includes(busca) ||
        (c.email || '').toLowerCase().includes(busca) ||
        (c.cidade || '').toLowerCase().includes(busca) ||
        (c.segmento || '').toLowerCase().includes(busca);
      const ok_status = !status || c.status === status;
      return ok_busca && ok_status;
    });

    const container = document.getElementById('tabela-clientes');
    if (!container) return;

    if (!lista.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">◉</div>
          <h3>${_todos.length ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}</h3>
          <p>${_todos.length ? 'Tente outros termos ou remova os filtros.' : 'Comece cadastrando o primeiro cliente da Reverse Engenharia.'}</p>
          ${!_todos.length ? '<button class="btn btn--primary" id="btn-empty-novo">+ Cadastrar Primeiro Cliente</button>' : ''}
        </div>`;
      if (!_todos.length) {
        document.getElementById('btn-empty-novo')?.addEventListener('click', () => abrirModal());
      }
      return;
    }

    container.innerHTML = `
      <div class="table-info">${lista.length} cliente${lista.length !== 1 ? 's' : ''} encontrado${lista.length !== 1 ? 's' : ''}</div>
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Nome / Empresa</th>
              <th>CNPJ / CPF</th>
              <th>Telefone</th>
              <th>Cidade</th>
              <th>Segmento</th>
              <th>Status</th>
              <th class="th-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${lista.map(c => `
              <tr>
                <td>
                  <strong>${esc(c.nome)}</strong>
                  ${c.email ? `<div class="td-sub">${esc(c.email)}</div>` : ''}
                </td>
                <td>${esc(c.cnpj_cpf) || '—'}</td>
                <td>${UI.formatPhone(c.telefone)}</td>
                <td>${esc(c.cidade) || '—'}</td>
                <td>${esc(c.segmento) || '—'}</td>
                <td>${UI.statusBadge(c.status || 'lead', STATUS)}</td>
                <td class="td-actions">
                  <button class="btn-icon" title="Editar" onclick="Clientes._editar(${c.id})">✎</button>
                  <button class="btn-icon btn-icon--danger" title="Excluir" onclick="Clientes._excluir(${c.id})">✕</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function abrirModal(cliente = null) {
    const edit = !!cliente;
    const v = (f) => esc(cliente?.[f] || '');

    UI.openModal(edit ? `Editar: ${esc(cliente.nome)}` : 'Novo Cliente', `
      <form id="form-cliente" class="form" onsubmit="return false">
        <div class="form-grid">
          <div class="form-group form-group--full">
            <label>Nome / Razão Social *</label>
            <input type="text" name="nome" class="input" required value="${v('nome')}" placeholder="Ex: Supermercado Silva LTDA" autofocus>
          </div>
          <div class="form-group">
            <label>CNPJ / CPF</label>
            <input type="text" name="cnpj_cpf" class="input" value="${v('cnpj_cpf')}" placeholder="00.000.000/0001-00">
          </div>
          <div class="form-group">
            <label>Telefone / WhatsApp</label>
            <input type="tel" name="telefone" class="input" value="${v('telefone')}" placeholder="(19) 99999-0000">
          </div>
          <div class="form-group">
            <label>E-mail</label>
            <input type="email" name="email" class="input" value="${v('email')}" placeholder="contato@empresa.com.br">
          </div>
          <div class="form-group">
            <label>Cidade</label>
            <input type="text" name="cidade" class="input" value="${v('cidade')}" placeholder="Ex: Campinas, Santa Bárbara d'Oeste">
          </div>
          <div class="form-group">
            <label>Segmento / Ramo</label>
            <input type="text" name="segmento" class="input" value="${v('segmento')}" placeholder="Ex: Supermercado, Academia, Desmanche">
          </div>
          <div class="form-group">
            <label>Status</label>
            <select name="status" class="input">
              <option value="lead"      ${(cliente?.status||'lead')==='lead'?'selected':''}>Lead</option>
              <option value="prospecto" ${cliente?.status==='prospecto'?'selected':''}>Prospecto</option>
              <option value="ativo"     ${cliente?.status==='ativo'?'selected':''}>Ativo</option>
              <option value="inativo"   ${cliente?.status==='inativo'?'selected':''}>Inativo</option>
            </select>
          </div>
          <div class="form-group form-group--full">
            <label>Observações</label>
            <textarea name="obs" class="input textarea" rows="3" placeholder="Notas, contexto, histórico de contato...">${v('obs')}</textarea>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn--ghost" onclick="UI.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn--primary">${edit ? 'Salvar Alterações' : 'Cadastrar Cliente'}</button>
        </div>
      </form>
    `);

    document.getElementById('form-cliente').addEventListener('submit', async () => {
      const btn = document.querySelector('#form-cliente [type="submit"]');
      btn.disabled = true;
      try {
        const fd   = new FormData(document.getElementById('form-cliente'));
        const data = Object.fromEntries(fd.entries());

        if (edit) {
          await DB.put('clientes', { ...cliente, ...data });
          UI.showToast('Cliente atualizado com sucesso!', 'success');
        } else {
          data.criado_em = new Date().toISOString();
          await DB.add('clientes', data);
          UI.showToast('Cliente cadastrado!', 'success');
        }

        UI.closeModal();
        _todos = await DB.getAll('clientes');
        renderTabela();
      } catch (err) {
        UI.handleError(err, 'Erro ao salvar cliente');
        btn.disabled = false;
      }
    });
  }

  async function _editar(id) {
    const c = await DB.get('clientes', id);
    if (c) abrirModal(c);
  }

  async function _excluir(id) {
    const c = await DB.get('clientes', id);
    if (!c) return;
    const ok = await UI.showConfirm(
      'Excluir Cliente',
      `Deseja excluir <strong>${esc(c.nome)}</strong>? Esta ação não pode ser desfeita.`,
      'Excluir'
    );
    if (!ok) return;
    await DB.remove('clientes', id);
    UI.showToast('Cliente excluído.', 'info');
    _todos = await DB.getAll('clientes');
    renderTabela();
  }

  function importarCRM() {
    let _rows = [];

    UI.openModal('Importar Clientes via Excel', `
      <div class="form">
        <p style="margin-bottom:16px;color:var(--text-secondary);line-height:1.6">
          Selecione um arquivo <strong>.xlsx</strong> ou <strong>.xls</strong> com os clientes.<br>
          A primeira linha deve conter os cabeçalhos das colunas.<br>
          <small style="color:var(--text-muted)">Colunas reconhecidas: <strong>nome</strong>, cnpj_cpf, telefone, email, cidade, segmento, status, obs</small>
        </p>
        <div class="form-group">
          <label>Arquivo Excel *</label>
          <input type="file" id="import-crm-file" class="input" accept=".xlsx,.xls,.csv">
        </div>
        <div id="import-crm-preview" style="margin-top:16px"></div>
        <div class="form-actions" style="margin-top:20px">
          <button type="button" class="btn btn--ghost" onclick="UI.closeModal()">Cancelar</button>
          <button type="button" class="btn btn--primary" id="btn-confirmar-import" disabled>Importar Clientes</button>
        </div>
      </div>
    `);

    document.getElementById('import-crm-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const wb   = XLSX.read(ev.target.result, { type: 'array' });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

          _rows = data.map(row => {
            const r = {};
            for (const [k, v] of Object.entries(row)) {
              r[k.toLowerCase().trim().replace(/\s+/g, '_')] = String(v).trim();
            }
            return r;
          }).filter(r => r.nome);

          const preview = document.getElementById('import-crm-preview');
          if (!_rows.length) {
            preview.innerHTML = `<p style="color:var(--vermelho)">Nenhum registro com coluna "nome" encontrado no arquivo.</p>`;
            return;
          }

          const exemplos = _rows.slice(0, 3).map(r => esc(r.nome)).join(', ');
          preview.innerHTML = `
            <div class="import-preview-info">
              <strong>${_rows.length}</strong> cliente${_rows.length !== 1 ? 's' : ''} detectado${_rows.length !== 1 ? 's' : ''} para importação.
              <div style="margin-top:6px;color:var(--text-muted);font-size:12px">Exemplo: ${exemplos}${_rows.length > 3 ? '...' : ''}</div>
            </div>`;

          document.getElementById('btn-confirmar-import').disabled = false;
        } catch (err) {
          document.getElementById('import-crm-preview').innerHTML =
            `<p style="color:var(--vermelho)">Erro ao ler o arquivo: ${esc(err.message)}</p>`;
        }
      };
      reader.readAsArrayBuffer(file);
    });

    document.getElementById('btn-confirmar-import').addEventListener('click', async () => {
      if (!_rows.length) return;

      const btn = document.getElementById('btn-confirmar-import');
      btn.disabled = true;
      btn.textContent = 'Importando...';

      const CAMPOS    = ['nome','cnpj_cpf','telefone','email','cidade','segmento','status','obs'];
      const STATUS_OK = new Set(['lead','prospecto','ativo','inativo']);
      // Dedup: ignora nomes que já existem (case-insensitive)
      const existentes = new Set(_todos.map(c => (c.nome || '').toLowerCase().trim()));
      let novos = 0, duplas = 0, erros = 0;

      for (const row of _rows) {
        try {
          const obj = { criado_em: new Date().toISOString() };
          for (const campo of CAMPOS) {
            if (row[campo]) obj[campo] = row[campo];
          }
          if (!obj.nome) continue;
          if (existentes.has(obj.nome.toLowerCase().trim())) { duplas++; continue; }
          if (!STATUS_OK.has(obj.status)) obj.status = 'lead';
          await DB.add('clientes', obj);
          existentes.add(obj.nome.toLowerCase().trim()); // evita dupl. dentro do arquivo
          novos++;
        } catch { erros++; }
      }

      UI.closeModal();
      const partes = [`${novos} importado${novos !== 1 ? 's' : ''}`];
      if (duplas) partes.push(`${duplas} duplicado${duplas !== 1 ? 's' : ''} ignorado${duplas !== 1 ? 's' : ''}`);
      if (erros)  partes.push(`${erros} erro${erros !== 1 ? 's' : ''}`);
      UI.showToast(partes.join(' · ') + '!', novos > 0 ? 'success' : 'warning');
      _todos = await DB.getAll('clientes');
      renderTabela();
    });
  }

  return { render, _editar, _excluir };
})();
