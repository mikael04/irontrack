package com.irontrack.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(name = "NotificationTimer", permissions = {
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
})
public class NotificationTimerPlugin extends Plugin {

    private static final int NOTIFICATION_ID = 1001;
    private static final String CHANNEL_ID = "IronTrackTimerChannelV2";

    @PluginMethod
    public void start(PluginCall call) {
        String title = call.getString("title", "Em andamento");
        Long startTime = call.getLong("startTime", System.currentTimeMillis());

        Context context = getContext();
        NotificationManager notificationManager = (NotificationManager) context
                .getSystemService(Context.NOTIFICATION_SERVICE);

        // Create the NotificationChannel, but only on API 26+ because
        // the NotificationChannel class is new and not in the support library
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Timer Em Andamento";
            String description = "Mostra o tempo de descanso atual";
            int importance = NotificationManager.IMPORTANCE_DEFAULT; // DEFAULT importance so it's not "Silent"
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            // Explicitly remove sound and vibration so it doesn't beep but still shows in
            // standard priority
            channel.setSound(null, null);
            channel.enableVibration(false);
            // Register the channel with the system; you can't change the importance
            // or other notification behaviors after this
            notificationManager.createNotificationChannel(channel);
        }

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingIntent = PendingIntent.getActivity(context, 0, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        } else {
            pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.exercise_24px) // Updated to user's custom icon
                .setContentTitle(title)
                .setUsesChronometer(true)
                .setWhen(startTime)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT) // Changed to default priority
                .setContentIntent(pendingIntent)
                .setAutoCancel(false)
                .setSound(null)
                .setVibrate(new long[] { 0L });

        notificationManager.notify(NOTIFICATION_ID, builder.build());

        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Context context = getContext();
        NotificationManager notificationManager = (NotificationManager) context
                .getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.cancel(NOTIFICATION_ID);
        call.resolve();
    }
}
