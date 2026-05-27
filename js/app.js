const APP = (() => {

  const ROUTES = {
    dashboard:  { label: 'Dashboard',  module: Dashboard },
    clientes:   { label: 'Clientes',   module: Clientes },
    servicos:   { label: 'Serviços',   module: Servicos },
    orcamentos: { label: 'Orçamentos', module: Orcamentos },
    agenda:     { label: 'Agenda',     module: Agenda },
    kanban:     { label: 'Kanban',     module: Kanban },
    financeiro: { label: 'Financeiro', module: Financeiro },
    arts:       { label: 'ARTs',       module: Arts },
    documentos:  { label: 'Documentos',  module: Documentos  },
    prospeccao:  { label: 'Prospecção',  module: Prospeccao  },
    ajuda:       { label: 'Ajuda',       module: Ajuda       },
  };

  const NEW_BTNS = {
    clientes:   'btn-novo-cliente',
    servicos:   'btn-novo-servico',
    orcamentos: 'btn-novo-orcamento',
    agenda:     'btn-novo-compromisso',
    kanban:     'btn-novo-card',
    financeiro: 'btn-novo-lancamento',
    arts:       'btn-nova-art',
    documentos: 'btn-add-doc',
  };

  function currentRoute() {
    return (location.hash.replace('#/', '') || 'dashboard').split('/')[0];
  }

  function navigate(route) {
    document.getElementById('app').classList.remove('sidebar-open');
    const def = ROUTES[route] || ROUTES.dashboard;

    document.getElementById('breadcrumb').textContent = def.label;

    document.querySelectorAll('.nav-item').forEach(el =>
      el.classList.toggle('active', el.dataset.route === route)
    );

    const content = document.getElementById('content');
    content.innerHTML = '';
    if (def.module && typeof def.module.render === 'function') {
      def.module.render(content);
    }
  }

  const DEFAULT_SERVICOS = [
    {
      nome: 'PMOC — Plano de Manutenção, Operação e Controle',
      descricao: 'Elaboração e execução do Plano de Manutenção, Operação e Controle de sistemas de climatização, conforme Lei 13.589/2018 e ABNT NBR 13971.',
      preco_min: 350, preco_ideal: 500, preco_max: 800,
      recorrencia: 'mensal', categoria: 'PMOC',
    },
    {
      nome: 'Laudo Técnico de Brinquedo',
      descricao: 'Inspeção e laudo técnico de brinquedos, equipamentos de playground e estruturas de lazer, conforme ABNT NBR 16071.',
      preco_min: 800, preco_ideal: 1200, preco_max: 1800,
      recorrencia: 'anual', categoria: 'Laudo',
    },
    {
      nome: 'Regularização de Estabelecimento de Desmanche',
      descricao: 'Assessoria técnica e documentação para regularização de desmanches junto ao DETRAN/SP e CREA-SP.',
      preco_min: 2500, preco_ideal: 3500, preco_max: 5000,
      recorrencia: 'pontual', categoria: 'Regularização',
    },
    {
      nome: 'Perícia Mecânica',
      descricao: 'Perícia técnica de veículos e equipamentos mecânicos para fins judiciais, administrativos ou de seguros. Emissão de laudo pericial.',
      preco_min: 1200, preco_ideal: 2000, preco_max: 3500,
      recorrencia: 'pontual', categoria: 'Perícia',
    },
    {
      nome: 'Laudo de Vistoria Veicular',
      descricao: 'Vistoria técnica e laudo de estado de conservação de veículos para compra, venda ou sinistro.',
      preco_min: 400, preco_ideal: 600, preco_max: 900,
      recorrencia: 'pontual', categoria: 'Laudo',
    },
    {
      nome: 'ART — Anotação de Responsabilidade Técnica',
      descricao: 'Emissão de ART junto ao CREA-SP para cobertura de serviços de engenharia mecânica.',
      preco_min: 150, preco_ideal: 250, preco_max: 400,
      recorrencia: 'pontual', categoria: 'ART',
    },
  ];

  async function seedServicos() {
    const seeded = await DB.get('config', 'servicos_seeded');
    if (seeded) return;

    for (const s of DEFAULT_SERVICOS) {
      await DB.add('servicos', s);
    }
    await DB.put('config', { chave: 'servicos_seeded', valor: true });
    await DB.put('config', { chave: 'numeracao_orcamento', valor: 1 });
  }

  async function checkAlertasPMOC() {
    const hoje = new Date().toISOString().slice(0, 10);
    const visto = await DB.get('config', 'pmoc_alerta_visto');
    if (visto?.valor === hoje) return; // Já mostrado hoje

    const lancamentos = await DB.getAll('lancamentos');
    const hojeD = new Date(); hojeD.setHours(0, 0, 0, 0);
    const em30d = new Date(hojeD); em30d.setDate(em30d.getDate() + 30);

    const alertas = lancamentos.filter(l => {
      if (l.pago_em) return false;
      if (!(l.descricao || '').toUpperCase().includes('PMOC')) return false;
      const venc = new Date(l.vencimento + 'T00:00');
      return venc >= hojeD && venc <= em30d;
    });

    if (alertas.length > 0) {
      setTimeout(() => UI.showToast(
        `${alertas.length} PMOC${alertas.length > 1 ? 's' : ''} com vencimento nos próximos 30 dias — confira o Financeiro!`,
        'warning', 9000
      ), 3500);
      await DB.put('config', { chave: 'pmoc_alerta_visto', valor: hoje });
    }
  }

  async function initTema() {
    const cfg = await DB.get('config', 'tema');
    if (cfg && cfg.valor === 'escuro') {
      document.documentElement.setAttribute('data-tema', 'escuro');
      document.getElementById('btn-tema').textContent = '◐ Tema Claro';
    }

    document.getElementById('btn-tema').addEventListener('click', async () => {
      const escuro = document.documentElement.getAttribute('data-tema') === 'escuro';
      if (escuro) {
        document.documentElement.removeAttribute('data-tema');
        document.getElementById('btn-tema').textContent = '◑ Tema Escuro';
        await DB.put('config', { chave: 'tema', valor: 'claro' });
      } else {
        document.documentElement.setAttribute('data-tema', 'escuro');
        document.getElementById('btn-tema').textContent = '◐ Tema Claro';
        await DB.put('config', { chave: 'tema', valor: 'escuro' });
      }
    });
  }

  async function checkBackupReminder() {
    const cfg = await DB.get('config', 'ultimo_backup');
    if (!cfg) {
      setTimeout(() => UI.showToast('Dica: clique em "Exportar Backup" para salvar seus dados periodicamente.', 'info', 7000), 2000);
      return;
    }
    const dias = Math.floor((Date.now() - new Date(cfg.valor)) / 86400000);
    if (dias >= 7) {
      setTimeout(() => UI.showToast(`Último backup há ${dias} dias. Faça um novo backup!`, 'warning', 8000), 1500);
    }
  }

  function setupBuscaGlobal() {
    const input = document.getElementById('busca-global');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        const q = input.value.trim();
        location.hash = '#/clientes';
        setTimeout(() => {
          const filtro = document.getElementById('filtro-clientes');
          if (filtro) {
            filtro.value = q;
            filtro.dispatchEvent(new Event('input'));
          }
        }, 150);
      }
    });
  }

  async function init() {
    try {
      await DB.open();
    } catch (err) {
      document.getElementById('content').innerHTML = `
        <div style="padding:48px;text-align:center;color:#C62828">
          <h2>Erro ao inicializar o banco de dados</h2>
          <p style="margin-top:12px">${err.message}</p>
        </div>`;
      return;
    }

    // Data no header
    const headerData = document.getElementById('header-data');
    const now = new Date();
    headerData.textContent = now.toLocaleDateString('pt-BR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Fechar modal ao clicar no overlay ou ×
    document.getElementById('modal-close').addEventListener('click', () => UI.closeModal());
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') UI.closeModal();
    });

    // Atalhos de teclado
    document.addEventListener('keydown', (e) => {
      const tag = e.target.tagName;
      const emInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('busca-global').focus();
        document.getElementById('busca-global').select();
      }

      if (e.key === 'Escape') {
        UI.closeModal();
        document.getElementById('confirm-overlay').classList.add('hidden');
      }

      if (!emInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'n' || e.key === 'N') {
          const btnId = NEW_BTNS[currentRoute()];
          if (btnId) document.getElementById(btnId)?.click();
        }
        if (e.key === '/') {
          e.preventDefault();
          const modulo = document.querySelector('.input-busca, #filtro-clientes, #filtro-arts, #filtro-docs');
          if (modulo) { modulo.focus(); modulo.select(); }
          else { document.getElementById('busca-global').focus(); }
        }
      }
    });

    // Botão de backup
    document.getElementById('btn-backup').addEventListener('click', () => BACKUP.exportBackup());

    // Ctrl+Z para importar backup (acesso via botão com botão direito, mas disponível para usuário avançado)
    // Botão de importar backup: shift+clique no botão backup
    document.getElementById('btn-backup').addEventListener('contextmenu', (e) => {
      e.preventDefault();
      BACKUP.importBackup();
    });

    // Hambúrguer mobile
    const btnMenu = document.getElementById('btn-menu');
    const overlay = document.getElementById('sidebar-overlay');
    function openSidebar()  { document.getElementById('app').classList.add('sidebar-open'); }
    function closeSidebar() { document.getElementById('app').classList.remove('sidebar-open'); }
    btnMenu?.addEventListener('click', () => {
      document.getElementById('app').classList.toggle('sidebar-open');
    });
    overlay?.addEventListener('click', closeSidebar);

    setupBuscaGlobal();
    await seedServicos();
    await initTema();
    checkBackupReminder();
    Agenda.checkAlertaHoje();
    checkAlertasPMOC();

    // Roteamento
    window.addEventListener('hashchange', () => navigate(currentRoute()));

    if (!location.hash || location.hash === '#/' || location.hash === '#') {
      location.hash = '#/dashboard';
    } else {
      navigate(currentRoute());
    }
  }

  return { init, navigate };
})();

document.addEventListener('DOMContentLoaded', () => APP.init());
