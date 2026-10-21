package ru.trindelka.messenger;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class CallActionReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!CallNotifier.ACTION_DECLINE.equals(intent.getAction())) return;
        final String callId = intent.getStringExtra(CallNotifier.EXTRA_CALL_ID);
        if (callId == null) return;
        CallNotifier.cancel(context, callId);

        final SharedPreferences prefs = context.getSharedPreferences(CallPrefsPlugin.PREFS, Context.MODE_PRIVATE);
        final String session = prefs.getString(CallPrefsPlugin.KEY_SESSION, "");
        final String api = prefs.getString(CallPrefsPlugin.KEY_API, "");
        if (session.isEmpty() || api.isEmpty()) return;

        final PendingResult pending = goAsync();
        new Thread(() -> {
            HttpURLConnection c = null;
            try {
                c = (HttpURLConnection) new URL(api + "?action=decline").openConnection();
                c.setRequestMethod("POST");
                c.setConnectTimeout(5000);
                c.setReadTimeout(5000);
                c.setDoOutput(true);
                c.setRequestProperty("Content-Type", "application/json");
                c.setRequestProperty("X-Session-Id", session);
                JSONObject body = new JSONObject();
                body.put("call_id", Long.parseLong(callId));
                try (OutputStream os = c.getOutputStream()) {
                    os.write(body.toString().getBytes("UTF-8"));
                }
                c.getResponseCode();
            } catch (Exception ignored) {
                // сервер сам закроет звонок по таймауту
            } finally {
                if (c != null) c.disconnect();
                pending.finish();
            }
        }).start();
    }
}
