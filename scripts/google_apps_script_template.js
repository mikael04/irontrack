/**
 * IRONTRACK - GOOGLE APPS SCRIPT WEBHOOK SCRIPT
 * 
 * Este script sincroniza os dados do aplicativo IronTrack diretamente na sua conta
 * pessoal do Google Drive e em uma Planilha Google Sheets formatada.
 * 
 * INSTRUÇÕES DE INSTALAÇÃO:
 * 1. Acesse https://script.google.com/ e clique em "Novo projeto".
 * 2. Apague o código padrão e cole todo este arquivo.
 * 3. Clique em "Implantar" (canto superior direito) > "Nova implantação".
 * 4. Selecione o tipo "Aplicativo da Web".
 * 5. Configure:
 *    - Descrição: IronTrack Sync Webhook
 *    - Executar como: "Eu" (seu e-mail)
 *    - Quem pode acessar: "Qualquer pessoa" (ou "Qualquer um com o link")
 * 6. Clique em "Implantar", autorize as permissões da sua própria conta Google
 *    e copie o "URL do aplicativo da Web".
 * 7. Cole a URL no IronTrack (Configurações > Sincronização Google Sheets).
 */

const SPREADSHEET_NAME = "IronTrack - Treinos & Histórico";
const BACKUP_FILE_NAME = "irontrack_sync_backup.json";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, message: "Corpo da requisição vazio." }, 400);
    }

    const payload = JSON.parse(e.postData.contents);
    
    // 1. Localiza ou cria a planilha no Google Drive
    const ss = getOrCreateSpreadsheet(SPREADSHEET_NAME);
    
    // 2. Atualiza a Aba "Treinos Atuais"
    updateWorkoutsSheet(ss, payload);
    
    // 3. Atualiza a Aba "Histórico de Treinos"
    updateHistorySheet(ss, payload.exerciseHistory || {});
    
    // 4. Atualiza a Aba "1RM & Percentuais"
    updateOneRmSheet(ss, payload.oneRmValues || {});
    
    // 5. Atualiza a Aba "Resumo & Metadados"
    updateSummarySheet(ss, payload);
    
    // 6. Salva o arquivo de backup completo JSON no Google Drive
    saveBackupJsonToDrive(payload);

    const totalWorkouts = (payload.workouts || []).length;
    const totalHistory = Object.values(payload.exerciseHistory || {}).reduce(function(acc, list) {
      return acc + (Array.isArray(list) ? list.length : 0);
    }, 0);

    return jsonResponse({
      success: true,
      message: "Sincronização com o Google Sheets e Google Drive realizada com sucesso!",
      timestamp: new Date().toISOString(),
      stats: {
        workoutsCount: totalWorkouts,
        historyCount: totalHistory,
        completedCount: (payload.completionOrder || []).length
      }
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      message: "Erro no script do Google: " + err.toString()
    }, 500);
  }
}

function doGet(e) {
  try {
    // Retorna o backup JSON completo para restauração do app em outro dispositivo
    const files = DriveApp.getFilesByName(BACKUP_FILE_NAME);
    if (!files.hasNext()) {
      return jsonResponse({
        success: false,
        message: "Nenhum arquivo de backup (" + BACKUP_FILE_NAME + ") encontrado no seu Google Drive."
      }, 404);
    }

    const file = files.next();
    const content = file.getBlob().getDataAsString();
    const data = JSON.parse(content);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: data
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return jsonResponse({
      success: false,
      message: "Erro ao ler backup do Google Drive: " + err.toString()
    }, 500);
  }
}

function jsonResponse(obj, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSpreadsheet(name) {
  const files = DriveApp.getFilesByName(name);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  }
  const newSheet = SpreadsheetApp.create(name);
  return newSheet;
}

function updateWorkoutsSheet(ss, payload) {
  let sheet = ss.getSheetByName("Treinos Atuais");
  if (!sheet) {
    sheet = ss.insertSheet("Treinos Atuais");
  }
  sheet.clear();

  const headers = [
    "Semana",
    "Dia",
    "Foco",
    "Exercício",
    "Séries",
    "Repetições",
    "Prep",
    "Carga %",
    "Carga",
    "Tipo de Carga",
    "RPE",
    "Descanso",
    "Status",
    "Séries Feitas",
    "Anotação / Log"
  ];

  const rows = [headers];

  const workouts = payload.workouts || [];
  const progress = payload.progress || {};
  const annotations = payload.annotations || {};
  const rpeValues = payload.rpeValues || {};
  const loadValues = payload.loadValues || {};
  const loadUnits = payload.loadUnits || {};
  const doneStatus = payload.doneStatus || {};

  for (let i = 0; i < workouts.length; i++) {
    const w = workouts[i];
    const sets = progress[w.id] || [];
    const completedSets = sets.filter(Boolean).length;
    const seriesFeitasStr = completedSets + "/" + w.total_sets;

    let status = "Não";
    if (doneStatus[w.id] === "undone") {
      status = "Pulado";
    } else if (completedSets >= w.total_sets || doneStatus[w.id] === "done") {
      status = "Sim";
    }

    const rpe = rpeValues[w.id] !== undefined ? rpeValues[w.id] : (w.rpe || "-");
    const loadKg = loadValues[w.id] !== undefined ? loadValues[w.id] : (w.load_kg || "-");
    const loadUnit = loadUnits[w.id] || w.load_unit_selected || w.load_unit || "kg";
    const note = annotations[w.id] || "";

    rows.push([
      w.week,
      w.day,
      w.focus,
      w.exercise,
      w.total_sets,
      w.reps,
      w.prep || "-",
      w.load_pct || "-",
      loadKg,
      loadUnit,
      rpe,
      w.rest || "-",
      status,
      seriesFeitasStr,
      note
    ]);
  }

  if (rows.length > 1) {
    sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  } else {
    sheet.getRange(1, 1, 1, headers.length).setValues(rows);
  }

  formatHeaderRow(sheet, headers.length, "#059669");
  sheet.autoResizeColumns(1, headers.length);
}

function updateHistorySheet(ss, historyMap) {
  let sheet = ss.getSheetByName("Histórico de Treinos");
  if (!sheet) {
    sheet = ss.insertSheet("Histórico de Treinos");
  }
  sheet.clear();

  const headers = [
    "Data / Horário",
    "Exercício",
    "Repetições",
    "Carga",
    "Unidade",
    "Séries Feitas",
    "Séries Totais",
    "RPE",
    "Anotação / Comentário"
  ];

  const rows = [headers];
  const allEntries = [];

  const keys = Object.keys(historyMap);
  for (let k = 0; k < keys.length; k++) {
    const list = historyMap[keys[k]];
    if (Array.isArray(list)) {
      for (let j = 0; j < list.length; j++) {
        allEntries.push(list[j]);
      }
    }
  }

  // Ordena por data decrescente (mais recente primeiro)
  allEntries.sort(function(a, b) {
    return new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime();
  });

  for (let i = 0; i < allEntries.length; i++) {
    const item = allEntries[i];
    let formattedDate = item.completedAt || "";
    try {
      if (item.completedAt) {
        const d = new Date(item.completedAt);
        formattedDate = Utilities.formatDate(d, Session.getScriptTimeZone() || "GMT-3", "yyyy-MM-dd HH:mm");
      }
    } catch (e) {}

    rows.push([
      formattedDate,
      item.exerciseName || "",
      item.reps || "-",
      item.loadValue || "0",
      item.loadUnit || "kg",
      item.setsDone !== undefined ? item.setsDone : 0,
      item.totalSets !== undefined ? item.totalSets : 0,
      item.rpe || "-",
      item.comment || ""
    ]);
  }

  if (rows.length > 1) {
    sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  } else {
    sheet.getRange(1, 1, 1, headers.length).setValues(rows);
  }

  formatHeaderRow(sheet, headers.length, "#2563EB");
  sheet.autoResizeColumns(1, headers.length);
}

function updateOneRmSheet(ss, oneRmValues) {
  let sheet = ss.getSheetByName("1RM & Percentuais");
  if (!sheet) {
    sheet = ss.insertSheet("1RM & Percentuais");
  }
  sheet.clear();

  const headers = [
    "Movimento",
    "1RM (100%)",
    "95%",
    "90%",
    "85%",
    "80%",
    "75%",
    "70%",
    "65%",
    "60%",
    "55%",
    "50%"
  ];

  const percentages = [1.0, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70, 0.65, 0.60, 0.55, 0.50];
  const rows = [headers];

  const movements = [
    { label: "Agachamento (Squat)", val: oneRmValues.squat },
    { label: "Supino (Bench Press)", val: oneRmValues.bench },
    { label: "Levantamento Terra (Deadlift)", val: oneRmValues.deadlift }
  ];

  for (let m = 0; m < movements.length; m++) {
    const item = movements[m];
    const baseValue = parseFloat((item.val || "").toString().replace(",", "."));
    const row = [item.label];

    if (!isNaN(baseValue) && baseValue > 0) {
      for (let p = 0; p < percentages.length; p++) {
        const calculated = Math.round(baseValue * percentages[p] * 2) / 2; // Arredonda para 0.5kg
        row.push(calculated + " kg");
      }
    } else {
      for (let p = 0; p < percentages.length; p++) {
        row.push("-");
      }
    }
    rows.push(row);
  }

  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  formatHeaderRow(sheet, headers.length, "#7C3AED");
  sheet.autoResizeColumns(1, headers.length);
}

function updateSummarySheet(ss, payload) {
  let sheet = ss.getSheetByName("Resumo & Metadados");
  if (!sheet) {
    sheet = ss.insertSheet("Resumo & Metadados");
  }
  sheet.clear();

  const headers = ["Métrica / Informação", "Valor"];
  const workouts = payload.workouts || [];
  const doneStatus = payload.doneStatus || {};
  const progress = payload.progress || {};

  let completedCount = 0;
  let skippedCount = 0;
  for (let i = 0; i < workouts.length; i++) {
    const id = workouts[i].id;
    const sets = progress[id] || [];
    const isAllDone = sets.length >= workouts[i].total_sets && sets.every(Boolean);
    if (doneStatus[id] === "undone") {
      skippedCount++;
    } else if (isAllDone || doneStatus[id] === "done") {
      completedCount++;
    }
  }

  const historyEntriesCount = Object.values(payload.exerciseHistory || {}).reduce(function(acc, list) {
    return acc + (Array.isArray(list) ? list.length : 0);
  }, 0);

  const rows = [
    headers,
    ["Aplicativo", "IronTrack"],
    ["Versão do Backup", payload.version || "0.5.2"],
    ["Última Sincronização", new Date().toLocaleString("pt-BR")],
    ["Total de Exercícios no Ciclo", workouts.length],
    ["Exercícios Concluídos", completedCount],
    ["Exercícios Pulados", skippedCount],
    ["Exercícios Pendentes", workouts.length - completedCount - skippedCount],
    ["Entradas no Histórico Acumulado", historyEntriesCount],
    ["Modo de Exibição Preferido", payload.viewMode || "classic"]
  ];

  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  formatHeaderRow(sheet, headers.length, "#0D9488");
  sheet.autoResizeColumns(1, headers.length);
}

function formatHeaderRow(sheet, colCount, headerColor) {
  const headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange.setBackground(headerColor);
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
}

function saveBackupJsonToDrive(payload) {
  const jsonString = JSON.stringify(payload, null, 2);
  const files = DriveApp.getFilesByName(BACKUP_FILE_NAME);
  if (files.hasNext()) {
    const file = files.next();
    file.setContent(jsonString);
  } else {
    DriveApp.createFile(BACKUP_FILE_NAME, jsonString, "application/json");
  }
}
