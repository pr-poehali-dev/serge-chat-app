import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const API_AUTH = "https://functions.poehali.dev/85275f0b-0f01-4c18-9133-e7e903ca579b";
const SESSION_STORAGE_KEY = "trindelka_session_id";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    setError("");
    if (!token) {
      setError("Ссылка недействительна");
      return;
    }
    if (password.length < 6) {
      setError("Пароль должен быть не короче 6 символов");
      return;
    }
    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API_AUTH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-password", token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Не удалось сбросить пароль");
        return;
      }
      localStorage.setItem(SESSION_STORAGE_KEY, data.user.sessionId);
      setSuccess(true);
      setTimeout(() => navigate("/"), 1500);
    } catch {
      setError("Не удалось связаться с сервером");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-background font-golos px-4">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div
        className="relative z-10 w-full max-w-sm rounded-3xl p-6 animate-fade-in"
        style={{ background: "rgba(14,8,28,0.98)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-btn shadow-lg shadow-purple-500/30 mb-3">
            <Icon name="KeyRound" size={24} className="text-white" />
          </div>
          <h1 className="text-lg font-bold gradient-text">Новый пароль</h1>
          <p className="text-xs text-white/35 mt-0.5">Придумайте новый пароль для входа</p>
        </div>

        {success ? (
          <p className="text-sm text-emerald-400 text-center py-4">
            Пароль обновлён! Переносим вас в мессенджер…
          </p>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5">
                <Icon name="Lock" size={14} className="text-white/30" />
                <input
                  type="password"
                  className="flex-1 bg-transparent text-sm text-white/85 placeholder:text-white/25 outline-none"
                  placeholder="Новый пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5">
                <Icon name="Lock" size={14} className="text-white/30" />
                <input
                  type="password"
                  className="flex-1 bg-transparent text-sm text-white/85 placeholder:text-white/25 outline-none"
                  placeholder="Повторите пароль"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
            </div>

            {error && <p className="mt-3 text-xs text-red-400 text-center">{error}</p>}

            <button
              onClick={submit}
              disabled={loading}
              className="w-full mt-5 rounded-2xl gradient-btn text-white text-sm font-medium py-3 transition-all disabled:opacity-50 hover:-translate-y-0.5"
            >
              {loading ? <Icon name="Loader" size={16} className="animate-spin mx-auto" /> : "Сохранить пароль"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
