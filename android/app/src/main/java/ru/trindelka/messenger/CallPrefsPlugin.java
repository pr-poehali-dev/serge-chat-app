package ru.trindelka.messenger;

import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "CallPrefs")
public class CallPrefsPlugin extends Plugin {

    public static final String PREFS = "trindelka_call_prefs";
    public static final String KEY_SESSION = "session";
    public static final String KEY_API = "api";
    public static final String KEY_PENDING_ID = "pendingCallId";
    public static final String KEY_PENDING_ACCEPT = "pendingAccept";

    private static CallPrefsPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    @PluginMethod
    public void setSession(PluginCall call) {
        SharedPreferences.Editor e = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        String session = call.getString("sessionId", "");
        String api = call.getString("api", "");
        if (session == null || session.isEmpty()) {
            e.remove(KEY_SESSION);
        } else {
            e.putString(KEY_SESSION, session);
        }
        if (api != null && !api.isEmpty()) e.putString(KEY_API, api);
        e.apply();
        call.resolve();
    }

    @PluginMethod
    public void canUseFullScreen(PluginCall call) {
        boolean ok = true;
        if (Build.VERSION.SDK_INT >= 34) {
            NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            ok = nm != null && nm.canUseFullScreenIntent();
        }
        JSObject r = new JSObject();
        r.put("allowed", ok);
        call.resolve(r);
    }

    @PluginMethod
    public void openFullScreenSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 34) {
            Intent i = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
            i.setData(android.net.Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        }
        call.resolve();
    }

    @PluginMethod
    public void takePendingCall(PluginCall call) {
        SharedPreferences p = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSObject r = new JSObject();
        long id = p.getLong(KEY_PENDING_ID, 0L);
        r.put("callId", id);
        r.put("accept", p.getBoolean(KEY_PENDING_ACCEPT, false));
        p.edit().remove(KEY_PENDING_ID).remove(KEY_PENDING_ACCEPT).apply();
        call.resolve(r);
    }

    public static void rememberPending(Context ctx, long callId, boolean accept) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putLong(KEY_PENDING_ID, callId).putBoolean(KEY_PENDING_ACCEPT, accept).apply();
        if (instance != null) {
            JSObject d = new JSObject();
            d.put("callId", callId);
            d.put("accept", accept);
            instance.notifyListeners("callAction", d, true);
        }
    }
}
