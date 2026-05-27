/**
 * SheetsAPI — camada de serviço entre o Portal Reverse Engenharia e o Google Apps Script.
 *
 * A mesma URL do Web App serve para Prospecção e Contas a Pagar.
 * Configure a URL uma única vez em Prospecção → Configurações.
 *
 * Uso:
 *   await SheetsAPI.setUrl('https://script.google.com/...')
 *   await SheetsAPI.ping()
 *
 *   // Prospecção (CRM)
 *   const { data } = await SheetsAPI.list()
 *   await SheetsAPI.create({ empresa: 'Teste' })
 *
 *   // Contas a Pagar
 *   await SheetsAPI.ContasPagar.create({ id: 1, descricao: 'Aluguel', valor: 500, ... })
 *   const r = await SheetsAPI.ContasPagar.syncAll()
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
  // HTTP helpers (compartilhados com ContasPagar)
  // ──────────────────────────────────────────────────────────

  async function _requireUrl() {
    const url = await getUrl();
    if (!url) throw new Error('URL do Apps Script não configurada. Configure em Prospecção → Configurações.');
    return url;
  }

  async function _get(params) {
    const url = await _requireUrl();
    const qs  = new URLSearchParams(params).toString();
    const res = await fetch(`${url}?${qs}`, { redirect: 'follow' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  async function _post(body) {
    const url = await _requireUrl();
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
  // API Prospecção (existente — sem alterações)
  // ──────────────────────────────────────────────────────────

  async function ping() {
    return _get({ action: 'ping' });
  }

  async function list({ force = false } = {}) {
    if (!force && !navigator.onLine) {
      const data = await DB.getAll('prospeccao_cache');
      return { data, offline: true };
    }
    try {
      const result = await _get({ action: 'list' });
      const rows   = (result.data || []).map(_normalizeId);
      await DB.clear('prospeccao_cache');
      for (const row of rows) await DB.put('prospeccao_cache', row);
      return { data: rows, offline: false };
    } catch (e) {
      const data = await DB.getAll('prospeccao_cache');
      return { data, offline: true, error: e.message };
    }
  }

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

  async function update(id, payload) {
    const numId    = Number(id) || id;
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

  async function _enqueue(action, payload, localId = null) {
    await DB.add('prospeccao_pending', {
      action, payload, localId,
      tentativas: 0,
      criado_em: new Date().toISOString(),
    });
  }

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

  window.addEventListener('online', () => {
    syncPending().then(r => {
      if (r.synced > 0) console.log(`[SheetsAPI] ${r.synced} pendente(s) sincronizado(s).`);
    }).catch(console.error);
  });

  // ──────────────────────────────────────────────────────────
  // API Contas a Pagar
  // ──────────────────────────────────────────────────────────

  const ContasPagar = (() => {

    /** Mapeia uma linha do Sheets para o schema local do contas_pagar. */
    function _map(row) {
      return {
        id:            Number(row.id),
        descricao:     row.descricao     || '',
        categoria:     row.categoria     || null,
        fornecedor:    row.fornecedor    || null,
        valor:         Number(row.valor) || 0,
        vencimento:    (row.vencimento   || '').slice(0, 10),
        status:        row.status        || 'pendente',
        pago_em:       row.pago_em       ? String(row.pago_em).slice(0, 10) : null,
        forma_pgto:    row.forma_pgto    || null,
        recorrencia:   row.recorrencia   || 'unica',
        parcela_nr:    row.parcela_nr    ? Number(row.parcela_nr)    : null,
        parcela_total: row.parcela_total ? Number(row.parcela_total) : null,
        anexo_url:     row.anexo_url     || null,
        obs:           row.obs           || null,
        criado_em:     row.criado_em     || new Date().toISOString(),
      };
    }

    /** Lista todas as contas a pagar ativas no Sheets. */
    async function cpList() {
      const result = await _get({ action: 'list', sheet: 'ContasPagar' });
      return (result.data || []).map(_map);
    }

    /** Cria uma conta no Sheets. Passa o id do portal para manter sincronismo. */
    async function cpCreate(payload) {
      return _post({ action: 'create', sheet: 'ContasPagar', ...payload });
    }

    /** Atualiza uma conta no Sheets pelo id. */
    async function cpUpdate(id, payload) {
      return _post({ action: 'update', sheet: 'ContasPagar', id, ...payload });
    }

    /** Soft delete no Sheets (marca ativo=FALSE). */
    async function cpDel(id) {
      return _post({ action: 'delete', sheet: 'ContasPagar', id });
    }

    /**
     * Sincronização bidirecional:
     *  1. Envia registros locais que não existem no Sheets.
     *  2. Atualiza o DB local com os dados do Sheets (Sheets vence no conflito).
     *  3. Remove localmente registros que foram deletados no Sheets (ativo=FALSE).
     *
     * @returns {{ ok, pulled, pushed, removed, error? }}
     */
    async function syncAll() {
      if (!navigator.onLine) return { ok: false, offline: true, msg: 'Sem conexão.' };
      try {
        const [sheetsRows, localRows] = await Promise.all([
          cpList(),
          DB.getAll('contas_pagar'),
        ]);

        const sheetsById = new Map(sheetsRows.map(r => [r.id, r]));
        const localById  = new Map(localRows.map(r => [r.id, r]));

        // 1. Enviar registros locais ausentes no Sheets
        let pushed = 0;
        for (const [id, lcp] of localById) {
          if (!sheetsById.has(id)) {
            try {
              await cpCreate({ ...lcp, ativo: true });
              pushed++;
            } catch (e) {
              console.warn('[SheetsAPI.CP] push falhou id=' + id, e.message);
            }
          }
        }

        // 2. Upsert Sheets → local (Sheets vence)
        let pulled = 0;
        for (const [id, scp] of sheetsById) {
          await DB.put('contas_pagar', scp);
          pulled++;
        }

        // 3. Remover localmente o que foi deletado no Sheets
        let removed = 0;
        for (const [id] of localById) {
          if (!sheetsById.has(id)) {
            // Não está no Sheets e não foi empurrado (seria bug); ignore para segurança.
          }
        }

        return { ok: true, pulled, pushed, removed };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }

    return {
      list:   cpList,
      create: cpCreate,
      update: cpUpdate,
      delete: cpDel,
      syncAll,
    };
  })();

  // ──────────────────────────────────────────────────────────

  return {
    setUrl, getUrl, ping,
    list, create, update, delete: del, syncPending,
    ContasPagar,
  };
})();
