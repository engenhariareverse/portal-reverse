/**
 * SheetsAPI — camada de serviço entre o Portal JOTEC e o Google Apps Script.
 *
 * Depende de DB (js/db.js) já carregado na página.
 *
 * Uso básico no console:
 *   await SheetsAPI.setUrl('https://script.google.com/...')
 *   await SheetsAPI.ping()
 *   const { data, offline } = await SheetsAPI.list()
 *   await SheetsAPI.create({ empresa: 'Teste', contato_nome: 'João' })
 */
const SheetsAPI = (() => {
  const CONFIG_KEY = 'prospeccao_sheets_url';
  let _cachedUrl = null;

  // ──────────────────────────────────────────────────────────
  // Config
  // ──────────────────────────────────────────────────────────

  async function setUrl(url) {
    _cachedUrl = url;
    await DB.put('config', { chave: CONFIG_KEY, valor: url });
  }

  async function getUrl() {
    if (_cachedUrl) return _cachedUrl;
    const row = await DB.get('config', CONFIG_KEY);
    _cachedUrl = row ? row.valor : null;
    return _cachedUrl;
  }

  // ──────────────────────────────────────────────────────────
  // HTTP helpers
  // ──────────────────────────────────────────────────────────

  async function _requireUrl() {
    const url = await getUrl();
    if (!url) throw new Error('URL do Apps Script não configurada. Configure na aba Configurações.');
    return url;
  }

  async function _get(params) {
    const url = await _requireUrl();
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${url}?${qs}`, { redirect: 'follow' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  async function _post(body) {
    const url = await _requireUrl();
    // Content-Type: text/plain evita o preflight CORS que o Apps Script não suporta
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body),
      redirect: 'follow',
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  function _normalizeId(row) {
    return { ...row, id: Number(row.id) || row.id };
  }

  // ──────────────────────────────────────────────────────────
  // API pública
  // ──────────────────────────────────────────────────────────

  async function ping() {
    return _get({ action: 'ping' });
  }

  /**
   * Lista todos os contatos ativos.
   * Sempre tenta a API quando online; cai para cache se falhar.
   * @param {boolean} [force=false] – ignora o estado offline e sempre tenta a API
   * @returns {{ data: object[], offline: boolean, error?: string }}
   */
  async function list({ force = false } = {}) {
    if (!force && !navigator.onLine) {
      const data = await DB.getAll('prospeccao_cache');
      return { data, offline: true };
    }
    try {
      const result = await _get({ action: 'list' });
      const rows = (result.data || []).map(_normalizeId);
      await DB.clear('prospeccao_cache');
      for (const row of rows) await DB.put('prospeccao_cache', row);
      return { data: rows, offline: false };
    } catch (e) {
      const data = await DB.getAll('prospeccao_cache');
      return { data, offline: true, error: e.message };
    }
  }

  /**
   * Cria um novo contato.
   * Se offline, salva cópia otimista no cache e enfileira o write.
   * @returns {{ ok: boolean, offline: boolean, data?: object, id?: string }}
   */
  async function create(payload) {
    if (!navigator.onLine) {
      const localId = 'local_' + Date.now();
      await DB.put('prospeccao_cache', { ...payload, id: localId, _pendente: true });
      await _enqueue('create', payload, localId);
      return { ok: true, offline: true, id: localId };
    }
    try {
      const result = await _post({ action: 'create', ...payload });
      if (result.data) await DB.put('prospeccao_cache', _normalizeId(result.data));
      return { ok: true, offline: false, data: result.data };
    } catch (e) {
      await _enqueue('create', payload, null);
      return { ok: false, offline: true, error: e.message };
    }
  }

  /**
   * Atualiza um contato existente.
   * Aplica a mudança no cache local imediatamente (otimista).
   */
  async function update(id, payload) {
    const numId = Number(id) || id;
    const existing = await DB.get('prospeccao_cache', numId);
    if (existing) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await DB.put('prospeccao_cache', { ...existing, ...payload, id: numId, atualizado_em: now });
    }
    if (!navigator.onLine) {
      await _enqueue('update', { id, ...payload });
      return { ok: true, offline: true };
    }
    try {
      const result = await _post({ action: 'update', id, ...payload });
      if (result.data) await DB.put('prospeccao_cache', _normalizeId(result.data));
      return { ok: true, offline: false, data: result.data };
    } catch (e) {
      await _enqueue('update', { id, ...payload });
      return { ok: false, offline: true, error: e.message };
    }
  }

  /**
   * Exclui (soft delete) um contato.
   * Remove do cache local imediatamente.
   */
  async function del(id) {
    const numId = Number(id) || id;
    await DB.remove('prospeccao_cache', numId);
    if (!navigator.onLine) {
      await _enqueue('delete', { id });
      return { ok: true, offline: true };
    }
    try {
      await _post({ action: 'delete', id });
      return { ok: true, offline: false };
    } catch (e) {
      await _enqueue('delete', { id });
      return { ok: false, offline: true, error: e.message };
    }
  }

  // ──────────────────────────────────────────────────────────
  // Fila offline
  // ──────────────────────────────────────────────────────────

  async function _enqueue(action, payload, localId = null) {
    await DB.add('prospeccao_pending', {
      action,
      payload,
      localId,
      tentativas: 0,
      criado_em: new Date().toISOString(),
    });
  }

  /**
   * Tenta enviar todos os writes enfileirados enquanto estava offline.
   * @returns {{ synced: number, failed: number }}
   */
  async function syncPending() {
    const pending = await DB.getAll('prospeccao_pending');
    if (!pending.length) return { synced: 0, failed: 0 };
    let synced = 0, failed = 0;
    for (const item of pending) {
      try {
        const result = await _post({ action: item.action, ...item.payload });
        if (item.action === 'create' && result.data) {
          if (item.localId) await DB.remove('prospeccao_cache', item.localId);
          await DB.put('prospeccao_cache', _normalizeId(result.data));
        } else if (item.action === 'update' && result.data) {
          await DB.put('prospeccao_cache', _normalizeId(result.data));
        }
        await DB.remove('prospeccao_pending', item.id_local);
        synced++;
      } catch (_e) {
        await DB.put('prospeccao_pending', { ...item, tentativas: (item.tentativas || 0) + 1 });
        failed++;
      }
    }
    return { synced, failed };
  }

  // Auto-sync quando a conexão volta
  window.addEventListener('online', () => {
    syncPending().then(r => {
      if (r.synced > 0) console.log(`[SheetsAPI] ${r.synced} pendente(s) sincronizado(s).`);
    }).catch(console.error);
  });

  return { setUrl, getUrl, ping, list, create, update, delete: del, syncPending };
})();
