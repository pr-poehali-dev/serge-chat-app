UPDATE users SET session_expires_at = NULL WHERE session_expires_at IS NOT NULL;
