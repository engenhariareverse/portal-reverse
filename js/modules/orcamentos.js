const Orcamentos = (() => {

  const STATUS_MAP = {
    rascunho: { label: 'Rascunho', cls: 'badge--default' },
    enviado:  { label: 'Enviado',  cls: 'badge--azul' },
    aprovado: { label: 'Aprovado', cls: 'badge--verde' },
    recusado: { label: 'Recusado', cls: 'badge--vermelho' },
  };

  let _orcamentos = [];
  let _clientes   = [];
  let _servicos   = [];
  let _filtros    = { status: '', cliente: '', periodo: '' };
  let _pagina     = 1;
  const PER_PAGE  = 10;

  // ── Render principal ─────────────────────────
  function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Orçamentos</h1>
        <div class="page-actions">
          <button class="btn btn--primary" id="btn-novo-orc">+ Novo Orçamento</button>
        </div>
      </div>
      <div class="card" style="margin-bottom:20px">
        <div class="card-body" style="padding:14px 22px">
          <div class="filtros-bar">
            <select class="select-sm" id="filtro-status">
              <option value="">Todos os status</option>
              <option value="rascunho">Rascunho</option>
              <option value="enviado">Enviado</option>
              <option value="aprovado">Aprovado</option>
              <option value="recusado">Recusado</option>
            </select>
            <select class="select-sm" id="filtro-cliente">
              <option value="">Todos os clientes</option>
            </select>
            <select class="select-sm" id="filtro-periodo">
              <option value="">Todo o período</option>
              <option value="hoje">Hoje</option>
              <option value="7dias">Últimos 7 dias</option>
              <option value="30dias">Últimos 30 dias</option>
              <option value="mes">Este mês</option>
            </select>
            <button class="btn btn--ghost btn--sm" id="btn-limpar-filtros">Limpar filtros</button>
          </div>
        </div>
      </div>
      <div id="orc-lista"></div>
    `;

    document.getElementById('btn-novo-orc').addEventListener('click', () => abrirFormulario());
    document.getElementById('btn-limpar-filtros').addEventListener('click', limparFiltros);
    document.getElementById('filtro-status').addEventListener('change', e => {
      _filtros.status = e.target.value; _pagina = 1; renderLista();
    });
    document.getElementById('filtro-cliente').addEventListener('change', e => {
      _filtros.cliente = e.target.value; _pagina = 1; renderLista();
    });
    document.getElementById('filtro-periodo').addEventListener('change', e => {
      _filtros.periodo = e.target.value; _pagina = 1; renderLista();
    });

    carregarDados();
  }

  async function carregarDados() {
    [_orcamentos, _clientes, _servicos] = await Promise.all([
      DB.getAll('orcamentos'),
      DB.getAll('clientes'),
      DB.getAll('servicos'),
    ]);
    _orcamentos.sort((a, b) => b.id - a.id);

    const sel = document.getElementById('filtro-cliente');
    if (sel) {
      // preserve current value
      const atual = sel.value;
      while (sel.options.length > 1) sel.remove(1);
      _clientes.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.nome;
        sel.appendChild(opt);
      });
      sel.value = atual;
    }

    renderLista();
  }

  function filtrarOrcamentos() {
    return _orcamentos.filter(o => {
      if (_filtros.status && o.status !== _filtros.status) return false;
      if (_filtros.cliente && String(o.cliente_id) !== String(_filtros.cliente)) return false;
      if (_filtros.periodo) {
        const now = new Date();
        const d   = new Date(o.criado_em);
        if (_filtros.periodo === 'hoje'   && d.toDateString() !== now.toDateString()) return false;
        if (_filtros.periodo === '7dias'  && now - d > 7  * 86400000) return false;
        if (_filtros.periodo === '30dias' && now - d > 30 * 86400000) return false;
        if (_filtros.periodo === 'mes') {
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        }
      }
      return true;
    });
  }

  function renderLista() {
    const container = document.getElementById('orc-lista');
    if (!container) return;

    const filtrados = filtrarOrcamentos();
    const total   = filtrados.length;
    const inicio  = (_pagina - 1) * PER_PAGE;
    const pagina  = filtrados.slice(inicio, inicio + PER_PAGE);

    if (total === 0) {
      container.innerHTML = `
        <div class="table-wrapper">
          <div class="empty-state">
            <div class="empty-icon">◷</div>
            <h3>Nenhum orçamento encontrado</h3>
            <p>Clique em "+ Novo Orçamento" para criar o primeiro.</p>
          </div>
        </div>`;
      return;
    }

    const rows = pagina.map(o => {
      const cli = _clientes.find(c => c.id === o.cliente_id);
      return `
        <tr>
          <td>
            <div style="font-weight:700;font-family:var(--font-titulo);font-size:13px">${esc(o.numero)}</div>
            <div class="td-sub">${UI.formatDate(o.criado_em)}</div>
          </td>
          <td>
            <div style="font-weight:500">${cli ? esc(cli.nome) : '—'}</div>
            <div class="td-sub">${cli && cli.cidade ? esc(cli.cidade) : ''}</div>
          </td>
          <td style="text-align:right">
            <div style="font-weight:700;font-family:var(--font-titulo)">${UI.formatBRL(o.total)}</div>
            ${o.desconto > 0 ? `<div class="td-sub">Desc: ${UI.formatBRL(o.desconto)}</div>` : ''}
          </td>
          <td>${UI.statusBadge(o.status, STATUS_MAP)}</td>
          <td><div style="font-size:12px;color:var(--text-muted)">${UI.formatDate(o.validade)}</div></td>
          <td class="td-actions">
            <button class="btn-icon" title="Visualizar" data-action="ver" data-id="${o.id}">◉</button>
            <button class="btn-icon" title="Editar"     data-action="editar" data-id="${o.id}">✎</button>
            <button class="btn-icon" title="Duplicar"   data-action="duplicar" data-id="${o.id}">⊕</button>
            <button class="btn-icon btn-icon--danger" title="Excluir" data-action="excluir" data-id="${o.id}">✕</button>
          </td>
        </tr>`;
    }).join('');

    const totalPages = Math.ceil(total / PER_PAGE);

    container.innerHTML = `
      <p class="table-info">Mostrando ${Math.min(inicio+1,total)}–${Math.min(inicio+PER_PAGE,total)} de ${total} orçamento${total!==1?'s':''}</p>
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente</th>
              <th style="text-align:right">Total</th>
              <th>Status</th>
              <th>Validade</th>
              <th class="th-actions">Ações</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${totalPages > 1 ? renderPaginacao(totalPages) : ''}
    `;

    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const action = btn.dataset.action;
        if (action === 'ver')      visualizar(id);
        if (action === 'editar')   editar(id);
        if (action === 'duplicar') duplicar(id);
        if (action === 'excluir')  excluir(id);
      });
    });

    if (totalPages > 1) {
      container.querySelectorAll('.pag-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          _pagina = parseInt(btn.dataset.page);
          renderLista();
        });
      });
    }
  }

  function renderPaginacao(totalPages) {
    const btns = [];
    for (let i = 1; i <= totalPages; i++) {
      btns.push(`<button class="pag-btn btn btn--ghost btn--sm${i===_pagina?' pag-btn--active':''}" data-page="${i}">${i}</button>`);
    }
    return `<div style="display:flex;gap:6px;justify-content:center;margin-top:16px">${btns.join('')}</div>`;
  }

  function limparFiltros() {
    _filtros = { status: '', cliente: '', periodo: '' };
    _pagina  = 1;
    ['filtro-status','filtro-cliente','filtro-periodo'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    renderLista();
  }

  // ── Numeração (atômica: reserva + incrementa na abertura do form) ─────
  async function reservarNumero() {
    const cfg = await DB.get('config', 'numeracao_orcamento');
    const seq = cfg ? cfg.valor : 1;
    // Incrementa imediatamente ao reservar — evita race condition se o form
    // for aberto duas vezes antes de um salvar. Cancelar o form "pula" um número,
    // mas nunca gera conflito de constraint no índice único.
    await DB.put('config', { chave: 'numeracao_orcamento', valor: seq + 1 });
    return `ORC-${new Date().getFullYear()}-${String(seq).padStart(4,'0')}`;
  }

  // ── Formulário ────────────────────────────────
  async function abrirFormulario(orcExistente = null) {
    const [clientes, servicos] = await Promise.all([DB.getAll('clientes'), DB.getAll('servicos')]);
    const numero  = orcExistente ? orcExistente.numero : await reservarNumero();
    const isEdit  = !!orcExistente;

    const clienteOpts = clientes.map(c =>
      `<option value="${c.id}" ${orcExistente && orcExistente.cliente_id === c.id ? 'selected' : ''}>${esc(c.nome)}</option>`
    ).join('');

    const servicoOpts = servicos.map(s =>
      `<option value="${s.id}" data-preco="${s.preco_ideal}">${esc(s.nome)} (${UI.formatBRL(s.preco_ideal)})</option>`
    ).join('');

    const itensIniciais = orcExistente ? (orcExistente.itens || []) : [];

    const html = `
      <div class="form">
        <div class="form-grid">
          <div class="form-group">
            <label>Número</label>
            <input type="text" id="orc-numero" class="input" value="${esc(numero)}" readonly
              style="background:var(--offwhite);color:var(--text-muted);cursor:default">
          </div>
          <div class="form-group">
            <label>Status</label>
            <select id="orc-status" class="input">
              <option value="rascunho" ${!orcExistente||orcExistente.status==='rascunho'?'selected':''}>Rascunho</option>
              <option value="enviado"  ${orcExistente&&orcExistente.status==='enviado'?'selected':''}>Enviado</option>
              <option value="aprovado" ${orcExistente&&orcExistente.status==='aprovado'?'selected':''}>Aprovado</option>
              <option value="recusado" ${orcExistente&&orcExistente.status==='recusado'?'selected':''}>Recusado</option>
            </select>
          </div>
          <div class="form-group form-group--full">
            <label>Cliente *</label>
            <select id="orc-cliente" class="input">
              <option value="">Selecione um cliente...</option>
              ${clienteOpts}
            </select>
          </div>
          <div class="form-group">
            <label>Validade</label>
            <input type="date" id="orc-validade" class="input"
              value="${orcExistente ? orcExistente.validade || '' : dataValidade30dias()}">
          </div>
          <div class="form-group">
            <label>Condição de Pagamento</label>
            <input type="text" id="orc-pagamento" class="input"
              placeholder="Ex: 50% entrada + 50% na entrega"
              value="${orcExistente ? esc(orcExistente.condicao_pagamento || '') : ''}">
          </div>
        </div>

        <div style="margin-top:22px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <label style="font-size:12px;font-weight:700;font-family:var(--font-titulo);
              color:var(--text-secondary);letter-spacing:.05em;text-transform:uppercase">
              Itens do Orçamento
            </label>
            <button type="button" class="btn btn--ghost btn--sm" id="btn-add-item">+ Adicionar Item</button>
          </div>
          <div id="itens-container" style="display:flex;flex-direction:column;gap:10px"></div>
          <div id="itens-empty" style="display:${itensIniciais.length?'none':'block'};text-align:center;
            padding:20px;color:var(--text-muted);font-size:13px;background:var(--offwhite);
            border-radius:var(--r);border:1.5px dashed var(--grafite-border)">
            Nenhum item. Clique em "+ Adicionar Item".
          </div>
        </div>

        <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--grafite-border)">
          <div class="form-grid">
            <div class="form-group">
              <label>Desconto (R$)</label>
              <input type="number" id="orc-desconto" class="input" min="0" step="0.01"
                placeholder="0,00" value="${orcExistente ? orcExistente.desconto || 0 : 0}">
            </div>
            <div style="display:flex;flex-direction:column;gap:5px;justify-content:flex-end">
              <label style="font-size:12px;font-weight:700;font-family:var(--font-titulo);
                color:var(--text-secondary);letter-spacing:.02em;text-transform:uppercase">Total</label>
              <div id="orc-total-display"
                style="font-size:24px;font-weight:800;font-family:var(--font-titulo);
                color:var(--dourado);padding:6px 0;line-height:1">R$ 0,00</div>
            </div>
          </div>
        </div>

        <div class="form-group form-group--full" style="margin-top:10px">
          <label>Observações</label>
          <textarea id="orc-obs" class="input textarea"
            placeholder="Condições especiais, prazos, escopo...">${orcExistente ? esc(orcExistente.obs || '') : ''}</textarea>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn--ghost" id="btn-cancelar-orc">Cancelar</button>
          <button type="button" class="btn btn--primary" id="btn-salvar-orc">
            ${isEdit ? 'Salvar Alterações' : 'Criar Orçamento'}
          </button>
        </div>
      </div>

      <template id="tpl-item">
        <div class="orc-item">
          <div style="display:grid;grid-template-columns:1fr 80px 110px 36px;gap:10px;align-items:end">
            <div class="form-group" style="margin-bottom:0">
              <label>Serviço</label>
              <select class="input item-servico" style="font-size:12px">
                <option value="">Descrição personalizada...</option>
                ${servicoOpts}
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label>Qtd</label>
              <input type="number" class="input item-qtd" min="1" value="1">
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label>Valor Unit. (R$)</label>
              <input type="number" class="input item-valor" min="0" step="0.01" placeholder="0,00">
            </div>
            <button type="button" class="btn-icon btn-icon--danger item-remove"
              style="height:38px" title="Remover item">✕</button>
          </div>
          <div class="form-group" style="margin-top:8px;margin-bottom:0">
            <label>Descrição (deixe em branco para usar o nome do serviço)</label>
            <input type="text" class="input item-desc" placeholder="Descrição personalizada...">
          </div>
        </div>
      </template>
    `;

    UI.openModal(isEdit ? 'Editar Orçamento' : 'Novo Orçamento', html, { wide: true });

    const tpl            = document.getElementById('tpl-item');
    const itensContainer = document.getElementById('itens-container');
    const itensEmpty     = document.getElementById('itens-empty');
    let itens            = [];

    function calcularTotal() {
      const subtotal = itens.reduce((s, it) => {
        return s + (parseFloat(it.inputQtd.value)||0) * (parseFloat(it.inputValor.value)||0);
      }, 0);
      const desconto = parseFloat(document.getElementById('orc-desconto').value) || 0;
      const el = document.getElementById('orc-total-display');
      if (el) el.textContent = UI.formatBRL(Math.max(0, subtotal - desconto));
    }

    function adicionarItem(dados = null) {
      const clone = tpl.content.cloneNode(true);
      const div   = clone.querySelector('.orc-item');

      const inputServico = div.querySelector('.item-servico');
      const inputQtd     = div.querySelector('.item-qtd');
      const inputValor   = div.querySelector('.item-valor');
      const inputDesc    = div.querySelector('.item-desc');
      const btnRemove    = div.querySelector('.item-remove');

      if (dados) {
        if (dados.servico_id) inputServico.value = dados.servico_id;
        inputQtd.value   = dados.qtd || 1;
        inputValor.value = dados.valor_unit || '';
        inputDesc.value  = dados.descricao || '';
      }

      inputServico.addEventListener('change', () => {
        const opt = inputServico.options[inputServico.selectedIndex];
        if (opt && opt.dataset.preco) inputValor.value = opt.dataset.preco;
        calcularTotal();
      });
      inputQtd.addEventListener('input', calcularTotal);
      inputValor.addEventListener('input', calcularTotal);

      const ref = { div, inputServico, inputQtd, inputValor, inputDesc };

      btnRemove.addEventListener('click', () => {
        div.remove();
        const idx = itens.indexOf(ref);
        if (idx > -1) itens.splice(idx, 1);
        itensEmpty.style.display = itens.length ? 'none' : 'block';
        calcularTotal();
      });

      itens.push(ref);
      itensContainer.appendChild(div);
      itensEmpty.style.display = 'none';
      calcularTotal();
    }

    if (itensIniciais.length) itensIniciais.forEach(i => adicionarItem(i));

    document.getElementById('btn-add-item').addEventListener('click', () => adicionarItem());
    document.getElementById('orc-desconto').addEventListener('input', calcularTotal);
    document.getElementById('btn-cancelar-orc').addEventListener('click', () => UI.closeModal());

    document.getElementById('btn-salvar-orc').addEventListener('click', async () => {
      const clienteId = parseInt(document.getElementById('orc-cliente').value);
      if (!clienteId) { UI.showToast('Selecione um cliente!', 'warning'); return; }
      if (!itens.length) { UI.showToast('Adicione pelo menos um item!', 'warning'); return; }

      const itensData = itens.map(it => {
        const sId    = parseInt(it.inputServico.value) || null;
        const serv   = sId ? servicos.find(s => s.id === sId) : null;
        const qtd    = parseFloat(it.inputQtd.value)   || 1;
        const vUnit  = parseFloat(it.inputValor.value) || 0;
        return {
          servico_id:  sId,
          descricao:   it.inputDesc.value.trim() || (serv ? serv.nome : 'Item'),
          qtd,
          valor_unit:  vUnit,
        };
      });

      const desconto  = parseFloat(document.getElementById('orc-desconto').value) || 0;
      const subtotal  = itensData.reduce((s, i) => s + i.qtd * i.valor_unit, 0);
      const total     = Math.max(0, subtotal - desconto);

      const dados = {
        numero:             document.getElementById('orc-numero').value,
        cliente_id:         clienteId,
        itens:              itensData,
        desconto,
        total,
        validade:           document.getElementById('orc-validade').value,
        condicao_pagamento: document.getElementById('orc-pagamento').value.trim(),
        status:             document.getElementById('orc-status').value,
        obs:                document.getElementById('orc-obs').value.trim(),
        criado_em:          orcExistente ? orcExistente.criado_em : new Date().toISOString(),
        atualizado_em:      new Date().toISOString(),
      };

      try {
        if (isEdit) {
          dados.id = orcExistente.id;
          await DB.put('orcamentos', dados);
          UI.showToast('Orçamento atualizado!', 'success');
        } else {
          // Número já foi reservado e incrementado em reservarNumero()
          await DB.add('orcamentos', dados);
          UI.showToast('Orçamento criado!', 'success');
        }
        UI.closeModal();
        await recarregar();
      } catch (err) {
        UI.handleError(err, 'Erro ao salvar orçamento');
      }
    });
  }

  async function recarregar() {
    [_orcamentos, _clientes, _servicos] = await Promise.all([
      DB.getAll('orcamentos'),
      DB.getAll('clientes'),
      DB.getAll('servicos'),
    ]);
    _orcamentos.sort((a, b) => b.id - a.id);
    renderLista();
  }

  // ── Ações da lista ────────────────────────────
  async function editar(id) {
    const orc = _orcamentos.find(o => o.id === id) || await DB.get('orcamentos', id);
    if (!orc) return;
    await abrirFormulario(orc);
  }

  async function duplicar(id) {
    const orc = _orcamentos.find(o => o.id === id) || await DB.get('orcamentos', id);
    if (!orc) return;
    const numero = await proximoNumero();
    const novo = {
      ...orc,
      numero,
      status:       'rascunho',
      criado_em:    new Date().toISOString(),
      atualizado_em:new Date().toISOString(),
    };
    delete novo.id;
    await DB.add('orcamentos', novo);
    // Número já incrementado dentro de reservarNumero()
    UI.showToast('Orçamento duplicado!', 'success');
    await recarregar();
  }

  async function excluir(id) {
    const orc = _orcamentos.find(o => o.id === id);
    const ok  = await UI.showConfirm(
      'Excluir Orçamento',
      `Deseja excluir o orçamento <strong>${orc ? esc(orc.numero) : ''}</strong>? Esta ação não pode ser desfeita.`,
      'Excluir'
    );
    if (!ok) return;
    await DB.remove('orcamentos', id);
    UI.showToast('Orçamento excluído.', 'success');
    await recarregar();
  }

  // ── Visualização ──────────────────────────────
  async function visualizar(id) {
    const orc     = _orcamentos.find(o => o.id === id) || await DB.get('orcamentos', id);
    if (!orc) return;
    const cli     = _clientes.find(c => c.id === orc.cliente_id);
    const itens   = orc.itens || [];
    const subtotal = itens.reduce((s, i) => s + i.qtd * i.valor_unit, 0);

    const linhasItens = itens.map((item, i) => `
      <tr style="border-bottom:1px solid #eee">
        <td style="padding:9px 14px;font-size:13px;color:#888;text-align:center">${i+1}</td>
        <td style="padding:9px 14px;font-size:13px">${esc(item.descricao)}</td>
        <td style="padding:9px 14px;font-size:13px;text-align:center">${item.qtd}</td>
        <td style="padding:9px 14px;font-size:13px;text-align:right">${UI.formatBRL(item.valor_unit)}</td>
        <td style="padding:9px 14px;font-size:13px;text-align:right;font-weight:700">${UI.formatBRL(item.qtd*item.valor_unit)}</td>
      </tr>`).join('');

    const html = `
      <div id="orc-preview" style="font-family:var(--font-corpo);background:#fff;color:#1a1a1a">

        <!-- Cabeçalho da proposta -->
        <div style="display:flex;align-items:center;justify-content:space-between;
          padding-bottom:18px;border-bottom:3px solid #C5A04A;margin-bottom:22px">
          <div style="display:flex;align-items:center;gap:14px">
            <img src="assets/logo.png" alt="JOTEC" style="height:48px;width:auto">
            <div>
              <div style="font-family:var(--font-titulo);font-size:10px;font-weight:700;
                color:#888;letter-spacing:.1em;text-transform:uppercase">JOTEC Soluções</div>
              <div style="font-size:11px;color:#888;margin-top:2px">
                Engenharia · Segurança · Conformidade · Soluções
              </div>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-family:var(--font-titulo);font-size:20px;font-weight:800;color:#1a1a1a">
              ${esc(orc.numero)}
            </div>
            <div style="font-size:11px;color:#888;margin-top:2px">Emitido em ${UI.formatDate(orc.criado_em)}</div>
            <div style="margin-top:7px">${UI.statusBadge(orc.status, STATUS_MAP)}</div>
          </div>
        </div>

        <!-- Dados do cliente e detalhes -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:22px">
          <div style="background:#F8F6F2;border-radius:8px;padding:14px;border-left:3px solid #C5A04A">
            <div style="font-size:9px;font-family:var(--font-titulo);font-weight:700;
              color:#888;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">Cliente</div>
            <div style="font-weight:700;font-size:14px;margin-bottom:4px">${cli ? esc(cli.nome) : '—'}</div>
            ${cli?.cnpj_cpf   ? `<div style="font-size:11px;color:#666">CNPJ/CPF: ${esc(cli.cnpj_cpf)}</div>` : ''}
            ${cli?.telefone   ? `<div style="font-size:11px;color:#666">${UI.formatPhone(cli.telefone)}</div>` : ''}
            ${cli?.email      ? `<div style="font-size:11px;color:#666">${esc(cli.email)}</div>` : ''}
            ${cli?.cidade     ? `<div style="font-size:11px;color:#666">${esc(cli.cidade)}</div>` : ''}
          </div>
          <div style="background:#F8F6F2;border-radius:8px;padding:14px">
            <div style="font-size:9px;font-family:var(--font-titulo);font-weight:700;
              color:#888;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">Detalhes</div>
            <div style="font-size:12px;display:flex;flex-direction:column;gap:5px">
              <div style="display:flex;justify-content:space-between">
                <span style="color:#888">Validade:</span>
                <span style="font-weight:600">${UI.formatDate(orc.validade)}</span>
              </div>
              ${orc.condicao_pagamento ? `
              <div style="display:flex;justify-content:space-between">
                <span style="color:#888">Pagamento:</span>
                <span style="font-weight:600;text-align:right;max-width:60%">${esc(orc.condicao_pagamento)}</span>
              </div>` : ''}
            </div>
          </div>
        </div>

        <!-- Tabela de itens -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:18px;font-size:13px">
          <thead>
            <tr style="background:#1A1A1A;color:#F8F6F2">
              <th style="padding:9px 14px;font-family:var(--font-titulo);font-size:10px;
                font-weight:700;letter-spacing:.05em;text-align:center;width:36px">#</th>
              <th style="padding:9px 14px;font-family:var(--font-titulo);font-size:10px;
                font-weight:700;letter-spacing:.05em;text-align:left">Descrição</th>
              <th style="padding:9px 14px;font-family:var(--font-titulo);font-size:10px;
                font-weight:700;letter-spacing:.05em;text-align:center;width:52px">Qtd</th>
              <th style="padding:9px 14px;font-family:var(--font-titulo);font-size:10px;
                font-weight:700;letter-spacing:.05em;text-align:right">Valor Unit.</th>
              <th style="padding:9px 14px;font-family:var(--font-titulo);font-size:10px;
                font-weight:700;letter-spacing:.05em;text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${linhasItens}</tbody>
        </table>

        <!-- Totais -->
        <div style="display:flex;justify-content:flex-end;margin-bottom:18px">
          <div style="min-width:250px">
            <div style="display:flex;justify-content:space-between;padding:7px 0;
              border-bottom:1px solid #ddd;font-size:13px;color:#666">
              <span>Subtotal</span><span>${UI.formatBRL(subtotal)}</span>
            </div>
            ${orc.desconto>0 ? `
            <div style="display:flex;justify-content:space-between;padding:7px 0;
              border-bottom:1px solid #ddd;font-size:13px;color:#2E7D32">
              <span>Desconto</span><span>− ${UI.formatBRL(orc.desconto)}</span>
            </div>` : ''}
            <div style="display:flex;justify-content:space-between;padding:10px 0;
              font-family:var(--font-titulo);font-size:18px;font-weight:800;color:#C5A04A">
              <span>TOTAL</span><span>${UI.formatBRL(orc.total)}</span>
            </div>
          </div>
        </div>

        ${orc.obs ? `
        <div style="background:#F8F6F2;border-radius:8px;padding:14px;
          border-left:3px solid #ddd;margin-bottom:16px">
          <div style="font-size:9px;font-family:var(--font-titulo);font-weight:700;
            color:#888;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px">Observações</div>
          <div style="font-size:12px;color:#555;line-height:1.6">${esc(orc.obs)}</div>
        </div>` : ''}

        <!-- Rodapé -->
        <div style="border-top:1px solid #ddd;padding-top:12px;text-align:center">
          <div style="font-size:10px;color:#aaa">
            JOTEC Soluções — Engenharia Mecânica · CREA-SP · Região Metropolitana de Campinas
          </div>
        </div>
      </div>

      <!-- Botões de export -->
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:22px;
        padding-top:16px;border-top:1px solid var(--grafite-border);flex-wrap:wrap">
        <button class="btn btn--ghost btn--sm" id="btn-exp-pdf">⬇ PDF</button>
        <button class="btn btn--ghost btn--sm" id="btn-exp-xls">⬇ Excel</button>
        <button class="btn btn--ghost btn--sm" id="btn-exp-img">⬇ Imagem PNG</button>
        <button class="btn btn--secondary btn--sm" id="btn-editar-orc">✎ Editar</button>
      </div>
    `;

    UI.openModal(`Orçamento ${esc(orc.numero)}`, html, { wide: true });

    document.getElementById('btn-exp-pdf').addEventListener('click', () => exportarPDF(id));
    document.getElementById('btn-exp-xls').addEventListener('click', () => exportarExcel(id));
    document.getElementById('btn-exp-img').addEventListener('click', () => exportarImagem(id));
    document.getElementById('btn-editar-orc').addEventListener('click', () => {
      UI.closeModal();
      setTimeout(() => editar(id), 50);
    });
  }

  // ── Export PDF ────────────────────────────────
  async function exportarPDF(id) {
    const orc = _orcamentos.find(o => o.id === id) || await DB.get('orcamentos', id);
    if (!orc) return;
    const cli = _clientes.find(c => c.id === orc.cliente_id);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const PRETO   = [26, 26, 26];
    const DOURADO = [197, 160, 74];
    const OFFWHITE = [248, 246, 242];
    const GRAFITE  = [74, 74, 74];
    const CINZA    = [200, 200, 200];

    // Barra de cabeçalho
    doc.setFillColor(...PRETO);
    doc.rect(0, 0, 210, 30, 'F');

    // Logo (se disponível)
    try {
      const logoEl = document.querySelector('.sidebar-logo');
      if (logoEl && logoEl.complete && logoEl.naturalWidth > 0) {
        doc.addImage(logoEl, 'PNG', 13, 4, 18, 18);
      }
    } catch (_) {}

    // Nome da empresa
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...DOURADO);
    doc.text('JOTEC Soluções', 35, 12);
    doc.setFontSize(8);
    doc.setTextColor(...CINZA);
    doc.text('Engenharia · Segurança · Conformidade · Soluções', 35, 18);
    doc.text('CREA-SP · Região Metropolitana de Campinas', 35, 23);

    // Número do orçamento
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...OFFWHITE);
    doc.text(orc.numero, 197, 13, { align: 'right' });
    doc.setFontSize(8);
    doc.setTextColor(...CINZA);
    doc.text(`Emitido em: ${UI.formatDate(orc.criado_em)}`, 197, 19, { align: 'right' });

    // Badge de status
    const statusCores = {
      rascunho: [74,74,74], enviado: [21,101,192],
      aprovado: [46,125,50], recusado: [198,40,40],
    };
    const statusLabels = {
      rascunho:'RASCUNHO', enviado:'ENVIADO', aprovado:'APROVADO', recusado:'RECUSADO'
    };
    doc.setFillColor(...(statusCores[orc.status] || GRAFITE));
    doc.roundedRect(165, 22, 32, 5.5, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(statusLabels[orc.status] || orc.status.toUpperCase(), 181, 25.8, { align: 'center' });

    let y = 38;

    // Boxes cliente + detalhes
    doc.setFillColor(...OFFWHITE);
    doc.roundedRect(13, y, 86, 32, 2, 2, 'F');
    doc.roundedRect(111, y, 86, 32, 2, 2, 'F');
    doc.setFillColor(...DOURADO);
    doc.rect(13, y, 2, 32, 'F');
    doc.setFillColor(...GRAFITE);
    doc.rect(111, y, 2, 32, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...GRAFITE);
    doc.text('CLIENTE', 18, y + 6);
    doc.text('DETALHES', 116, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PRETO);
    const nomeLines = doc.splitTextToSize(cli ? cli.nome : '—', 78);
    doc.text(nomeLines[0], 18, y + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAFITE);
    let ly = y + 18;
    if (cli?.cnpj_cpf) { doc.text(`CNPJ/CPF: ${cli.cnpj_cpf}`, 18, ly); ly += 4.5; }
    if (cli?.telefone) { doc.text(UI.formatPhone(cli.telefone), 18, Math.min(ly, y+30)); ly += 4.5; }
    if (cli?.email)    { doc.text(cli.email, 18, Math.min(ly, y+30)); }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PRETO);
    let dy = y + 13;
    doc.text(`Validade: ${UI.formatDate(orc.validade)}`, 116, dy); dy += 5;
    if (orc.condicao_pagamento) {
      const pLines = doc.splitTextToSize(orc.condicao_pagamento, 78);
      doc.text('Pagamento:', 116, dy); dy += 4;
      pLines.slice(0,2).forEach(l => { doc.text(l, 116, Math.min(dy, y+30)); dy += 4; });
    }

    y += 38;

    // Tabela de itens
    doc.autoTable({
      startY: y,
      head: [['#', 'Descrição', 'Qtd', 'Valor Unit.', 'Total']],
      body: (orc.itens || []).map((item, i) => [
        String(i + 1),
        item.descricao,
        String(item.qtd),
        UI.formatBRL(item.valor_unit),
        UI.formatBRL(item.qtd * item.valor_unit),
      ]),
      headStyles: {
        fillColor: PRETO, textColor: OFFWHITE, fontStyle: 'bold', fontSize: 8,
      },
      bodyStyles: { fontSize: 9, textColor: PRETO },
      alternateRowStyles: { fillColor: [252, 251, 249] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 34, halign: 'right' },
        4: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: 13, right: 13 },
      theme: 'grid',
    });

    y = doc.lastAutoTable.finalY + 6;

    // Totais
    const subtotal = (orc.itens || []).reduce((s, i) => s + i.qtd * i.valor_unit, 0);
    const totalRows = [['Subtotal', UI.formatBRL(subtotal)]];
    if (orc.desconto > 0) totalRows.push(['Desconto', `− ${UI.formatBRL(orc.desconto)}`]);
    totalRows.push(['TOTAL', UI.formatBRL(orc.total)]);

    doc.autoTable({
      startY: y,
      body: totalRows,
      bodyStyles: { fontSize: 9, textColor: PRETO },
      didParseCell: data => {
        if (data.row.index === totalRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize  = 11;
          data.cell.styles.textColor = DOURADO;
        }
        if (data.column.index === 0) data.cell.styles.textColor = GRAFITE;
        data.cell.styles.halign = 'right';
      },
      margin: { left: 110, right: 13 },
      theme: 'plain',
    });

    y = doc.lastAutoTable.finalY + 8;

    // Observações
    if (orc.obs) {
      const obsLines = doc.splitTextToSize(orc.obs, 178);
      const obsH = obsLines.length * 4.5 + 14;
      doc.setFillColor(...OFFWHITE);
      doc.roundedRect(13, y, 184, obsH, 2, 2, 'F');
      doc.setFillColor(...GRAFITE);
      doc.rect(13, y, 2, obsH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...GRAFITE);
      doc.text('OBSERVAÇÕES', 18, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      obsLines.forEach((l, i) => doc.text(l, 18, y + 11 + i * 4.5));
      y += obsH + 6;
    }

    // Rodapé
    const pH = doc.internal.pageSize.getHeight();
    doc.setFillColor(...PRETO);
    doc.rect(0, pH - 13, 210, 13, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...CINZA);
    doc.text(
      'JOTEC Soluções — Engenharia Mecânica · CREA-SP · Região Metropolitana de Campinas',
      105, pH - 5, { align: 'center' }
    );

    doc.save(`${orc.numero}.pdf`);
    UI.showToast('PDF gerado!', 'success');
  }

  // ── Export Excel ──────────────────────────────
  async function exportarExcel(id) {
    const orc = _orcamentos.find(o => o.id === id) || await DB.get('orcamentos', id);
    if (!orc) return;
    const cli = _clientes.find(c => c.id === orc.cliente_id);

    const wb  = XLSX.utils.book_new();
    const subtotal = (orc.itens||[]).reduce((s,i) => s + i.qtd*i.valor_unit, 0);

    const dados = [
      ['JOTEC Soluções — Orçamento'],
      [],
      ['Número',    orc.numero],
      ['Cliente',   cli ? cli.nome : '—'],
      ['Emitido',   UI.formatDate(orc.criado_em)],
      ['Validade',  UI.formatDate(orc.validade)],
      ['Status',    orc.status.charAt(0).toUpperCase() + orc.status.slice(1)],
      ['Pagamento', orc.condicao_pagamento || ''],
      [],
      ['#', 'Descrição', 'Qtd', 'Valor Unitário (R$)', 'Total (R$)'],
    ];

    (orc.itens||[]).forEach((item, i) => {
      dados.push([i+1, item.descricao, item.qtd, item.valor_unit, item.qtd * item.valor_unit]);
    });

    dados.push([]);
    dados.push(['', '', '', 'Subtotal', subtotal]);
    if (orc.desconto > 0) dados.push(['', '', '', 'Desconto', -orc.desconto]);
    dados.push(['', '', '', 'TOTAL', orc.total]);

    if (orc.obs) { dados.push([]); dados.push(['Observações', orc.obs]); }

    const ws = XLSX.utils.aoa_to_sheet(dados);
    ws['!cols'] = [{ wch: 4 }, { wch: 50 }, { wch: 6 }, { wch: 20 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Orçamento');
    XLSX.writeFile(wb, `${orc.numero}.xlsx`);
    UI.showToast('Excel gerado!', 'success');
  }

  // ── Export Imagem ─────────────────────────────
  async function exportarImagem(id) {
    const el = document.getElementById('orc-preview');
    if (!el) { UI.showToast('Abra a visualização antes de exportar imagem.', 'warning'); return; }
    const orc = _orcamentos.find(o => o.id === id);
    UI.showToast('Gerando imagem…', 'info', 2500);
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const a = document.createElement('a');
      a.href     = canvas.toDataURL('image/png');
      a.download = `${orc ? orc.numero : 'orcamento'}.png`;
      a.click();
      UI.showToast('Imagem salva!', 'success');
    } catch (e) {
      UI.showToast('Erro ao gerar imagem: ' + e.message, 'error');
    }
  }

  // ── Utilitários ───────────────────────────────
  function dataValidade30dias() {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  }

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { render, visualizar, editar, duplicar, excluir, exportarPDF, exportarExcel, exportarImagem };
})();
