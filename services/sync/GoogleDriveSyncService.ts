import { storageRepository, STORAGE_KEYS } from '../storageRepository';
import {
  WorkoutRaw,
  WorkoutProgress,
  WorkoutAnnotations,
  WorkoutRPEValues,
  WorkoutLoadValues,
  WorkoutLoadUnits,
  WorkoutDoneStatus,
  ExerciseHistoryMap,
  OneRmValues,
  ViewMode,
} from '../../types';

export interface SyncResult {
  success: boolean;
  message: string;
  stats?: {
    workoutsCount?: number;
    historyCount?: number;
    completedCount?: number;
  };
}

export interface IronTrackBackupPayload {
  version: string;
  exportedAt: string;
  summary: {
    totalWorkouts: number;
    totalHistoryEntries: number;
    completedCount: number;
    skippedCount: number;
  };
  workouts: WorkoutRaw[];
  progress: WorkoutProgress;
  annotations: WorkoutAnnotations;
  rpeValues: WorkoutRPEValues;
  loadValues: WorkoutLoadValues;
  loadUnits: WorkoutLoadUnits;
  completionOrder: string[];
  selection: { week: number | null; day: string | null };
  viewMode: ViewMode;
  exerciseHistory: ExerciseHistoryMap;
  oneRmValues: OneRmValues;
  doneStatus: WorkoutDoneStatus;
}

export class GoogleDriveSyncService {
  static async getWebhookUrl(): Promise<string> {
    const url = await storageRepository.get<string>(STORAGE_KEYS.googleWebhookUrl);
    return url || '';
  }

  static async setWebhookUrl(url: string): Promise<void> {
    await storageRepository.set(STORAGE_KEYS.googleWebhookUrl, url.trim());
  }

  static async getLastSyncTimestamp(): Promise<string | null> {
    return await storageRepository.get<string>(STORAGE_KEYS.lastSyncTimestamp);
  }

  static async getLastSyncSummary(): Promise<string | null> {
    return await storageRepository.get<string>(STORAGE_KEYS.lastSyncSummary);
  }

  /**
   * Testa a conectividade com o webhook do Google Apps Script
   */
  static async testConnection(url: string): Promise<{ success: boolean; message: string }> {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      return { success: false, message: 'URL do Webhook não configurada.' };
    }

    if (!cleanUrl.startsWith('https://script.google.com/')) {
      return {
        success: false,
        message: 'A URL deve iniciar com "https://script.google.com/macros/s/..."',
      };
    }

    try {
      const response = await fetch(cleanUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok && response.status !== 404) {
        return {
          success: false,
          message: `O servidor retornou status HTTP ${response.status}. Verifique se a implantação está acessível por "Qualquer pessoa".`,
        };
      }

      const text = await response.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        // Redirecionamento 200/302 sem JSON ainda indica conectividade
      }

      if (json && json.success === false && json.message && json.message.includes('Nenhum arquivo')) {
        return {
          success: true,
          message: 'Conexão estabelecida com sucesso! O Webhook está ativo e pronto para sincronizar.',
        };
      }

      return {
        success: true,
        message: 'Conexão com o Google Apps Script testada e aprovada!',
      };
    } catch (err: any) {
      console.error('[GoogleDriveSyncService] Erro ao testar conexão:', err);
      return {
        success: false,
        message: `Falha na conexão: ${err?.message || 'Verifique sua conexão com a internet e a URL.'}`,
      };
    }
  }

  /**
   * Monta o payload completo com todos os dados do IronTrack para backup
   */
  static async getFullBackupPayload(): Promise<IronTrackBackupPayload> {
    const [
      workouts,
      progress,
      annotations,
      rpeValues,
      loadValues,
      loadUnits,
      completionOrder,
      selection,
      viewMode,
      exerciseHistory,
      oneRmValues,
      doneStatus,
    ] = await Promise.all([
      storageRepository.get<WorkoutRaw[]>(STORAGE_KEYS.data),
      storageRepository.get<WorkoutProgress>(STORAGE_KEYS.progress),
      storageRepository.get<WorkoutAnnotations>(STORAGE_KEYS.annotations),
      storageRepository.get<WorkoutRPEValues>(STORAGE_KEYS.rpeValues),
      storageRepository.get<WorkoutLoadValues>(STORAGE_KEYS.loadValues),
      storageRepository.get<WorkoutLoadUnits>(STORAGE_KEYS.loadUnits),
      storageRepository.get<string[]>(STORAGE_KEYS.completionOrder),
      storageRepository.get<{ week: number | null; day: string | null }>(STORAGE_KEYS.selection),
      storageRepository.get<ViewMode>(STORAGE_KEYS.viewMode),
      storageRepository.get<ExerciseHistoryMap>(STORAGE_KEYS.exerciseHistory),
      storageRepository.get<OneRmValues>(STORAGE_KEYS.oneRmValues),
      storageRepository.get<WorkoutDoneStatus>(STORAGE_KEYS.doneStatus),
    ]);

    const activeWorkouts = workouts || [];
    const activeProgress = progress || {};
    const activeDoneStatus = doneStatus || {};

    let completedCount = 0;
    let skippedCount = 0;
    for (const w of activeWorkouts) {
      const sets = activeProgress[w.id] || [];
      const allDone = sets.length >= w.total_sets && sets.every(Boolean);
      if (activeDoneStatus[w.id] === 'undone') {
        skippedCount++;
      } else if (allDone || activeDoneStatus[w.id] === 'done') {
        completedCount++;
      }
    }

    const historyEntries = Object.values(exerciseHistory || {}).reduce(
      (acc, list) => acc + (Array.isArray(list) ? list.length : 0),
      0,
    );

    return {
      version: '0.5.2',
      exportedAt: new Date().toISOString(),
      summary: {
        totalWorkouts: activeWorkouts.length,
        totalHistoryEntries: historyEntries,
        completedCount,
        skippedCount,
      },
      workouts: activeWorkouts,
      progress: activeProgress,
      annotations: annotations || {},
      rpeValues: rpeValues || {},
      loadValues: loadValues || {},
      loadUnits: loadUnits || {},
      completionOrder: completionOrder || [],
      selection: selection || { week: null, day: null },
      viewMode: viewMode || 'classic',
      exerciseHistory: exerciseHistory || {},
      oneRmValues: oneRmValues || { squat: '', bench: '', deadlift: '' },
      doneStatus: activeDoneStatus,
    };
  }

  /**
   * Envia os dados atuais para o Google Sheets e Google Drive
   */
  static async syncToGoogleSheets(): Promise<SyncResult> {
    const webhookUrl = await this.getWebhookUrl();
    if (!webhookUrl || !webhookUrl.trim()) {
      return {
        success: false,
        message: 'URL do Google Sheets Webhook não configurada. Configure antes de sincronizar.',
      };
    }

    try {
      const payload = await this.getFullBackupPayload();

      // Envia como text/plain para contornar restrições de CORS do Google Apps Script
      const response = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let resJson: any = null;
      try {
        resJson = JSON.parse(responseText);
      } catch {
        // Formato não JSON
      }

      if (resJson && resJson.success === false) {
        return {
          success: false,
          message: resJson.message || 'Erro reportado pelo script do Google.',
        };
      }

      const nowIso = new Date().toISOString();
      const statsSummary = `${payload.summary.totalWorkouts} exercícios, ${payload.summary.completedCount} concluídos, ${payload.summary.totalHistoryEntries} logs no histórico`;

      await storageRepository.set(STORAGE_KEYS.lastSyncTimestamp, nowIso);
      await storageRepository.set(STORAGE_KEYS.lastSyncSummary, statsSummary);

      return {
        success: true,
        message: `Dados sincronizados com sucesso na sua Planilha Google Sheets e no Google Drive! (${statsSummary})`,
        stats: {
          workoutsCount: payload.summary.totalWorkouts,
          historyCount: payload.summary.totalHistoryEntries,
          completedCount: payload.summary.completedCount,
        },
      };
    } catch (err: any) {
      console.error('[GoogleDriveSyncService] Erro ao sincronizar:', err);
      return {
        success: false,
        message: `Falha ao sincronizar com Google Sheets: ${err?.message || 'Erro desconhecido'}`,
      };
    }
  }

  /**
   * Restaura todos os dados do Google Drive diretamente no storage
   */
  static async restoreFromGoogleSheets(): Promise<SyncResult> {
    const webhookUrl = await this.getWebhookUrl();
    if (!webhookUrl || !webhookUrl.trim()) {
      return {
        success: false,
        message: 'URL do Google Sheets Webhook não configurada.',
      };
    }

    try {
      const response = await fetch(webhookUrl.trim(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          message: `Falha ao acessar o backup no Google Drive (HTTP ${response.status}).`,
        };
      }

      const responseText = await response.text();
      let resJson: any = null;
      try {
        resJson = JSON.parse(responseText);
      } catch {
        return {
          success: false,
          message: 'A resposta do Google não é um JSON válido. Verifique a URL do Webhook.',
        };
      }

      if (resJson.success === false) {
        return {
          success: false,
          message: resJson.message || 'Nenhum backup encontrado no Google Drive.',
        };
      }

      const backupData: IronTrackBackupPayload = resJson.data || resJson;
      return await this.importBackupPayload(backupData);
    } catch (err: any) {
      console.error('[GoogleDriveSyncService] Erro ao restaurar do Google:', err);
      return {
        success: false,
        message: `Falha ao restaurar dados do Google Drive: ${err?.message || 'Erro desconhecido'}`,
      };
    }
  }

  /**
   * Importa o payload de backup para o armazenamento local
   */
  static async importBackupPayload(payload: IronTrackBackupPayload): Promise<SyncResult> {
    if (!payload || !Array.isArray(payload.workouts)) {
      return {
        success: false,
        message: 'Arquivo de backup inválido ou sem exercícios.',
      };
    }

    try {
      await Promise.all([
        storageRepository.set(STORAGE_KEYS.data, payload.workouts || []),
        storageRepository.set(STORAGE_KEYS.progress, payload.progress || {}),
        storageRepository.set(STORAGE_KEYS.annotations, payload.annotations || {}),
        storageRepository.set(STORAGE_KEYS.rpeValues, payload.rpeValues || {}),
        storageRepository.set(STORAGE_KEYS.loadValues, payload.loadValues || {}),
        storageRepository.set(STORAGE_KEYS.loadUnits, payload.loadUnits || {}),
        storageRepository.set(STORAGE_KEYS.completionOrder, payload.completionOrder || []),
        storageRepository.set(STORAGE_KEYS.selection, payload.selection || { week: null, day: null }),
        storageRepository.set(STORAGE_KEYS.viewMode, payload.viewMode || 'classic'),
        storageRepository.set(STORAGE_KEYS.exerciseHistory, payload.exerciseHistory || {}),
        storageRepository.set(STORAGE_KEYS.oneRmValues, payload.oneRmValues || { squat: '', bench: '', deadlift: '' }),
        storageRepository.set(STORAGE_KEYS.doneStatus, payload.doneStatus || {}),
      ]);

      const nowIso = new Date().toISOString();
      const historyCount = Object.values(payload.exerciseHistory || {}).reduce(
        (acc, list) => acc + (Array.isArray(list) ? list.length : 0),
        0,
      );
      const statsSummary = `${payload.workouts.length} exercícios, ${payload.completionOrder?.length || 0} concluídos, ${historyCount} registros`;

      await storageRepository.set(STORAGE_KEYS.lastSyncTimestamp, nowIso);
      await storageRepository.set(STORAGE_KEYS.lastSyncSummary, statsSummary);

      // Notifica componentes que os dados foram restaurados
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('irontrack:data-restored'));
      }

      return {
        success: true,
        message: `Backup restaurado com sucesso! (${statsSummary})`,
        stats: {
          workoutsCount: payload.workouts.length,
          historyCount,
          completedCount: payload.completionOrder?.length || 0,
        },
      };
    } catch (err: any) {
      console.error('[GoogleDriveSyncService] Erro ao gravar dados restaurados:', err);
      return {
        success: false,
        message: `Erro ao gravar dados no armazenamento local: ${err?.message || 'Erro desconhecido'}`,
      };
    }
  }
}
