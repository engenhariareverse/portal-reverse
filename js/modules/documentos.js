const Documentos = (() => {

  let _docs = [], _clientes = [], _container = null;

  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _fmtData(str) {
    if (!str) return '';
    const [y, m, d] = str.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }

  function _nomeCliente(id) {
    const c = _clientes.find(x => x.id === Number(id));
    return c ? c.nome : '';
  }

  function _fmtTamanho(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  function _tipoIcon(nome, mime) {
    const ext = (nome || '').split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['jpg','jpeg','png','gif','webp','bmp'].includes(ext)) return '🖼';
    if (['doc','docx'].includes(ext)) return '📝';
    if (['xls','xlsx'].includes(ext)) return '📊';
    if (['zip','rar','7z'].includes(ext)) return '🗜';
    return '📎';
  }

  async function render(container) {
    _container = container;
    [_docs, _clientes] = await Promise.all([
      DB.getAll('documentos'),
      DB.getAll('clientes'),
    ]);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Documentos</h1>
          <p class="page-subtitle">Contratos, laudos, relatórios e demais arquivos</p>
        </div>
        <button class="btn btn--primary" id="btn-add-doc">+ Adicionar Documento</button>
      </div>
      <div class="toolbar">
        <input type="text" id="filtro-docs" class="input-busca" placeholder="Buscar por nome ou descrição...">
        <select id="filtro-doc-cliente" class="select-sm">
          <option value="">Todos os clientes</option>
          ${_clientes.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}
        </select>
      </div>
      <div id="grid-docs"></div>
    `;

    document.getElementById('btn-add-doc').addEventListener('click', () => abrirModal());
    document.getElementById('filtro-docs').addEventListener('input', renderGrid);
    document.getElementById('filtro-doc-cliente').addEventListener('change', renderGrid);
    renderGrid();
  }

  function renderGrid() {
    const busca  = (document.getElementById('filtro-docs')?.value || '').toLowerCase();
    const cliId  = document.getElementById('filtro-doc-cliente')?.value || '';

    const lista = _docs.filter(d => {
      const ok_busca = !busca ||
        (d.nome || '').toLowerCase().includes(busca) ||
        (d.descricao || '').toLowerCase().includes(busca) ||
        _nomeCliente(d.cliente_id).toLowerCase().includes(busca);
      const ok_cli = !cliId || String(d.cliente_id) === cliId;
      return ok_busca && ok_cli;
    }).sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));

    const el = document.getElementById('grid-docs');
    if (!el) return;

    if (!lista.length) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">◧</div>
          <h3>${_docs.length ? 'Nenhum documento encontrado' : 'Nenhum documento armazenado ainda'}</h3>
          <p>${_docs.length ? 'Tente outros termos ou remova os filtros.' : 'Adicione contratos, laudos e documentos importantes para consulta rápida.'}</p>
          ${!_docs.length ? '<button class="btn btn--primary" id="btn-empty-doc">+ Adicionar Primeiro Documento</button>' : ''}
        </div>`;
      if (!_docs.length) {
        document.getElementById('btn-empty-doc')?.addEventListener('click', () => abrirModal());
      }
      return;
    }

    const totalBytes = lista.reduce((s, d) => s + (d.tamanho || 0), 0);

    el.innerHTML = `
      <div class="table-info">${lista.length} documento${lista.length !== 1 ? 's' : ''} · ${_fmtTamanho(totalBytes)} total</div>
      <div class="doc-grid">
        ${lista.map(d => `
          <div class="doc-card">
            <div class="doc-card-icon">${_tipoIcon(d.nome, d.tipo)}</div>
            <div class="doc-card-body">
              <div class="doc-card-nome">${esc(d.nome)}</div>
              ${d.descricao ? `<div class="doc-card-desc">${esc(d.descricao)}</div>` : ''}
              <div class="doc-card-meta">
                ${d.cliente_id ? `<span class="doc-meta-cliente">◉ ${esc(_nomeCliente(d.cliente_id))}</span>` : ''}
                <span>${_fmtData(d.criado_em?.slice(0,10))}</span>
                ${d.tamanho ? `<span>${_fmtTamanho(d.tamanho)}</span>` : ''}
              </div>
            </div>
            <div class="doc-card-actions">
              <button class="btn-icon" title="Baixar / Abrir" onclick="Documentos._baixar(${d.id})">⬇</button>
              <button class="btn-icon btn-icon--danger" title="Excluir" onclick="Documentos._excluir(${d.id})">✕</button>
            </div>
          </div>
        `).join('')}
      </div>`;
  }

  function abrirModal() {
    UI.openModal('Adicionar Documento', `
      <div class="form">
        <p class="import-preview-info" style="margin-bottom:20px">
          O arquivo é armazenado localmente no banco de dados do portal.<br>
          <small style="color:var(--text-muted)">Formatos aceitos: PDF, Word, Excel, imagens, ZIP e outros.</small>
        </p>
        <div class="form-grid">
          <div class="form-group form-group--full">
            <label>Arquivo *</label>
            <input type="file" id="doc-file" class="input" accept="*/*">
          </div>
          <div class="form-group form-group--full">
            <label>Descrição</label>
            <input type="text" id="doc-descricao" class="input"
              placeholder="Ex: Contrato de prestação de serviços — PMOC 2026">
          </div>
          <div class="form-group form-group--full">
            <label>Cliente vinculado</label>
            <select id="doc-cliente" class="input">
              <option value="">— Sem vínculo —</option>
              ${_clientes.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn--ghost" onclick="UI.closeModal()">Cancelar</button>
          <button type="button" class="btn btn--primary" id="btn-salvar-doc">Salvar Documento</button>
        </div>
      </div>
    `);

    document.getElementById('btn-salvar-doc').addEventListener('click', async () => {
      const fileInput = document.getElementById('doc-file');
      const file = fileInput?.files?.[0];
      if (!file) { UI.showToast('Selecione um arquivo.', 'warning'); return; }

      const MAX_BYTES  = 25 * 1024 * 1024; // 25 MB — limite absoluto
      const WARN_BYTES =  5 * 1024 * 1024; //  5 MB — avisa antes de salvar

      if (file.size > MAX_BYTES) {
        UI.showToast(`Arquivo muito grande (${_fmtTamanho(file.size)}). Limite: 25 MB. Comprima o PDF ou reduza o arquivo.`, 'error', 7000);
        return;
      }

      if (file.size > WARN_BYTES) {
        const ok = await UI.showConfirm(
          'Arquivo grande',
          `O arquivo tem <strong>${_fmtTamanho(file.size)}</strong> e pode aumentar significativamente o tamanho do banco de dados.<br>Backups futuros também ficarão maiores.<br><br>Continuar?`,
          'Continuar'
        );
        if (!ok) return;
      }

      const btn = document.getElementById('btn-salvar-doc');
      btn.disabled = true;
      btn.textContent = 'Salvando...';

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const doc = {
            nome:       file.name,
            descricao:  document.getElementById('doc-descricao')?.value.trim() || '',
            cliente_id: parseInt(document.getElementById('doc-cliente')?.value) || null,
            tipo:       file.type || 'application/octet-stream',
            tamanho:    file.size,
            dados:      e.target.result,
            criado_em:  new Date().toISOString(),
          };
          await DB.add('documentos', doc);
          UI.showToast('Documento salvo!', 'success');
          UI.closeModal();
          _docs = await DB.getAll('documentos');
          renderGrid();
        } catch (err) {
          if (err.name === 'QuotaExceededError') {
            UI.showToast('Espaço insuficiente no navegador. Exclua documentos antigos e tente novamente.', 'error', 7000);
          } else {
            UI.handleError(err, 'Erro ao salvar documento');
          }
          btn.disabled = false;
          btn.textContent = 'Salvar Documento';
        }
      };
      reader.onerror = () => {
        UI.showToast('Erro ao ler o arquivo.', 'error');
        btn.disabled = false;
        btn.textContent = 'Salvar Documento';
      };
      reader.readAsDataURL(file);
    });
  }

  async function _baixar(id) {
    const doc = await DB.get('documentos', id);
    if (!doc) return;
    const a = document.createElement('a');
    a.href = doc.dados;
    a.download = doc.nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function _excluir(id) {
    const doc = await DB.get('documentos', id);
    if (!doc) return;
    const ok = await UI.showConfirm(
      'Excluir Documento',
      `Deseja excluir <strong>${esc(doc.nome)}</strong>? O arquivo será removido permanentemente.`,
      'Excluir'
    );
    if (!ok) return;
    await DB.remove('documentos', id);
    UI.showToast('Documento excluído.', 'info');
    _docs = await DB.getAll('documentos');
    renderGrid();
  }

  return { render, _baixar, _excluir };
})();
