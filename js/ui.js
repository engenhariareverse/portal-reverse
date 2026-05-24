const UI = (() => {

  /* ── Toast ──────────────────────────────── */
  function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    const icons = { success: '✔', error: '✖', warning: '⚠', info: '●' };
    toast.innerHTML = `<span class="toast-icon">${icons[type] || '●'}</span><span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('toast--show')));
    setTimeout(() => {
      toast.classList.remove('toast--show');
      setTimeout(() => toast.remove(), 320);
    }, duration);
  }

  /* ── Modal ──────────────────────────────── */
  let _modalResolve = null;

  function openModal(title, bodyHTML, opts = {}) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    const box = document.getElementById('modal-box');
    box.className = 'modal-box' + (opts.wide ? ' modal-box--wide' : '');
    document.getElementById('modal-overlay').classList.remove('hidden');
    return new Promise((resolve) => { _modalResolve = resolve; });
  }

  function closeModal(result) {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
    if (_modalResolve) { _modalResolve(result); _modalResolve = null; }
  }

  /* ── Confirm ────────────────────────────── */
  function showConfirm(title, message, btnLabel = 'Confirmar') {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-body').innerHTML = `<p style="color:var(--text-secondary);line-height:1.6">${message}</p>`;
    document.getElementById('confirm-ok').textContent = btnLabel;
    document.getElementById('confirm-overlay').classList.remove('hidden');
    return new Promise((resolve) => {
      const ok = document.getElementById('confirm-ok');
      const cancel = document.getElementById('confirm-cancel');
      const finish = (val) => {
        document.getElementById('confirm-overlay').classList.add('hidden');
        ok.onclick = null;
        cancel.onclick = null;
        resolve(val);
      };
      ok.onclick     = () => finish(true);
      cancel.onclick = () => finish(false);
    });
  }

  /* ── Formatadores ───────────────────────── */
  function formatBRL(value) {
    if (value == null || value === '' || isNaN(value)) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    return isNaN(d) ? dateStr : d.toLocaleDateString('pt-BR');
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function formatPhone(phone) {
    if (!phone) return '—';
    const n = phone.replace(/\D/g, '');
    if (n.length === 11) return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;
    if (n.length === 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`;
    return phone;
  }

  function statusBadge(status, map) {
    const cfg = map[status] || { label: status || '—', cls: 'badge--default' };
    return `<span class="badge ${cfg.cls}">${cfg.label}</span>`;
  }

  /* ── Escape / Sanitize ──────────────────────── */
  /** Escapa para interpolação segura dentro de conteúdo HTML (innerHTML). */
  function esc(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Escapa para uso seguro em atributos HTML (valor de class, data-*, href, etc.). */
  function attr(str) {
    return esc(String(str || ''));
  }

  /* ── Tratamento de erros ────────────────────── */
  /** Exibe toast de erro genérico. Aceita Error ou string. */
  function handleError(err, prefixo = 'Erro') {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(prefixo + ':', err);
    showToast(`${prefixo}: ${msg}`, 'error', 6000);
  }

  return {
    showToast,
    openModal,
    closeModal,
    showConfirm,
    formatBRL,
    formatDate,
    formatDateTime,
    formatPhone,
    statusBadge,
    esc,
    attr,
    handleError,
  };
})();
