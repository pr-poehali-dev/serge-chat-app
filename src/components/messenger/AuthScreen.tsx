import { useState } from "react";
import Icon from "@/components/ui/icon";
import { AuthUser } from "./types";

const API_AUTH = "https://functions.poehali.dev/85275f0b-0f01-4c18-9133-e7e903ca579b";

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser) => void;
}

type Mode = "login" | "register" | "forgot";

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, setLogin] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setInfo("");

    if (mode === "forgot") {
      if (!email.trim()) {
        setError("Введите email");
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(API_AUTH, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "forgot-password", email: email.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Что-то пошло не так");
          return;
        }
        setInfo("Если такой email зарегистрирован, мы отправили на него ссылку для восстановления пароля");
      } catch {
        setError("Не удалось связаться с сервером");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim() || !password) {
      setError("Заполните email и пароль");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API_AUTH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "login"
            ? { action: "login", email: email.trim(), password }
            : { action: "register", email: email.trim(), password, login: login.trim(), firstName: firstName.trim(), lastName: lastName.trim() }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Что-то пошло не так");
        return;
      }
      onAuthenticated(data.user);
    } catch {
      setError("Не удалось связаться с сервером");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setInfo("");
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
            <span className="text-2xl font-black text-white">Т</span>
          </div>
          <h1 className="text-lg font-bold gradient-text">Трынделка</h1>
          <p className="text-xs text-white/35 mt-0.5">
            {mode === "login" && "Войдите в свой аккаунт"}
            {mode === "register" && "Создайте новый аккаунт"}
            {mode === "forgot" && "Восстановление пароля"}
          </p>
        </div>

        {mode !== "forgot" && (
          <div className="flex gap-1 mb-5 rounded-2xl bg-white/[0.05] p-1">
            <button
              onClick={() => switchMode("login")}
              className={`flex-1 rounded-xl py-2 text-xs font-medium transition-all ${
                mode === "login" ? "bg-white/[0.1] text-white" : "text-white/40 hover:text-white/60"
              }`}
            >
              Вход
            </button>
            <button
              onClick={() => switchMode("register")}
              className={`flex-1 rounded-xl py-2 text-xs font-medium transition-all ${
                mode === "register" ? "bg-white/[0.1] text-white" : "text-white/40 hover:text-white/60"
              }`}
            >
              Регистрация
            </button>
          </div>
        )}

        {mode === "forgot" && (
          <button
            onClick={() => switchMode("login")}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors mb-4"
          >
            <Icon name="ArrowLeft" size={13} />
            Назад ко входу
          </button>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5">
            <Icon name="Mail" size={14} className="text-white/30" />
            <input
              type="email"
              className="flex-1 bg-transparent text-sm text-white/85 placeholder:text-white/25 outline-none"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && mode === "forgot" && submit()}
            />
          </div>

          {mode !== "forgot" && (
            <div className="flex items-center gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5">
              <Icon name="Lock" size={14} className="text-white/30" />
              <input
                type="password"
                className="flex-1 bg-transparent text-sm text-white/85 placeholder:text-white/25 outline-none"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && mode === "login" && submit()}
              />
            </div>
          )}

          {mode === "register" && (
            <>
              <div className="flex items-center gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5">
                <Icon name="AtSign" size={14} className="text-white/30" />
                <input
                  className="flex-1 bg-transparent text-sm text-white/85 placeholder:text-white/25 outline-none"
                  placeholder="Логин (необязательно)"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5">
                  <input
                    className="flex-1 bg-transparent text-sm text-white/85 placeholder:text-white/25 outline-none min-w-0"
                    placeholder="Имя"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="flex-1 flex items-center gap-2 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5">
                  <input
                    className="flex-1 bg-transparent text-sm text-white/85 placeholder:text-white/25 outline-none min-w-0"
                    placeholder="Фамилия"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {mode === "login" && (
          <button
            onClick={() => switchMode("forgot")}
            className="mt-3 text-xs text-purple-400/80 hover:text-purple-400 transition-colors"
          >
            Забыли пароль?
          </button>
        )}

        {error && (
          <p className="mt-3 text-xs text-red-400 text-center">{error}</p>
        )}
        {info && (
          <p className="mt-3 text-xs text-emerald-400 text-center">{info}</p>
        )}

        <button
          onClick={submit}
          disabled={loading}
          className="w-full mt-5 rounded-2xl gradient-btn text-white text-sm font-medium py-3 transition-all disabled:opacity-50 hover:-translate-y-0.5"
        >
          {loading ? (
            <Icon name="Loader" size={16} className="animate-spin mx-auto" />
          ) : mode === "login" ? (
            "Войти"
          ) : mode === "register" ? (
            "Зарегистрироваться"
          ) : (
            "Отправить ссылку"
          )}
        </button>
      </div>
    </div>
  );
}
