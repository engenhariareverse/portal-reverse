/**
 * Portal JOTEC — Módulo Prospecção
 * Google Apps Script Web App = API JSON para o Google Sheets
 *
 * COMO USAR:
 *   1. Abra sua planilha no Google Sheets
 *   2. Extensões → Apps Script
 *   3. Cole TODO este arquivo (substituindo o que estiver lá)
 *   4. Salve (Ctrl+S) e dê um nome ao projeto (ex: "JOTEC Prospeccao API")
 *   5. Implantar → Novo deploy → Tipo: App da Web
 *        - Executar como: Eu (sua conta)
 *        - Quem pode acessar: Qualquer pessoa
 *      → Implantar → autorize quando pedir
 *   6. Copie a "URL do app da Web" e cole na aba Configurações do Portal
 *
 * Endpoints:
 *   GET  ?action=ping                        → {ok: true, version: "..."}
 *   GET  ?action=list                        → {ok: true, data: [...contatos]}
 *   POST {action: "create", ...campos}       → {ok: true, data: {id, ...}}
 *   POST {action: "update", id, ...campos}   → {ok: true, data: {id, ...}}
 *   POST {action: "delete", id}              → {ok: true} (soft delete: ativo = FALSE)
 *
 * Schema da aba "Prospeccao" (linha 1 = cabeçalho — não mude a ordem das colunas):
 *   id | empresa | contato_nome | contato_cargo | telefone | email | cidade | uf |
 *   segmento | tipo_servico | origem | status | website | linkedin | instagram |
 *   proximo_followup | historico | obs | criado_em | atualizado_em | ativo
 */

const VERSION = '1.0.0';
const SHEET_NAME = 'Prospeccao';

const COLUMNS = [
  'id', 'empresa', 'contato_nome', 'contato_cargo', 'telefone', 'email',
  'cidade', 'uf', 'segmento', 'tipo_servico', 'origem', 'status',
  'website', 'linkedin', 'instagram', 'proximo_followup', 'historico',
  'obs', 'criado_em', 'atualizado_em', 'ativo'
];

// ============================================================
// ENTRADAS HTTP
// ============================================================

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'ping';
    if (action === 'ping') return jsonOut({ ok: true, version: VERSION });
    if (action === 'list') return jsonOut({ ok: true, data: listAtivos() });
    return jsonOut({ ok: false, error: 'Ação desconhecida: ' + action }, 400);
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message || err) }, 500);
  }
}

function doPost(e) {
  try {
    const body = parseBody(e);
    const action = body.action;
    if (action === 'create') return jsonOut({ ok: true, data: createRow(body) });
    if (action === 'update') return jsonOut({ ok: true, data: updateRow(body) });
    if (action === 'delete') {
      deleteRow(body);
      return jsonOut({ ok: true });
    }
    return jsonOut({ ok: false, error: 'Ação desconhecida: ' + action }, 400);
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message || err) }, 500);
  }
}

// ============================================================
// AÇÕES
// ============================================================

function listAtivos() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).getValues();
  const out = [];
  for (let i = 0; i < values.length; i++) {
    const obj = rowToObj(values[i]);
    if (obj.ativo !== false && String(obj.ativo).toUpperCase() !== 'FALSE') {
      out.push(obj);
    }
  }
  return out;
}

function createRow(payload) {
  if (!payload.empresa && !payload.contato_nome && !payload.telefone) {
    throw new Error('Informe ao menos empresa, contato ou telefone');
  }
  const sheet = getSheet();
  const id = nextId(sheet);
  const now = nowBR();
  const record = {};
  COLUMNS.forEach(function (c) { record[c] = ''; });
  COLUMNS.forEach(function (c) {
    if (payload[c] !== undefined && payload[c] !== null) record[c] = payload[c];
  });
  record.id = id;
  record.criado_em = now;
  record.atualizado_em = now;
  record.ativo = true;
  sheet.appendRow(COLUMNS.map(function (c) { return record[c]; }));
  return record;
}

function updateRow(payload) {
  const id = Number(payload.id);
  if (!id) throw new Error('id é obrigatório no update');
  const sheet = getSheet();
  const rowIndex = findRowIndexById(sheet, id);
  if (rowIndex < 0) throw new Error('id não encontrado: ' + id);
  const current = rowToObj(sheet.getRange(rowIndex, 1, 1, COLUMNS.length).getValues()[0]);
  COLUMNS.forEach(function (c) {
    if (c === 'id' || c === 'criado_em') return;
    if (payload[c] !== undefined) current[c] = payload[c];
  });
  current.atualizado_em = nowBR();
  sheet.getRange(rowIndex, 1, 1, COLUMNS.length)
    .setValues([COLUMNS.map(function (c) { return current[c]; })]);
  return current;
}

function deleteRow(payload) {
  const id = Number(payload.id);
  if (!id) throw new Error('id é obrigatório no delete');
  const sheet = getSheet();
  const rowIndex = findRowIndexById(sheet, id);
  if (rowIndex < 0) throw new Error('id não encontrado: ' + id);
  const ativoCol = COLUMNS.indexOf('ativo') + 1;
  const atualizadoCol = COLUMNS.indexOf('atualizado_em') + 1;
  sheet.getRange(rowIndex, ativoCol).setValue(false);
  sheet.getRange(rowIndex, atualizadoCol).setValue(nowBR());
}

// ============================================================
// HELPERS
// ============================================================

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function rowToObj(row) {
  const obj = {};
  for (let i = 0; i < COLUMNS.length; i++) {
    let v = row[i];
    if (v instanceof Date) v = formatDate(v);
    obj[COLUMNS[i]] = v;
  }
  obj.id = Number(obj.id) || obj.id;
  obj.ativo = (obj.ativo === true || String(obj.ativo).toUpperCase() === 'TRUE');
  return obj;
}

function findRowIndexById(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (Number(ids[i][0]) === Number(id)) return i + 2;
  }
  return -1;
}

function nextId(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let max = 0;
  for (let i = 0; i < ids.length; i++) {
    const n = Number(ids[i][0]);
    if (n > max) max = n;
  }
  return max + 1;
}

function nowBR() {
  return formatDate(new Date());
}

function formatDate(d) {
  // ISO local sem timezone shift: YYYY-MM-DD HH:mm:ss
  const pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

function parseBody(e) {
  if (!e) return {};
  if (e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (_) {}
  }
  // fallback: form-urlencoded ou query string
  return e.parameter || {};
}

function jsonOut(obj, status) {
  // Apps Script ContentService não suporta status codes customizados,
  // mas o ok:false no JSON já comunica erro pro cliente.
  const out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

// ============================================================
// SETUP INICIAL — rode UMA VEZ pelo editor do Apps Script
// ============================================================

/**
 * Cria a aba "Prospeccao" com cabeçalho, congela linha 1,
 * aplica validações (dropdowns) e formatação condicional por status.
 * RODE UMA VEZ: selecione esta função no editor e clique Executar.
 */
function setupPlanilha() {
  const sheet = getSheet();

  // garante cabeçalho
  sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, COLUMNS.length)
    .setFontWeight('bold')
    .setBackground('#1A1A1A')
    .setFontColor('#C5A04A');

  // larguras razoáveis
  const widths = {
    empresa: 200, contato_nome: 150, contato_cargo: 130, telefone: 130,
    email: 200, cidade: 130, segmento: 140, tipo_servico: 180,
    origem: 120, status: 150, website: 180, linkedin: 180, instagram: 150,
    proximo_followup: 130, historico: 350, obs: 250,
    criado_em: 150, atualizado_em: 150
  };
  Object.keys(widths).forEach(function (col) {
    const idx = COLUMNS.indexOf(col) + 1;
    if (idx > 0) sheet.setColumnWidth(idx, widths[col]);
  });

  // dropdown ORIGEM
  const origens = ['LinkedIn', 'Google Maps', 'Indicação', 'Evento', 'Site', 'Outro'];
  const origemCol = COLUMNS.indexOf('origem') + 1;
  const rangeOrigem = sheet.getRange(2, origemCol, 1000, 1);
  rangeOrigem.setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(origens, true).build()
  );

  // dropdown STATUS
  const statuses = ['Novo', 'Pesquisado', '1ª abordagem', 'Em conversa',
    'Proposta enviada', 'Quente', 'Frio', 'Convertido', 'Perdido'];
  const statusCol = COLUMNS.indexOf('status') + 1;
  const rangeStatus = sheet.getRange(2, statusCol, 1000, 1);
  rangeStatus.setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(statuses, true).build()
  );

  // formatação condicional STATUS (cores)
  const corStatus = {
    'Novo': '#E8F0FE',
    'Pesquisado': '#D2E3FC',
    '1ª abordagem': '#FEEFC3',
    'Em conversa': '#FDE293',
    'Proposta enviada': '#FBBC04',
    'Quente': '#EA4335',
    'Frio': '#BDC1C6',
    'Convertido': '#34A853',
    'Perdido': '#5F6368'
  };
  const rules = sheet.getConditionalFormatRules();
  Object.keys(corStatus).forEach(function (s) {
    const rule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(s)
      .setBackground(corStatus[s])
      .setFontColor(s === 'Quente' || s === 'Convertido' || s === 'Perdido' ? '#FFFFFF' : '#1A1A1A')
      .setRanges([rangeStatus])
      .build();
    rules.push(rule);
  });
  sheet.setConditionalFormatRules(rules);

  // dropdown ATIVO
  const ativoCol = COLUMNS.indexOf('ativo') + 1;
  const rangeAtivo = sheet.getRange(2, ativoCol, 1000, 1);
  rangeAtivo.setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['TRUE', 'FALSE'], true).build()
  );

  SpreadsheetApp.getActive().toast('Planilha configurada! Já pode implantar o app da Web.', 'JOTEC', 5);
}
