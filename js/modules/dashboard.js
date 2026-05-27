const Dashboard = (() => {
  let _chartFluxo = null;

  const STATUS_CLIENTE = {
    ativo:     { label: 'Ativo',     cls: 'badge--verde' },
    prospecto: { label: 'Prospecto', cls: 'badge--azul' },
    lead:      { label: 'Lead',      cls: 'badge--dourado' },
    inativo:   { label: 'Inativo',   cls: 'badge--default' },
  };

  function _calcMargem(orc) {
    const total = orc.total || 0;
    if (!total || !orc.memorial) return null;
    const m = orc.memorial;
    const totalCustos = (m.custos || []).reduce((s, c) => s + (c.qtd || 1) * (c.valor_unit || 0), 0);
    const impostos = (m.nf_ativo  ? (m.nf_pct  || 0) / 100 * total : 0)
                   + (m.art_ativo ? (m.art_pct || 0) / 100 * total : 0);
    return (total - totalCustos - impostos) / total * 100;
  }

  async function render(container) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Carregando dashboard...</div>';

    const [clientes, servicos, compromissos, lancamentos, leads, contasPagar, orcamentos] = await Promise.all([
      DB.getAll('clientes'),
      DB.getAll('servicos'),
      DB.getAll('compromissos'),
      DB.getAll('lancamentos'),
      DB.getAll('prospeccao_cache'),
      DB.getAll('contas_pagar'),
      DB.getAll('orcamentos'),
    ]);

    const agora  = new Date();
    const em7d   = new Date(agora.getTime() + 7 * 86400000);
    const hoje   = new Date(); hoje.setHours(0, 0, 0, 0);
    const hojeStr = hoje.toISOString().slice(0, 10);
    const em7dStr = new Date(hoje.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const mesAtual = hojeStr.slice(0, 7);

    // ── Prospecção ──
    const prospAtrasados = leads.filter(l => l.proximo_followup && l.proximo_followup < hojeStr).length;
    const prospHoje      = leads.filter(l => l.proximo_followup === hojeStr).length;
    const temAlertaProsp = prospAtrasados > 0;

    // ── Financeiro (a receber) ──
    const clientesAtivos = clientes.filter(c => c.status === 'ativo').length;
    const proximosComp   = compromissos.filter(c => {
      const dt = new Date(c.inicio);
      return dt >= agora && dt <= em7d && c.status !== 'cancelado';
    }).length;
    const aReceber  = lancamentos
      .filter(l => l.status === 'pendente' || l.status === 'atrasado')
      .reduce((s, l) => s + (Number(l.valor) || 0), 0);
    const atrasados = lancamentos.filter(l => l.status === 'atrasado').length;

    // ── Contas a Pagar ──
    const cpAtrasadas = contasPagar.filter(cp =>
      !cp.pago_em && cp.status !== 'pago' && (cp.vencimento || '') < hojeStr
    );
    const cpProximos = contasPagar.filter(cp =>
      !cp.pago_em && cp.status !== 'pago' &&
      (cp.vencimento || '') >= hojeStr && (cp.vencimento || '') <= em7dStr
    );
    const cpTotalAtrasadas = cpAtrasadas.reduce((s, cp) => s + (Number(cp.valor) || 0), 0);
    const cpTotalProximos  = cpProximos.reduce((s, cp)  => s + (Number(cp.valor) || 0), 0);

    // ── Margem média do mês ──
    const orcsDoMes  = orcamentos.filter(o =>
      ((o.atualizado_em || o.criado_em || '').startsWith(mesAtual)) && o.memorial
    );
    const margens    = orcsDoMes.map(o => _calcMargem(o)).filter(m => m !== null);
    const margemMedia = margens.length ? margens.reduce((s, m) => s + m, 0) / margens.length : null;
    const margemCor  = margemMedia === null ? ''
      : margemMedia >= 30 ? 'color:var(--verde)'
      : margemMedia >= 15 ? 'color:var(--laranja)'
      : 'color:var(--vermelho)';

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Visão geral — Reverse Engenharia · Engenharia · Segurança · Conformidade</p>
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

      <div class="kpi-grid kpi-grid--3">
        <div class="kpi-card ${cpProximos.length > 0 ? 'kpi-card--warning' : ''}" data-route="financeiro" style="cursor:pointer" title="Ver contas a pagar">
          <div class="kpi-icon kpi-icon--laranja">⏰</div>
          <div class="kpi-content">
            <div class="kpi-value">${UI.formatBRL(cpTotalProximos)}</div>
            <div class="kpi-label">A pagar (próximos 7 dias)</div>
            <div class="kpi-sub ${cpProximos.length > 0 ? 'text-warning' : ''}">
              ${cpProximos.length} conta${cpProximos.length !== 1 ? 's' : ''} vencendo
            </div>
          </div>
        </div>

        <div class="kpi-card ${cpAtrasadas.length > 0 ? 'kpi-card--alert' : ''}" data-route="financeiro" style="cursor:pointer" title="Ver contas atrasadas">
          <div class="kpi-icon kpi-icon--vermelho">⚠</div>
          <div class="kpi-content">
            <div class="kpi-value ${cpAtrasadas.length > 0 ? 'text-danger' : ''}">${UI.formatBRL(cpTotalAtrasadas)}</div>
            <div class="kpi-label">Contas atrasadas</div>
            <div class="kpi-sub ${cpAtrasadas.length > 0 ? 'text-danger' : ''}">
              ${cpAtrasadas.length > 0
                ? `${cpAtrasadas.length} conta${cpAtrasadas.length !== 1 ? 's' : ''} em atraso`
                : 'Nenhuma em atraso'}
            </div>
          </div>
        </div>

        <div class="kpi-card" data-route="orcamentos" style="cursor:pointer" title="Ver orçamentos do mês">
          <div class="kpi-icon kpi-icon--preto" style="font-size:18px">📊</div>
          <div class="kpi-content">
            <div class="kpi-value" style="${margemCor}">${margemMedia !== null ? margemMedia.toFixed(1) + '%' : '—'}</div>
            <div class="kpi-label">Margem média (mês)</div>
            <div class="kpi-sub">${margens.length} orçamento${margens.length !== 1 ? 's' : ''} com memorial</div>
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
            <h3>Receita × Despesa (6 meses)</h3>
          </div>
          <div class="card-body" style="display:flex;align-items:center;justify-content:center;min-height:200px">
            <canvas id="chart-fluxo" style="max-height:220px"></canvas>
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

    container.addEventListener('click', (e) => {
      const el = e.target.closest('[data-route]');
      if (!el) return;
      e.preventDefault();
      location.hash = '#/' + el.dataset.route;
    });

    renderChartFluxo(lancamentos, contasPagar);
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

  function renderChartFluxo(lancamentos, contasPagar) {
    const ctx = document.getElementById('chart-fluxo');
    if (!ctx) return;
    if (_chartFluxo) { _chartFluxo.destroy(); _chartFluxo = null; }

    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      });
    }

    const receitas = months.map(m =>
      lancamentos
        .filter(l => l.status === 'pago' && (l.vencimento || '').startsWith(m.key))
        .reduce((s, l) => s + (Number(l.valor) || 0), 0)
    );

    const despesas = months.map(m =>
      contasPagar
        .filter(cp => cp.status === 'pago' && ((cp.pago_em || cp.vencimento) || '').startsWith(m.key))
        .reduce((s, cp) => s + (Number(cp.valor) || 0), 0)
    );

    const hasData = receitas.some(v => v > 0) || despesas.some(v => v > 0);
    if (!hasData) {
      ctx.parentElement.innerHTML = '<div class="empty-state-sm"><p>Sem dados financeiros ainda.</p></div>';
      return;
    }

    _chartFluxo = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months.map(m => m.label),
        datasets: [
          {
            label: 'Receita',
            data: receitas,
            backgroundColor: 'rgba(61,181,60,0.75)',
            borderRadius: 4,
            borderSkipped: false,
          },
          {
            label: 'Despesa',
            data: despesas,
            backgroundColor: 'rgba(210,55,55,0.70)',
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Inter, sans-serif', size: 12 }, padding: 14, boxWidth: 12 },
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ctx.raw)}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            ticks: {
              callback: v => 'R$ ' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v),
            },
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
      .sort((a, b) => new Date(a.inicio) - new Date(b.inicio))
      .slice(0, 6);

    if (!proximos.length) {
      return `<div class="empty-state-sm">
        <p>Nenhum compromisso nos próximos 7 dias.</p>
        <a href="#/agenda" class="btn btn--sm btn--primary">+ Agendar compromisso</a>
      </div>`;
    }

    return `<div class="proximos-comp-lista">
      ${proximos.map(c => {
        const dt  = new Date(c.inicio);
        const dia  = dt.toLocaleDateString('pt-BR', { day: 'numeric' });
        const mes  = dt.toLocaleDateString('pt-BR', { month: 'short' });
        const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const cli  = clientes.find(cl => cl.id === c.cliente_id);
        const tipos = { visita: 'Visita', reuniao: 'Reunião', entrega: 'Entrega' };
        return `<div class="proximos-comp-item proximos-comp-item--${UI.esc(c.tipo || 'visita')}" data-route="agenda" style="cursor:pointer" title="Ver agenda">
          <div class="proximos-comp-data">
            <div class="proximos-comp-dia">${dia}</div>
            <div class="proximos-comp-mes">${mes}</div>
          </div>
          <div class="proximos-comp-info">
            <div class="proximos-comp-titulo">${UI.esc(c.titulo)}</div>
            <div class="proximos-comp-sub">${hora}${cli ? ' · ' + UI.esc(cli.nome) : ''} · ${tipos[c.tipo] || 'Visita'}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  return { render };
})();
