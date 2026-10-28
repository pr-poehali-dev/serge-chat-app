package ru.trindelka.messenger;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.Person;

public final class CallNotifier {

    public static final String CHANNEL_ID = "incoming_calls";
    public static final String ACTION_ACCEPT = "ru.trindelka.messenger.CALL_ACCEPT";
    public static final String ACTION_DECLINE = "ru.trindelka.messenger.CALL_DECLINE";
    public static final String EXTRA_CALL_ID = "callId";
    public static final String EXTRA_CHAT_ID = "chatId";
    public static final String EXTRA_VIDEO = "isVideo";
    public static final String EXTRA_ACCEPT = "acceptCall";

    private static final int ID_BASE = 7000;

    private CallNotifier() {}

    public static int notificationId(String callId) {
        try {
            return ID_BASE + (int) (Long.parseLong(callId) % 100000L);
        } catch (NumberFormatException e) {
            return ID_BASE;
        }
    }

    private static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || nm.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "Входящие звонки", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Звонки показываются на весь экран, как обычный вызов");
        Uri ring = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
        ch.setSound(ring, attrs);
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[] {0, 600, 400, 600, 400, 600});
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
    }

    private static PendingIntent openIntent(Context ctx, String callId, String chatId, boolean video, boolean accept, int requestOffset) {
        Intent i = new Intent(ctx, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        i.putExtra(EXTRA_CALL_ID, callId);
        i.putExtra(EXTRA_CHAT_ID, chatId);
        i.putExtra(EXTRA_VIDEO, video);
        i.putExtra(EXTRA_ACCEPT, accept);
        i.setAction("ru.trindelka.messenger.OPEN_CALL_" + callId + "_" + accept);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
        return PendingIntent.getActivity(ctx, notificationId(callId) + requestOffset, i, flags);
    }

    private static PendingIntent declineIntent(Context ctx, String callId, String chatId) {
        Intent i = new Intent(ctx, CallActionReceiver.class);
        i.setAction(ACTION_DECLINE);
        i.putExtra(EXTRA_CALL_ID, callId);
        i.putExtra(EXTRA_CHAT_ID, chatId);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
        return PendingIntent.getBroadcast(ctx, notificationId(callId) + 200000, i, flags);
    }

    public static void show(Context ctx, String callId, String chatId, String callerName, boolean video) {
        if (callId == null || callId.isEmpty()) return;
        ensureChannel(ctx);

        PendingIntent fullScreen = openIntent(ctx, callId, chatId, video, false, 0);
        PendingIntent accept = openIntent(ctx, callId, chatId, video, true, 100000);
        PendingIntent decline = declineIntent(ctx, callId, chatId);

        String title = callerName == null || callerName.isEmpty() ? "Трынделка" : callerName;
        String text = video ? "Входящий видеозвонок" : "Входящий звонок";

        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_notify)
                .setColor(0xFFA855F7)
                .setContentTitle(title)
                .setContentText(text)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(false)
                .setOnlyAlertOnce(false)
                .setTimeoutAfter(45000)
                .setFullScreenIntent(fullScreen, true)
                .setContentIntent(fullScreen);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            Person caller = new Person.Builder().setName(title).setImportant(true).build();
            b.setStyle(NotificationCompat.CallStyle.forIncomingCall(caller, decline, accept));
        } else {
            b.addAction(0, "Отклонить", decline);
            b.addAction(0, "Принять", accept);
        }

        Notification n = b.build();
        n.flags |= Notification.FLAG_INSISTENT;
        try {
            NotificationManagerCompat.from(ctx).notify(notificationId(callId), n);
        } catch (SecurityException ignored) {
            // нет разрешения на уведомления — показать нечего
        }
    }

    public static void cancel(Context ctx, String callId) {
        NotificationManagerCompat.from(ctx).cancel(notificationId(callId));
    }
}
