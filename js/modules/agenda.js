const Agenda = (() => {
  let _compromissos = [];
  let _clientes = [];
  let _visao = 'mes';
  let _dataCursor = dayjs();
  let _container = null;

  const TIPO = {
    visita:  { label: 'Visita',  cor: 'visita'  },
    reuniao: { label: 'Reunião', cor: 'reuniao' },
    entrega: { label: 'Entrega', cor: 'entrega' },
  };

  const STATUS = {
    pendente:  { label: 'Pendente',  cls: 'badge--dourado'  },
    concluido: { label: 'Concluído', cls: 'badge--verde'    },
    cancelado: { label: 'Cancelado', cls: 'badge--default'  },
  };

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Formatadores com locale pt-BR nativo do navegador
  function _fmtMesAno(djsObj) {
    return new Date(djsObj.year(), djsObj.month(), 1)
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }
  function _fmtDiaSemana(djsObj) {
    return new Date(djsObj.year(), djsObj.month(), djsObj.date())
      .toLocaleDateString('pt-BR', { weekday: 'short' });
  }
  function _fmtDataCompleta(djsObj) {
    return new Date(djsObj.year(), djsObj.month(), djsObj.date())
      .toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function _fmtHora(iso) {
    const d = dayjs(iso);
    return `${String(d.hour()).padStart(2,'0')}:${String(d.minute()).padStart(2,'0')}`;
  }
  function _fmtDataGrupo(djsObj) {
    return new Date(djsObj.year(), djsObj.month(), djsObj.date())
      .toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  // ── RENDER PRINCIPAL ─────────────────────────
  async function render(container) {
    _container = container;
    [_compromissos, _clientes] = await Promise.all([
      DB.getAll('compromissos'),
      DB.getAll('clientes'),
    ]);
    _drawPage();
  }

  function _drawPage() {
    _container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Agenda</h1>
        <button class="btn btn--primary" id="btn-novo-comp">+ Novo Compromisso</button>
      </div>

      <div class="agenda-toolbar">
        <div class="agenda-visoes">
          <button class="btn btn--sm ${_visao==='mes'    ?'btn--primary':'btn--ghost'}" data-visao="mes">Mês</button>
          <button class="btn btn--sm ${_visao==='semana' ?'btn--primary':'btn--ghost'}" data-visao="semana">Semana</button>
          <button class="btn btn--sm ${_visao==='dia'    ?'btn--primary':'btn--ghost'}" data-visao="dia">Dia</button>
          <button class="btn btn--sm ${_visao==='cards'  ?'btn--primary':'btn--ghost'}" data-visao="cards">Lista</button>
        </div>
        <div class="agenda-nav">
          <button class="btn btn--ghost btn--sm" id="btn-nav-prev">‹</button>
          <span class="agenda-titulo-periodo" id="titulo-periodo">${_tituloPeriodo()}</span>
          <button class="btn btn--ghost btn--sm" id="btn-nav-next">›</button>
          <button class="btn btn--ghost btn--sm" id="btn-nav-hoje">Hoje</button>
        </div>
      </div>

      <div class="agenda-corpo" id="agenda-corpo">
        ${_renderVisao()}
      </div>`;

    document.getElementById('btn-novo-comp').addEventListener('click', () => abrirModal());
    document.querySelectorAll('[data-visao]').forEach(btn =>
      btn.addEventListener('click', () => { _visao = btn.dataset.visao; _drawPage(); })
    );
    document.getElementById('btn-nav-prev').addEventListener('click', _navPrev);
    document.getElementById('btn-nav-next').addEventListener('click', _navNext);
    document.getElementById('btn-nav-hoje').addEventListener('click', () => {
      _dataCursor = dayjs(); _drawPage();
    });

    // Delegação para todos os botões de ação no corpo da agenda
    document.getElementById('agenda-corpo').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id  = parseInt(btn.dataset.id) || 0;
      const dat = btn.dataset.data;
      switch (btn.dataset.action) {
        case 'editar':   _editar(id);   break;
        case 'concluir': _concluir(id); break;
        case 'excluir':  _excluir(id);  break;
        case 'novo':     _novoNaData(dat !== undefined ? dat : ''); break;
      }
    });
  }

  function _tituloPeriodo() {
    if (_visao === 'mes') return _fmtMesAno(_dataCursor);
    if (_visao === 'semana') {
      const ini = _dataCursor.startOf('week');
      const fim = _dataCursor.endOf('week');
      if (ini.month() === fim.month())
        return `${ini.date()}–${fim.date()} de ${_fmtMesAno(ini)}`;
      return `${ini.date()} ${new Date(ini.year(),ini.month(),ini.date()).toLocaleDateString('pt-BR',{month:'short'})} – ${fim.date()} ${new Date(fim.year(),fim.month(),fim.date()).toLocaleDateString('pt-BR',{month:'short', year:'numeric'})}`;
    }
    if (_visao === 'dia') return _fmtDataCompleta(_dataCursor);
    return 'Todos os compromissos';
  }

  function _navPrev() {
    if (_visao === 'mes')    _dataCursor = _dataCursor.subtract(1,'month');
    else if (_visao === 'semana') _dataCursor = _dataCursor.subtract(1,'week');
    else if (_visao === 'dia')    _dataCursor = _dataCursor.subtract(1,'day');
    _drawPage();
  }
  function _navNext() {
    if (_visao === 'mes')    _dataCursor = _dataCursor.add(1,'month');
    else if (_visao === 'semana') _dataCursor = _dataCursor.add(1,'week');
    else if (_visao === 'dia')    _dataCursor = _dataCursor.add(1,'day');
    _drawPage();
  }

  function _renderVisao() {
    if (_visao === 'mes')    return _renderMes();
    if (_visao === 'semana') return _renderSemana();
    if (_visao === 'dia')    return _renderDia();
    return _renderCards();
  }

  // ── VISÃO MÊS ────────────────────────────────
  function _renderMes() {
    const hoje = dayjs();
    const iniMes = _dataCursor.startOf('month');
    const fimMes = _dataCursor.endOf('month');
    let cursor = iniMes.startOf('week');
    const limFim = fimMes.endOf('week');

    const nomesDS = Array.from({length:7}, (_,i) =>
      new Date(2023, 0, i+1).toLocaleDateString('pt-BR', {weekday:'short'})
    );

    let html = `<div class="cal-mes">
      <div class="cal-cabecalho">
        ${nomesDS.map(d => `<div class="cal-dia-nome">${d}</div>`).join('')}
      </div>
      <div class="cal-grid">`;

    while (cursor.isBefore(limFim) || cursor.isSame(limFim, 'day')) {
      const dataStr = `${cursor.year()}-${String(cursor.month()+1).padStart(2,'0')}-${String(cursor.date()).padStart(2,'0')}`;
      const ehHoje = cursor.isSame(hoje, 'day');
      const foraDoMes = cursor.month() !== _dataCursor.month();
      const eventos = _compromissos.filter(c => {
        const d = dayjs(c.inicio);
        const ds = `${d.year()}-${String(d.month()+1).padStart(2,'0')}-${String(d.date()).padStart(2,'0')}`;
        return ds === dataStr;
      });

      html += `<div class="cal-dia ${ehHoje?'cal-dia--hoje':''} ${foraDoMes?'cal-dia--fora':''}" data-data="${dataStr}">
        <div class="cal-dia-num">${cursor.date()}</div>
        <div class="cal-eventos-mini">
          ${eventos.slice(0,3).map(e => `
            <div class="cal-evento cal-evento--${esc(e.tipo||'visita')}" data-action="editar" data-id="${e.id}" title="${esc(e.titulo)}" style="cursor:pointer">
              ${esc(e.titulo)}
            </div>`).join('')}
          ${eventos.length > 3 ? `<div class="cal-mais">+${eventos.length-3} mais</div>` : ''}
        </div>
      </div>`;
      cursor = cursor.add(1,'day');
    }

    html += `</div></div>`;

    setTimeout(() => {
      document.querySelectorAll('.cal-dia').forEach(el => {
        el.addEventListener('click', (e) => {
          if (e.target.closest('.cal-evento')) return;
          abrirModal(null, el.dataset.data);
        });
      });
    }, 0);

    return html;
  }

  // ── VISÃO SEMANA ──────────────────────────────
  function _renderSemana() {
    const hoje = dayjs();
    const inicio = _dataCursor.startOf('week');
    const dias = Array.from({length:7}, (_,i) => inicio.add(i,'day'));

    let html = `<div class="cal-semana">
      <div class="cal-semana-header">
        ${dias.map(d => `
          <div class="cal-semana-diacol ${d.isSame(hoje,'day')?'cal-semana-diacol--hoje':''}">
            <div class="cal-semana-diasem">${_fmtDiaSemana(d)}</div>
            <div class="cal-semana-dianum ${d.isSame(hoje,'day')?'cal-semana-dianum--hoje':''}">${d.date()}</div>
          </div>`).join('')}
      </div>
      <div class="cal-semana-corpo">`;

    dias.forEach(d => {
      const dataStr = `${d.year()}-${String(d.month()+1).padStart(2,'0')}-${String(d.date()).padStart(2,'0')}`;
      const eventos = _compromissos
        .filter(c => {
          const cd = dayjs(c.inicio);
          const ds = `${cd.year()}-${String(cd.month()+1).padStart(2,'0')}-${String(cd.date()).padStart(2,'0')}`;
          return ds === dataStr;
        })
        .sort((a,b) => new Date(a.inicio)-new Date(b.inicio));

      html += `<div class="cal-semana-col ${d.isSame(hoje,'day')?'cal-semana-col--hoje':''}" data-data="${dataStr}">
        ${eventos.length === 0
          ? '<div class="cal-semana-vazio">—</div>'
          : eventos.map(e => `
            <div class="cal-evento cal-evento--${esc(e.tipo||'visita')}" data-action="editar" data-id="${e.id}" title="${esc(e.titulo)}" style="cursor:pointer">
              <span class="cal-evento-hora">${_fmtHora(e.inicio)}</span>
              ${esc(e.titulo)}
            </div>`).join('')}
      </div>`;
    });

    html += `</div></div>`;

    setTimeout(() => {
      document.querySelectorAll('.cal-semana-col').forEach(el => {
        el.addEventListener('click', (e) => {
          if (e.target.closest('.cal-evento')) return;
          abrirModal(null, el.dataset.data);
        });
      });
    }, 0);

    return html;
  }

  // ── VISÃO DIA ─────────────────────────────────
  function _renderDia() {
    const dataStr = `${_dataCursor.year()}-${String(_dataCursor.month()+1).padStart(2,'0')}-${String(_dataCursor.date()).padStart(2,'0')}`;
    const eventos = _compromissos
      .filter(c => {
        const d = dayjs(c.inicio);
        const ds = `${d.year()}-${String(d.month()+1).padStart(2,'0')}-${String(d.date()).padStart(2,'0')}`;
        return ds === dataStr;
      })
      .sort((a,b) => new Date(a.inicio)-new Date(b.inicio));

    if (!eventos.length) {
      return `<div class="agenda-vazio">
        <div class="agenda-vazio-icon">◻</div>
        <p>Nenhum compromisso neste dia.</p>
        <button class="btn btn--primary" data-action="novo" data-data="${dataStr}">+ Agendar compromisso</button>
      </div>`;
    }
    return `<div class="agenda-lista">${eventos.map(e => _renderEventoCard(e)).join('')}</div>`;
  }

  // ── VISÃO CARDS (LISTA) ───────────────────────
  function _renderCards() {
    const hojeStr = `${dayjs().year()}-${String(dayjs().month()+1).padStart(2,'0')}-${String(dayjs().date()).padStart(2,'0')}`;
    const ordenados = [..._compromissos].sort((a,b) => new Date(a.inicio)-new Date(b.inicio));

    if (!ordenados.length) {
      return `<div class="agenda-vazio">
        <div class="agenda-vazio-icon">◻</div>
        <p>Nenhum compromisso cadastrado.</p>
        <button class="btn btn--primary" data-action="novo" data-data="">+ Criar primeiro compromisso</button>
      </div>`;
    }

    const grupos = {};
    for (const e of ordenados) {
      const d = dayjs(e.inicio);
      const k = `${d.year()}-${String(d.month()+1).padStart(2,'0')}-${String(d.date()).padStart(2,'0')}`;
      if (!grupos[k]) grupos[k] = [];
      grupos[k].push(e);
    }

    let html = '<div class="agenda-lista">';
    for (const [data, events] of Object.entries(grupos)) {
      const d = dayjs(data + 'T12:00');
      const isHoje = data === hojeStr;
      html += `<div class="agenda-grupo">
        <div class="agenda-grupo-titulo ${isHoje?'agenda-grupo-titulo--hoje':''}">
          ${_fmtDataGrupo(d)}${isHoje ? ' — <strong>Hoje</strong>' : ''}
        </div>
        ${events.map(e => _renderEventoCard(e)).join('')}
      </div>`;
    }
    html += '</div>';
    return html;
  }

  function _renderEventoCard(e) {
    const cli = _clientes.find(c => c.id === e.cliente_id);
    const tipo = TIPO[e.tipo] || TIPO.visita;
    const hora = _fmtHora(e.inicio);
    const horaFim = e.fim ? ' – ' + _fmtHora(e.fim) : '';
    return `<div class="agenda-card agenda-card--${esc(e.tipo||'visita')} ${e.status==='cancelado'?'agenda-card--cancelado':''}">
      <div class="agenda-card-tipo-bar"></div>
      <div class="agenda-card-body">
        <div class="agenda-card-top">
          <div class="agenda-card-info">
            <div class="agenda-card-titulo">${esc(e.titulo)}</div>
            <div class="agenda-card-meta">
              <span class="agenda-hora">⏰ ${hora}${horaFim}</span>
              ${cli ? `<span class="agenda-cliente">· ${esc(cli.nome)}</span>` : ''}
              ${e.local ? `<span class="agenda-local">· 📍 ${esc(e.local)}</span>` : ''}
            </div>
          </div>
          <div class="agenda-card-badges">
            <span class="badge badge-tipo--${esc(e.tipo||'visita')}">${tipo.label}</span>
            ${UI.statusBadge(e.status||'pendente', STATUS)}
          </div>
        </div>
        ${e.descricao ? `<div class="agenda-card-desc">${esc(e.descricao)}</div>` : ''}
        <div class="agenda-card-actions">
          <button class="btn btn--ghost btn--sm" data-action="editar" data-id="${e.id}" aria-label="Editar compromisso">Editar</button>
          ${e.status !== 'concluido' ? `<button class="btn btn--ghost btn--sm" data-action="concluir" data-id="${e.id}" aria-label="Concluir compromisso">✓ Concluído</button>` : ''}
          <button class="btn btn--ghost btn--sm text-danger" data-action="excluir" data-id="${e.id}" aria-label="Excluir compromisso">Excluir</button>
        </div>
      </div>
    </div>`;
  }

  // ── MODAL CRUD ────────────────────────────────
  async function abrirModal(id, dataPreset) {
    let dados = id ? await DB.get('compromissos', id) : null;
    const dataDefault = dataPreset
      ? `${dataPreset}T09:00`
      : dayjs().format('YYYY-MM-DDTHH:mm');

    const optsClientes = _clientes.map(c =>
      `<option value="${c.id}" ${dados?.cliente_id === c.id ? 'selected' : ''}>${esc(c.nome)}</option>`
    ).join('');

    const html = `
      <form id="form-comp" class="form">
        <div class="form-grid">
          <div class="form-group form-group--full">
            <label class="form-label">Título *</label>
            <input class="input" name="titulo" required value="${esc(dados?.titulo||'')}" placeholder="Ex: Visita PMOC — Condomínio X">
          </div>
          <div class="form-group">
            <label class="form-label">Tipo *</label>
            <select class="input" name="tipo">
              <option value="visita"  ${(!dados||dados.tipo==='visita')  ?'selected':''}>Visita</option>
              <option value="reuniao" ${dados?.tipo==='reuniao'?'selected':''}>Reunião</option>
              <option value="entrega" ${dados?.tipo==='entrega'?'selected':''}>Entrega</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Cliente</label>
            <select class="input" name="cliente_id">
              <option value="">— Sem cliente —</option>
              ${optsClientes}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Início *</label>
            <input class="input" type="datetime-local" name="inicio" required value="${dados?.inicio ? dados.inicio.slice(0,16) : dataDefault}">
          </div>
          <div class="form-group">
            <label class="form-label">Fim</label>
            <input class="input" type="datetime-local" name="fim" value="${dados?.fim ? dados.fim.slice(0,16) : ''}">
          </div>
          <div class="form-group form-group--full">
            <label class="form-label">Local</label>
            <input class="input" name="local" value="${esc(dados?.local||'')}" placeholder="Endereço ou link da reunião">
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="input" name="status">
              <option value="pendente"  ${(!dados||dados.status==='pendente')  ?'selected':''}>Pendente</option>
              <option value="concluido" ${dados?.status==='concluido'?'selected':''}>Concluído</option>
              <option value="cancelado" ${dados?.status==='cancelado'?'selected':''}>Cancelado</option>
            </select>
          </div>
          <div class="form-group form-group--full">
            <label class="form-label">Descrição / Observações</label>
            <textarea class="input" name="descricao" rows="3" placeholder="Checklist, itens a verificar, observações...">${esc(dados?.descricao||'')}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          ${dados ? `<button type="button" class="btn btn--danger btn--sm" id="btn-excluir-comp">Excluir</button>` : ''}
          <button type="button" class="btn btn--ghost" id="btn-cancelar-comp">Cancelar</button>
          <button type="submit" class="btn btn--primary">${dados ? 'Salvar alterações' : 'Criar compromisso'}</button>
        </div>
      </form>`;

    UI.openModal(dados ? 'Editar Compromisso' : 'Novo Compromisso', html);

    if (dados) {
      document.getElementById('btn-excluir-comp')?.addEventListener('click', () => _excluir(dados.id));
    }
    document.getElementById('btn-cancelar-comp')?.addEventListener('click', () => UI.closeModal());

    document.getElementById('form-comp').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        const fd = new FormData(e.target);
        const obj = {
          titulo:     fd.get('titulo').trim(),
          tipo:       fd.get('tipo'),
          cliente_id: Number(fd.get('cliente_id')) || null,
          inicio:     fd.get('inicio'),
          fim:        fd.get('fim') || null,
          local:      fd.get('local').trim() || null,
          status:     fd.get('status'),
          descricao:  fd.get('descricao').trim() || null,
        };
        if (dados?.id) {
          obj.id = dados.id;
          obj.criado_em = dados.criado_em;
          await DB.put('compromissos', obj);
          UI.showToast('Compromisso atualizado.', 'success');
        } else {
          obj.criado_em = new Date().toISOString();
          await DB.add('compromissos', obj);
          UI.showToast('Compromisso criado!', 'success');
        }
        UI.closeModal();
        await render(_container);
      } catch (err) {
        UI.handleError(err, 'Erro ao salvar compromisso');
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  async function _editar(id)   { await abrirModal(id); }

  async function _excluir(id) {
    const ok = await UI.showConfirm('Excluir compromisso', 'Tem certeza que deseja excluir este compromisso?', 'Excluir');
    if (!ok) return;
    await DB.remove('compromissos', id);
    UI.showToast('Compromisso excluído.', 'success');
    UI.closeModal();
    await render(_container);
  }

  async function _concluir(id) {
    const comp = await DB.get('compromissos', id);
    if (!comp) return;
    comp.status = 'concluido';
    await DB.put('compromissos', comp);
    UI.showToast('Compromisso concluído!', 'success');
    await render(_container);
  }

  function _novoNaData(data) { abrirModal(null, data || undefined); }

  // ── ALERTA DO DIA (chamado no init do app) ───
  async function checkAlertaHoje() {
    const todos = await DB.getAll('compromissos');
    const hoje = dayjs();
    const hojeStr = `${hoje.year()}-${String(hoje.month()+1).padStart(2,'0')}-${String(hoje.date()).padStart(2,'0')}`;
    const hojeComp = todos.filter(c => {
      const d = dayjs(c.inicio);
      const ds = `${d.year()}-${String(d.month()+1).padStart(2,'0')}-${String(d.date()).padStart(2,'0')}`;
      return ds === hojeStr && c.status !== 'cancelado';
    });
    if (!hojeComp.length) return;
    const nomes = hojeComp.slice(0,2).map(c => c.titulo).join(', ');
    const extra = hojeComp.length > 2 ? ` e mais ${hojeComp.length - 2}` : '';
    setTimeout(() => {
      UI.showToast(
        `📅 ${hojeComp.length} compromisso${hojeComp.length > 1 ? 's' : ''} hoje: ${nomes}${extra}`,
        'info',
        9000
      );
    }, 2200);
  }

  return { render, checkAlertaHoje, _editar, _excluir, _concluir, _novoNaData };
})();
