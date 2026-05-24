const Dashboard = (() => {
  let _chart = null;

  const STATUS_CLIENTE = {
    ativo:     { label: 'Ativo',     cls: 'badge--verde' },
    prospecto: { label: 'Prospecto', cls: 'badge--azul' },
    lead:      { label: 'Lead',      cls: 'badge--dourado' },
    inativo:   { label: 'Inativo',   cls: 'badge--default' },
  };

  async function render(container) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Carregando dashboard...</div>';

    const [clientes, servicos, compromissos, lancamentos, leads] = await Promise.all([
      DB.getAll('clientes'),
      DB.getAll('servicos'),
      DB.getAll('compromissos'),
      DB.getAll('lancamentos'),
      DB.getAll('prospeccao_cache'),
    ]);

    const agora = new Date();
    const em7d  = new Date(agora.getTime() + 7 * 86400000);

    const hoje           = new Date().toISOString().slice(0, 10);
    const prospAtrasados = leads.filter(l => l.proximo_followup && l.proximo_followup < hoje).length;
    const prospHoje      = leads.filter(l => l.proximo_followup === hoje).length;
    const temAlertaProsp = prospAtrasados > 0;

    const clientesAtivos = clientes.filter(c => c.status === 'ativo').length;
    const proximosComp   = compromissos.filter(c => {
      const dt = new Date(c.inicio);
      return dt >= agora && dt <= em7d && c.status !== 'cancelado';
    }).length;
    const aReceber = lancamentos
      .filter(l => l.status === 'pendente' || l.status === 'atrasado')
      .reduce((s, l) => s + (Number(l.valor) || 0), 0);
    const atrasados = lancamentos.filter(l => l.status === 'atrasado').length;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Visão geral — JOTEC Soluções · Engenharia · Segurança · Conformidade</p>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card" data-route="clientes" style="cursor:pointer" title="Ver clientes">
          <div class="kpi-icon kpi-icon--dourado">◉</div>
          <div class="kpi-content">
            <div class="kpi-value">${clientes.length}</div>
            <div class="kpi-label">Clientes</div>
            <div class="kpi-sub">${clientesAtivos} ativo${clientesAtivos !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <div class="kpi-card" data-route="servicos" style="cursor:pointer" title="Ver serviços">
          <div class="kpi-icon kpi-icon--preto">◎</div>
          <div class="kpi-content">
            <div class="kpi-value">${servicos.length}</div>
            <div class="kpi-label">Serviços</div>
            <div class="kpi-sub">${servicos.filter(s => s.recorrencia === 'mensal').length} recorrente${servicos.filter(s => s.recorrencia === 'mensal').length !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <div class="kpi-card" data-route="agenda" style="cursor:pointer" title="Ver agenda">
          <div class="kpi-icon kpi-icon--azul">◻</div>
          <div class="kpi-content">
            <div class="kpi-value">${proximosComp}</div>
            <div class="kpi-label">Compromissos (7 dias)</div>
            <div class="kpi-sub">${compromissos.filter(c => c.status === 'pendente').length} pendente${compromissos.filter(c=>c.status==='pendente').length!==1?'s':''}</div>
          </div>
        </div>

        <div class="kpi-card ${atrasados > 0 ? 'kpi-card--alert' : ''}" data-route="financeiro" style="cursor:pointer" title="Ver financeiro">
          <div class="kpi-icon kpi-icon--verde">◈</div>
          <div class="kpi-content">
            <div class="kpi-value">${UI.formatBRL(aReceber)}</div>
            <div class="kpi-label">A receber</div>
            <div class="kpi-sub ${atrasados > 0 ? 'text-danger' : ''}">
              ${atrasados > 0 ? `${atrasados} em atraso` : 'Tudo em dia'}
            </div>
          </div>
        </div>

        <div class="kpi-card ${temAlertaProsp ? 'kpi-card--alert' : ''}" data-route="prospeccao" style="cursor:pointer" title="Ver prospecção">
          <div class="kpi-icon" style="background:rgba(251,188,4,0.15);font-size:20px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:8px;flex-shrink:0">🎯</div>
          <div class="kpi-content">
            <div class="kpi-value">${leads.length}</div>
            <div class="kpi-label">Prospecção</div>
            <div class="kpi-sub ${prospAtrasados > 0 ? 'text-danger' : ''}">
              ${prospAtrasados > 0
                ? `${prospAtrasados} follow-up${prospAtrasados !== 1 ? 's' : ''} atrasado${prospAtrasados !== 1 ? 's' : ''}`
                : prospHoje > 0
                  ? `${prospHoje} follow-up${prospHoje !== 1 ? 's' : ''} hoje`
                  : leads.length > 0 ? 'Tudo em dia' : 'Sem leads ainda'}
            </div>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <h3>Clientes recentes</h3>
            <a href="#/clientes" class="link-ver-todos">Ver todos →</a>
          </div>
          <div class="card-body" style="padding:0">
            ${renderUltimosClientes(clientes)}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>Status dos clientes</h3>
          </div>
          <div class="card-body" style="display:flex;align-items:center;justify-content:center;min-height:200px">
            <canvas id="chart-clientes" style="max-height:200px"></canvas>
          </div>
        </div>
      </div>

      <div class="dashboard-grid-bottom">
        <div class="card">
          <div class="card-header">
            <h3>Próximos compromissos (7 dias)</h3>
            <a href="#/agenda" class="link-ver-todos">Ver agenda →</a>
          </div>
          <div class="card-body">
            ${renderProximosComp(compromissos, clientes, agora, em7d)}
          </div>
        </div>
      </div>
    `;

    // Delegação para cards/linhas com data-route
    container.addEventListener('click', (e) => {
      const el = e.target.closest('[data-route]');
      if (!el) return;
      e.preventDefault();
      location.hash = '#/' + el.dataset.route;
    });

    renderChart(clientes);
  }

  function renderUltimosClientes(clientes) {
    if (!clientes.length) {
      return `<div class="empty-state-sm">
        <p>Nenhum cliente cadastrado ainda.</p>
        <a href="#/clientes" class="btn btn--sm btn--primary">+ Cadastrar primeiro cliente</a>
      </div>`;
    }

    const sorted = [...clientes]
      .sort((a, b) => new Date(b.criado_em || 0) - new Date(a.criado_em || 0))
      .slice(0, 6);

    return `<table class="table-mini">
      <thead><tr><th>Nome</th><th>Cidade</th><th>Status</th></tr></thead>
      <tbody>
        ${sorted.map(c => `
          <tr style="cursor:pointer" data-route="clientes">
            <td><strong>${UI.esc(c.nome)}</strong>${c.email ? `<div class="td-sub">${UI.esc(c.email)}</div>` : ''}</td>
            <td>${UI.esc(c.cidade || '—')}</td>
            <td>${UI.statusBadge(c.status || 'lead', STATUS_CLIENTE)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
  }

  function renderChart(clientes) {
    const ctx = document.getElementById('chart-clientes');
    if (!ctx) return;
    if (_chart) { _chart.destroy(); _chart = null; }

    if (!clientes.length) {
      ctx.parentElement.innerHTML = '<div class="empty-state-sm"><p>Sem dados ainda.</p></div>';
      return;
    }

    const counts = {
      Ativo:     clientes.filter(c => c.status === 'ativo').length,
      Prospecto: clientes.filter(c => c.status === 'prospecto').length,
      Lead:      clientes.filter(c => c.status === 'lead' || !c.status).length,
      Inativo:   clientes.filter(c => c.status === 'inativo').length,
    };

    _chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(counts),
        datasets: [{
          data: Object.values(counts),
          backgroundColor: ['#2E7D32', '#1565C0', '#C5A04A', '#888888'],
          borderWidth: 0,
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Inter, sans-serif', size: 12 }, padding: 14, boxWidth: 12 },
          },
        },
      },
    });
  }

  function renderProximosComp(compromissos, clientes, agora, em7d) {
    const proximos = compromissos
      .filter(c => {
        const dt = new Date(c.inicio);
        return dt >= agora && dt <= em7d && c.status !== 'cancelado';
      })
      .sort((a,b) => new Date(a.inicio) - new Date(b.inicio))
      .slice(0, 6);

    if (!proximos.length) {
      return `<div class="empty-state-sm">
        <p>Nenhum compromisso nos próximos 7 dias.</p>
        <a href="#/agenda" class="btn btn--sm btn--primary">+ Agendar compromisso</a>
      </div>`;
    }

    return `<div class="proximos-comp-lista">
      ${proximos.map(c => {
        const dt = new Date(c.inicio);
        const dia = dt.toLocaleDateString('pt-BR', {day: 'numeric'});
        const mes = dt.toLocaleDateString('pt-BR', {month: 'short'});
        const hora = dt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
        const cli = clientes.find(cl => cl.id === c.cliente_id);
        const tipos = {visita:'Visita', reuniao:'Reunião', entrega:'Entrega'};
        return `<div class="proximos-comp-item proximos-comp-item--${UI.esc(c.tipo||'visita')}" data-route="agenda" style="cursor:pointer" title="Ver agenda">
          <div class="proximos-comp-data">
            <div class="proximos-comp-dia">${dia}</div>
            <div class="proximos-comp-mes">${mes}</div>
          </div>
          <div class="proximos-comp-info">
            <div class="proximos-comp-titulo">${UI.esc(c.titulo)}</div>
            <div class="proximos-comp-sub">${hora}${cli ? ' · ' + UI.esc(cli.nome) : ''} · ${tipos[c.tipo]||'Visita'}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  return { render };
})();
