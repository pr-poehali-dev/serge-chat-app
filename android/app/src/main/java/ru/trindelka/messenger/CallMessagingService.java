package ru.trindelka.messenger;

import androidx.annotation.NonNull;

import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class CallMessagingService extends MessagingService {

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        Map<String, String> data = message.getData();
        String type = data.get("type");
        if ("call".equals(type)) {
            boolean video = "true".equalsIgnoreCase(data.get("isVideo")) || "True".equals(data.get("isVideo"));
            CallNotifier.show(this, data.get("callId"), data.get("chatId"), data.get("title"), video);
            return;
        }
        if ("call-cancel".equals(type)) {
            String id = data.get("callId");
            if (id != null) CallNotifier.cancel(this, id);
            return;
        }
        super.onMessageReceived(message);
    }
}
