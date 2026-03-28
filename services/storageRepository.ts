import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const DB_NAME = 'irontrack_db';
const DB_VERSION = 1;
const TABLE_NAME = 'kv_store';

const SQLITE_MIGRATION_FLAG_KEY = 'irontrack_sqlite_migrated_v1';

export const STORAGE_KEYS = {
  data: 'irontrack_data',
  progress: 'irontrack_progress',
  completionOrder: 'irontrack_completion_order',
  selection: 'irontrack_selection',
  annotations: 'irontrack_annotations',
  rpeValues: 'irontrack_rpe_values',
  loadValues: 'irontrack_load_values',
  loadUnits: 'irontrack_load_units',
  viewMode: 'irontrack_view_mode',
  exerciseHistory: 'irontrack_exercise_history',
  oneRmValues: 'irontrack_one_rm_values',
} as const;

export const LEGACY_PREFERENCES_KEYS: string[] = [
  STORAGE_KEYS.data,
  STORAGE_KEYS.progress,
  STORAGE_KEYS.completionOrder,
  STORAGE_KEYS.selection,
  STORAGE_KEYS.annotations,
  STORAGE_KEYS.rpeValues,
  STORAGE_KEYS.loadValues,
  STORAGE_KEYS.loadUnits,
  STORAGE_KEYS.viewMode,
  STORAGE_KEYS.exerciseHistory,
  STORAGE_KEYS.oneRmValues,
];

class StorageRepository {
  private initialized = false;
  private sqliteEnabled = false;
  private sqliteConnection: any = null;
  private sqliteDb: any = null;

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (Capacitor.isNativePlatform()) {
      await this.initSqlite();
    }

    this.initialized = true;
  }

  private async initSqlite(): Promise<void> {
    try {
      const sqliteModule = await import('@capacitor-community/sqlite');
      const sqliteConnection = new sqliteModule.SQLiteConnection(sqliteModule.CapacitorSQLite);

      const consistency = await sqliteConnection.checkConnectionsConsistency();
      const isConnection = await sqliteConnection.isConnection(DB_NAME, false);

      if (consistency.result && isConnection.result) {
        this.sqliteDb = await sqliteConnection.retrieveConnection(DB_NAME, false);
      } else {
        this.sqliteDb = await sqliteConnection.createConnection(
          DB_NAME,
          false,
          'no-encryption',
          DB_VERSION,
          false,
        );
      }

      await this.sqliteDb.open();
      await this.sqliteDb.execute(
        `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT,
          updated_at INTEGER NOT NULL
        );`,
      );

      this.sqliteConnection = sqliteConnection;
      this.sqliteEnabled = true;

      await this.migrateLegacyPreferencesToSqlite();
    } catch (error) {
      console.warn('SQLite init failed. Falling back to Preferences.', error);
      this.sqliteEnabled = false;
      this.sqliteConnection = null;
      this.sqliteDb = null;
    }
  }

  private async migrateLegacyPreferencesToSqlite(): Promise<void> {
    if (!this.sqliteEnabled) {
      return;
    }

    const migrationFlagRaw = await this.getSqliteRaw(SQLITE_MIGRATION_FLAG_KEY);
    if (migrationFlagRaw === 'true') {
      return;
    }

    for (const key of LEGACY_PREFERENCES_KEYS) {
      const { value } = await Preferences.get({ key });
      if (value !== null) {
        await this.setSqliteRaw(key, value);
      }
    }

    await this.setSqliteRaw(SQLITE_MIGRATION_FLAG_KEY, 'true');
  }

  private async setSqliteRaw(key: string, rawValue: string): Promise<void> {
    if (!this.sqliteEnabled || !this.sqliteDb) {
      return;
    }

    const now = Date.now();
    await this.sqliteDb.run(
      `INSERT INTO ${TABLE_NAME}(key, value, updated_at)
       VALUES(?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
      [key, rawValue, now],
    );
  }

  private async getSqliteRaw(key: string): Promise<string | null> {
    if (!this.sqliteEnabled || !this.sqliteDb) {
      return null;
    }

    const result = await this.sqliteDb.query(`SELECT value FROM ${TABLE_NAME} WHERE key = ? LIMIT 1;`, [key]);
    const first = result?.values?.[0];
    if (!first || typeof first.value !== 'string') {
      return null;
    }

    return first.value;
  }

  async get<T>(key: string): Promise<T | null> {
    await this.init();

    if (this.sqliteEnabled) {
      const rawValue = await this.getSqliteRaw(key);
      if (rawValue === null) {
        return null;
      }
      try {
        return JSON.parse(rawValue) as T;
      } catch {
        return null;
      }
    }

    const { value } = await Preferences.get({ key });
    if (value === null) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.init();
    const rawValue = JSON.stringify(value);

    if (this.sqliteEnabled) {
      await this.setSqliteRaw(key, rawValue);
      return;
    }

    await Preferences.set({ key, value: rawValue });
  }

  async remove(key: string): Promise<void> {
    await this.init();

    if (this.sqliteEnabled && this.sqliteDb) {
      await this.sqliteDb.run(`DELETE FROM ${TABLE_NAME} WHERE key = ?;`, [key]);
      return;
    }

    await Preferences.remove({ key });
  }

  async clearKeys(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.remove(key);
    }
  }
}

export const storageRepository = new StorageRepository();
