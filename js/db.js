const DB = (() => {
  const NAME = 'reverse_portal';
  const VERSION = 3;
  let _db = null;

  const SCHEMA = {
    clientes: {
      keyPath: 'id', autoIncrement: true,
      indexes: [
        { name: 'nome',   keyPath: 'nome' },
        { name: 'status', keyPath: 'status' },
      ],
    },
    servicos: {
      keyPath: 'id', autoIncrement: true,
      indexes: [
        { name: 'categoria',   keyPath: 'categoria' },
        { name: 'recorrencia', keyPath: 'recorrencia' },
      ],
    },
    orcamentos: {
      keyPath: 'id', autoIncrement: true,
      indexes: [
        { name: 'cliente_id', keyPath: 'cliente_id' },
        { name: 'status',     keyPath: 'status' },
        { name: 'numero',     keyPath: 'numero', unique: true },
      ],
    },
    compromissos: {
      keyPath: 'id', autoIncrement: true,
      indexes: [
        { name: 'cliente_id', keyPath: 'cliente_id' },
        { name: 'inicio',     keyPath: 'inicio' },
        { name: 'status',     keyPath: 'status' },
      ],
    },
    kanban_cards: {
      keyPath: 'id', autoIncrement: true,
      indexes: [
        { name: 'coluna',     keyPath: 'coluna' },
        { name: 'cliente_id', keyPath: 'cliente_id' },
        { name: 'prazo',      keyPath: 'prazo' },
      ],
    },
    lancamentos: {
      keyPath: 'id', autoIncrement: true,
      indexes: [
        { name: 'orcamento_id', keyPath: 'orcamento_id' },
        { name: 'status',       keyPath: 'status' },
        { name: 'vencimento',   keyPath: 'vencimento' },
      ],
    },
    arts: {
      keyPath: 'id', autoIncrement: true,
      indexes: [
        { name: 'numero_art', keyPath: 'numero_art' },
        { name: 'cliente_id', keyPath: 'cliente_id' },
        { name: 'status',     keyPath: 'status' },
      ],
    },
    documentos: {
      keyPath: 'id', autoIncrement: true,
      indexes: [
        { name: 'cliente_id', keyPath: 'cliente_id' },
        { name: 'criado_em',  keyPath: 'criado_em'  },
      ],
    },
    config: {
      keyPath: 'chave', autoIncrement: false,
      indexes: [],
    },
    prospeccao_cache: {
      keyPath: 'id', autoIncrement: false,
      indexes: [
        { name: 'status',           keyPath: 'status' },
        { name: 'origem',           keyPath: 'origem' },
        { name: 'proximo_followup', keyPath: 'proximo_followup' },
        { name: 'ativo',            keyPath: 'ativo' },
      ],
    },
    prospeccao_pending: {
      keyPath: 'id_local', autoIncrement: true,
      indexes: [
        { name: 'action',    keyPath: 'action' },
        { name: 'criado_em', keyPath: 'criado_em' },
      ],
    },
  };

  function open() {
    return new Promise((resolve, reject) => {
      if (_db) { resolve(_db); return; }

      const req = indexedDB.open(NAME, VERSION);

      req.onerror = () => reject(new Error('Falha ao abrir banco de dados: ' + req.error));

      req.onsuccess = (e) => {
        _db = e.target.result;
        _db.onerror = (ev) => console.error('DB error:', ev.target.error);
        resolve(_db);
      };

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        for (const [name, opts] of Object.entries(SCHEMA)) {
          if (db.objectStoreNames.contains(name)) continue;
          const store = db.createObjectStore(name, {
            keyPath: opts.keyPath,
            autoIncrement: opts.autoIncrement,
          });
          for (const idx of (opts.indexes || [])) {
            store.createIndex(idx.name, idx.keyPath, { unique: !!idx.unique });
          }
        }
      };
    });
  }

  function _store(name, mode = 'readonly') {
    return _db.transaction(name, mode).objectStore(name);
  }

  function getAll(storeName, indexName, value) {
    return open().then(() => new Promise((resolve, reject) => {
      const store = _store(storeName);
      const req = (indexName !== undefined && value !== undefined)
        ? store.index(indexName).getAll(value)
        : store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror  = () => reject(req.error);
    }));
  }

  function get(storeName, key) {
    return open().then(() => new Promise((resolve, reject) => {
      const req = _store(storeName).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror  = () => reject(req.error);
    }));
  }

  function put(storeName, record) {
    return open().then(() => new Promise((resolve, reject) => {
      const req = _store(storeName, 'readwrite').put(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror  = () => reject(req.error);
    }));
  }

  function add(storeName, record) {
    return open().then(() => new Promise((resolve, reject) => {
      const req = _store(storeName, 'readwrite').add(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror  = () => reject(req.error);
    }));
  }

  function remove(storeName, key) {
    return open().then(() => new Promise((resolve, reject) => {
      const req = _store(storeName, 'readwrite').delete(key);
      req.onsuccess = () => resolve();
      req.onerror  = () => reject(req.error);
    }));
  }

  function clear(storeName) {
    return open().then(() => new Promise((resolve, reject) => {
      const req = _store(storeName, 'readwrite').clear();
      req.onsuccess = () => resolve();
      req.onerror  = () => reject(req.error);
    }));
  }

  function count(storeName) {
    return open().then(() => new Promise((resolve, reject) => {
      const req = _store(storeName).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror  = () => reject(req.error);
    }));
  }

  return { open, getAll, get, put, add, remove, clear, count };
})();
