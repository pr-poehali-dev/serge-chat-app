package ru.trindelka.messenger;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CallPrefsPlugin.class);
        super.onCreate(savedInstanceState);
        showOverLockScreen();
        handleCallIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        showOverLockScreen();
        handleCallIntent(intent);
    }

    private void showOverLockScreen() {
        Intent i = getIntent();
        if (i == null || i.getStringExtra(CallNotifier.EXTRA_CALL_ID) == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                            | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                            | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        }
    }

    private void handleCallIntent(Intent intent) {
        if (intent == null) return;
        String id = intent.getStringExtra(CallNotifier.EXTRA_CALL_ID);
        if (id == null || id.isEmpty()) return;
        boolean accept = intent.getBooleanExtra(CallNotifier.EXTRA_ACCEPT, false);
        CallNotifier.cancel(this, id);
        try {
            CallPrefsPlugin.rememberPending(this, Long.parseLong(id), accept);
        } catch (NumberFormatException ignored) {
            // некорректный идентификатор звонка
        }
        intent.removeExtra(CallNotifier.EXTRA_CALL_ID);
    }
}
