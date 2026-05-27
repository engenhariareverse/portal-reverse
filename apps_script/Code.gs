/**
 * Portal Reverse Engenharia — API Google Apps Script
 * Versão 2.0.0 — suporta Prospecção + Contas a Pagar
 *
 * COMO USAR (primeira vez):
 *   1. Abra sua planilha "Reverse Engenharia — Portal" no Google Sheets
 *   2. Extensões → Apps Script
 *   3. Cole TODO este arquivo (substitua o que estiver lá)
 *   4. Salve (Ctrl+S) e nomeie o projeto (ex: "Reverse Engenharia API")
 *   5. Selecione a função `setupPlanilha` e clique ▶ Executar
 *      (autorize quando pedir — isso cria as abas com formatação)
 *   6. Implantar → Novo deploy → Tipo: App da Web
 *        Executar como: Eu (sua conta)
 *        Quem pode acessar: Qualquer pessoa
 *      → Implantar → copie a URL do app da Web
 *   7. Cole a URL na aba Prospecção → Configurações do Portal
 *      (a mesma URL serve para Prospecção E Contas a Pagar)
 *
 * Endpoints GET:
 *   ?action=ping                          → {ok:true, version}
 *   ?action=list                          → lista Prospecção
 *   ?action=list&sheet=ContasPagar        → lista Contas a Pagar
 *
 * Endpoints POST (body JSON):
 *   {action:"create", ...campos}                     → cria em Prospecção
 *   {action:"create", sheet:"ContasPagar", ...campos} → cria em ContasPagar
 *   {action:"update", id, ...campos}                 → atualiza
 *   {action:"delete", id}                            → soft delete (ativo=FALSE)
 */

// ============================================================
// SCHEMAS
// ============================================================

const VERSION = '2.1.2';

const SHEET_PROSP = 'Prospeccao';
const SHEET_CP    = 'ContasPagar';
const SHEET_CLI   = 'Clientes';

const COLS_PROSP = [
  'id', 'empresa', 'contato_nome', 'contato_cargo', 'telefone', 'email',
  'cidade', 'uf', 'segmento', 'tipo_servico', 'origem', 'status',
  'website', 'linkedin', 'instagram', 'proximo_followup', 'historico',
  'obs', 'criado_em', 'atualizado_em', 'ativo',
];

const COLS_CP = [
  'id', 'descricao', 'categoria', 'fornecedor', 'valor', 'vencimento',
  'status', 'pago_em', 'forma_pgto', 'recorrencia', 'parcela_nr',
  'parcela_total', 'anexo_url', 'obs', 'criado_em', 'atualizado_em', 'ativo',
];

const COLS_CLI = [
  'id', 'nome', 'contato_nome', 'cnpj_cpf', 'telefone', 'email', 'cidade',
  'segmento', 'status', 'obs', 'criado_em', 'atualizado_em', 'ativo',
];

// ============================================================
// ENTRADAS HTTP
// ============================================================

function doGet(e) {
  try {
    var p      = (e && e.parameter) || {};
    var action = p.action || 'ping';
    if (action === 'ping') return _ok({ version: VERSION });
    if (action === 'list') {
      var ctx = _ctx(p.sheet);
      return _ok({ data: _listAtivos(ctx.sheet, ctx.cols) });
    }
    return _err('Ação desconhecida: ' + action);
  } catch (ex) { return _err(ex); }
}

function doPost(e) {
  try {
    var body   = _parseBody(e);
    var action = body.action;
    var ctx    = _ctx(body.sheet);
    if (action === 'create') return _ok({ data: _create(ctx.sheet, ctx.cols, body) });
    if (action === 'update') return _ok({ data: _update(ctx.sheet, ctx.cols, body) });
    if (action === 'delete') { _delete(ctx.sheet, ctx.cols, body); return _ok({}); }
    return _err('Ação desconhecida: ' + action);
  } catch (ex) { return _err(ex); }
}

function _ctx(sheetParam) {
  if (sheetParam === SHEET_CP)  return { sheet: SHEET_CP,  cols: COLS_CP  };
  if (sheetParam === SHEET_CLI) return { sheet: SHEET_CLI, cols: COLS_CLI };
  return { sheet: SHEET_PROSP, cols: COLS_PROSP };
}

// ============================================================
// CRUD GENÉRICO
// ============================================================

function _listAtivos(sheetName, cols) {
  var sheet   = _getSheet(sheetName, cols);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values  = sheet.getRange(2, 1, lastRow - 1, cols.length).getValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var obj = _rowToObj(values[i], cols);
    if (obj.ativo !== false && String(obj.ativo).toUpperCase() !== 'FALSE') out.push(obj);
  }
  return out;
}

function _create(sheetName, cols, payload) {
  var sheet = _getSheet(sheetName, cols);
  var now   = _now();
  var rec   = {};
  for (var i = 0; i < cols.length; i++) rec[cols[i]] = '';
  for (var j = 0; j < cols.length; j++) {
    if (payload[cols[j]] !== undefined && payload[cols[j]] !== null) rec[cols[j]] = payload[cols[j]];
  }
  // Para ContasPagar o ID vem do portal; para Prospecção é auto-gerado
  if (payload.id && Number(payload.id) > 0) {
    rec.id = Number(payload.id);
  } else {
    rec.id = _nextId(sheet);
  }
  rec.criado_em    = payload.criado_em    || now;
  rec.atualizado_em = now;
  rec.ativo        = true;
  sheet.appendRow(cols.map(function(c) { return rec[c]; }));
  return rec;
}

function _update(sheetName, cols, payload) {
  var id = Number(payload.id);
  if (!id) throw new Error('id é obrigatório no update');
  var sheet    = _getSheet(sheetName, cols);
  var rowIndex = _findRow(sheet, id);
  if (rowIndex < 0) {
    // Não encontrado — cria (acontece quando push-on-save falhou antes)
    return _create(sheetName, cols, payload);
  }
  var cur = _rowToObj(sheet.getRange(rowIndex, 1, 1, cols.length).getValues()[0], cols);
  for (var i = 0; i < cols.length; i++) {
    var c = cols[i];
    if (c === 'id' || c === 'criado_em') continue;
    if (payload[c] !== undefined) cur[c] = payload[c];
  }
  cur.atualizado_em = _now();
  sheet.getRange(rowIndex, 1, 1, cols.length)
    .setValues([cols.map(function(c) { return cur[c]; })]);
  return cur;
}

function _delete(sheetName, cols, payload) {
  var id = Number(payload.id);
  if (!id) throw new Error('id é obrigatório no delete');
  var sheet    = _getSheet(sheetName, cols);
  var rowIndex = _findRow(sheet, id);
  if (rowIndex < 0) return; // idempotente — já não existe
  var ativoIdx    = cols.indexOf('ativo') + 1;
  var updatedIdx  = cols.indexOf('atualizado_em') + 1;
  sheet.getRange(rowIndex, ativoIdx).setValue(false);
  if (updatedIdx > 0) sheet.getRange(rowIndex, updatedIdx).setValue(_now());
}

// ============================================================
// HELPERS
// ============================================================

function _getSheet(name, cols) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, cols.length)
      .setFontWeight('bold')
      .setBackground('#1A1A1A')
      .setFontColor('#C5A04A');
  } else {
    // Auto-cura: ajusta cabeçalhos se o schema mudou desde a criação da aba.
    _ensureHeaders(sheet, cols);
  }
  return sheet;
}

/**
 * Garante que a linha 1 da aba contenha exatamente os cabeçalhos esperados.
 *
 *  - Se a aba estiver vazia (só cabeçalho ou nada), sobrescreve a linha 1
 *    com `cols` e reaplica formatação.
 *  - Se já houver dados, INSERE colunas que faltam em sua posição correta,
 *    preservando os valores existentes. Não remove colunas que não existem
 *    mais em `cols` (segurança).
 */
function _ensureHeaders(sheet, cols) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var currentHeaders = lastCol > 0
    ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String)
    : [];

  // Se cabeçalhos já batem na ordem certa, nada a fazer.
  var jaIguais = currentHeaders.length === cols.length &&
    cols.every(function(c, i) { return currentHeaders[i] === c; });
  if (jaIguais) return;

  // Caso 1: aba sem dados (apenas cabeçalho ou completamente vazia).
  if (lastRow <= 1) {
    if (lastCol > cols.length) {
      sheet.deleteColumns(cols.length + 1, lastCol - cols.length);
    }
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, cols.length)
      .setFontWeight('bold')
      .setBackground('#1A1A1A')
      .setFontColor('#C5A04A');
    return;
  }

  // Caso 2: já tem dados — insere apenas colunas faltantes na posição certa.
  for (var i = 0; i < cols.length; i++) {
    var col = cols[i];
    if (currentHeaders.indexOf(col) >= 0) continue;
    var posicaoDestino = i + 1;
    sheet.insertColumnBefore(posicaoDestino);
    sheet.getRange(1, posicaoDestino).setValue(col)
      .setFontWeight('bold').setBackground('#1A1A1A').setFontColor('#C5A04A');
    // re-lê cabeçalhos atualizados
    currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  }
}

function _rowToObj(row, cols) {
  var obj = {};
  for (var i = 0; i < cols.length; i++) {
    var v = row[i];
    if (v instanceof Date) v = _fmtDate(v);
    obj[cols[i]] = v;
  }
  obj.id    = Number(obj.id) || obj.id;
  obj.ativo = (obj.ativo === true || String(obj.ativo).toUpperCase() === 'TRUE');
  return obj;
}

function _findRow(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (Number(ids[i][0]) === Number(id)) return i + 2;
  }
  return -1;
}

function _nextId(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var max = 0;
  for (var i = 0; i < ids.length; i++) {
    var n = Number(ids[i][0]);
    if (n > max) max = n;
  }
  return max + 1;
}

function _fmtDate(d) {
  var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

function _now() { return _fmtDate(new Date()); }

function _parseBody(e) {
  if (!e) return {};
  if (e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (_) {}
  }
  return e.parameter || {};
}

function _ok(data) {
  return _jsonOut(Object.assign({ ok: true }, data));
}

function _err(ex) {
  var msg = (ex && ex.message) ? ex.message : String(ex);
  return _jsonOut({ ok: false, error: msg });
}

function _jsonOut(obj) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

// ============================================================
// SETUP — rode setupPlanilha() UMA VEZ pelo editor
// ============================================================

/**
 * Cria e formata as abas "Prospeccao", "ContasPagar" e "Clientes".
 * Selecione esta função no editor do Apps Script e clique Executar.
 */
function setupPlanilha() {
  _setupProspeccao();
  _setupContasPagar();
  _setupClientes();
  SpreadsheetApp.getActive().toast(
    'Abas Prospeccao, ContasPagar e Clientes configuradas! Agora implante como Web App.',
    'Reverse Engenharia', 8
  );
}

function _setupProspeccao() {
  var sheet = _getSheet(SHEET_PROSP, COLS_PROSP);

  // Larguras
  var widths = {
    empresa: 200, contato_nome: 150, contato_cargo: 130, telefone: 130,
    email: 200, cidade: 130, segmento: 140, tipo_servico: 180,
    origem: 120, status: 150, website: 180, linkedin: 180, instagram: 150,
    proximo_followup: 130, historico: 350, obs: 250,
    criado_em: 150, atualizado_em: 150,
  };
  Object.keys(widths).forEach(function(col) {
    var idx = COLS_PROSP.indexOf(col) + 1;
    if (idx > 0) sheet.setColumnWidth(idx, widths[col]);
  });

  // Dropdown ORIGEM
  var origens = ['LinkedIn', 'Google Maps', 'Indicação', 'Evento', 'Site', 'Outro'];
  sheet.getRange(2, COLS_PROSP.indexOf('origem') + 1, 1000, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(origens, true).build()
  );

  // Dropdown STATUS
  var statuses = ['Novo', 'Pesquisado', '1ª abordagem', 'Em conversa',
    'Proposta enviada', 'Quente', 'Frio', 'Convertido', 'Perdido'];
  var statusRange = sheet.getRange(2, COLS_PROSP.indexOf('status') + 1, 1000, 1);
  statusRange.setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(statuses, true).build()
  );

  // Formatação condicional STATUS
  var corStatus = {
    'Novo': '#E8F0FE', 'Pesquisado': '#D2E3FC', '1ª abordagem': '#FEEFC3',
    'Em conversa': '#FDE293', 'Proposta enviada': '#FBBC04',
    'Quente': '#EA4335', 'Frio': '#BDC1C6', 'Convertido': '#34A853', 'Perdido': '#5F6368',
  };
  var rules = sheet.getConditionalFormatRules();
  Object.keys(corStatus).forEach(function(s) {
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo(s)
        .setBackground(corStatus[s])
        .setFontColor(['Quente', 'Convertido', 'Perdido'].indexOf(s) >= 0 ? '#FFFFFF' : '#1A1A1A')
        .setRanges([statusRange])
        .build()
    );
  });
  sheet.setConditionalFormatRules(rules);

  // Dropdown ATIVO
  sheet.getRange(2, COLS_PROSP.indexOf('ativo') + 1, 1000, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['TRUE', 'FALSE'], true).build()
  );
}

function _setupContasPagar() {
  var sheet = _getSheet(SHEET_CP, COLS_CP);

  // Larguras
  var widths = {
    descricao: 280, categoria: 120, fornecedor: 180, valor: 100,
    vencimento: 120, status: 110, pago_em: 120, forma_pgto: 130,
    recorrencia: 100, parcela_nr: 80, parcela_total: 80,
    anexo_url: 200, obs: 250, criado_em: 150, atualizado_em: 150,
  };
  Object.keys(widths).forEach(function(col) {
    var idx = COLS_CP.indexOf(col) + 1;
    if (idx > 0) sheet.setColumnWidth(idx, widths[col]);
  });

  // Dropdown CATEGORIA
  var cats = ['Fornecedor', 'Salário', 'Aluguel', 'Software', 'Impostos', 'Material', 'Frete', 'Outros'];
  sheet.getRange(2, COLS_CP.indexOf('categoria') + 1, 1000, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(cats, true).build()
  );

  // Dropdown STATUS
  var statuses = ['pendente', 'pago', 'atrasado'];
  var statusRange = sheet.getRange(2, COLS_CP.indexOf('status') + 1, 1000, 1);
  statusRange.setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(statuses, true).build()
  );

  // Formatação condicional STATUS
  var corStatus = { 'pago': '#34A853', 'atrasado': '#EA4335', 'pendente': '#FEEFC3' };
  var cpRules = sheet.getConditionalFormatRules();
  Object.keys(corStatus).forEach(function(s) {
    cpRules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo(s)
        .setBackground(corStatus[s])
        .setFontColor(s === 'pago' || s === 'atrasado' ? '#FFFFFF' : '#1A1A1A')
        .setRanges([statusRange])
        .build()
    );
  });
  sheet.setConditionalFormatRules(cpRules);

  // Dropdown FORMA_PGTO
  var formas = ['PIX', 'Boleto', 'Cartão', 'Dinheiro', 'Transferência'];
  sheet.getRange(2, COLS_CP.indexOf('forma_pgto') + 1, 1000, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(formas, true).build()
  );

  // Dropdown ATIVO
  sheet.getRange(2, COLS_CP.indexOf('ativo') + 1, 1000, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['TRUE', 'FALSE'], true).build()
  );
}

function _setupClientes() {
  var sheet = _getSheet(SHEET_CLI, COLS_CLI);

  // Larguras
  var widths = {
    nome: 220, contato_nome: 170, cnpj_cpf: 150, telefone: 130, email: 200,
    cidade: 140, segmento: 160, status: 110, obs: 260, criado_em: 150, atualizado_em: 150,
  };
  Object.keys(widths).forEach(function(col) {
    var idx = COLS_CLI.indexOf(col) + 1;
    if (idx > 0) sheet.setColumnWidth(idx, widths[col]);
  });

  // Dropdown STATUS
  var statuses = ['lead', 'prospecto', 'ativo', 'inativo'];
  var statusRange = sheet.getRange(2, COLS_CLI.indexOf('status') + 1, 1000, 1);
  statusRange.setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(statuses, true).build()
  );

  // Formatação condicional STATUS
  var corStatus = {
    'lead':      '#FEEFC3',
    'prospecto': '#D2E3FC',
    'ativo':     '#34A853',
    'inativo':   '#BDC1C6',
  };
  var cliRules = sheet.getConditionalFormatRules();
  Object.keys(corStatus).forEach(function(s) {
    cliRules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo(s)
        .setBackground(corStatus[s])
        .setFontColor(s === 'ativo' ? '#FFFFFF' : '#1A1A1A')
        .setRanges([statusRange])
        .build()
    );
  });
  sheet.setConditionalFormatRules(cliRules);

  // Dropdown ATIVO
  sheet.getRange(2, COLS_CLI.indexOf('ativo') + 1, 1000, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['TRUE', 'FALSE'], true).build()
  );
}
