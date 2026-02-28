import { registerPlugin } from '@capacitor/core';

export interface NotificationTimerPlugin {
    start(options: { title: string; startTime: number }): Promise<void>;
    stop(): Promise<void>;
    requestPermissions(): Promise<{ notifications: string }>;
}

export const NotificationTimer = registerPlugin<NotificationTimerPlugin>('NotificationTimer');
