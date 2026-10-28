import { useRef } from "react";
import { Message } from "../types";

const TRIGGER_PX = 64;
const MAX_PX = 96;
const LOCK_PX = 10;

interface SwipeState {
  x: number;
  y: number;
  mode: "idle" | "swipe" | "scroll";
  fired: boolean;
}

export function useSwipeReply(onReply: ((msg: Message) => void) | undefined, enabled: boolean) {
  const state = useRef<SwipeState | null>(null);
  const justSwiped = useRef(false);

  const reset = (row: HTMLElement) => {
    row.style.transition = "transform 180ms ease-out";
    row.style.transform = "";
    const hint = row.querySelector<HTMLElement>("[data-swipe-hint]");
    if (hint) {
      hint.style.opacity = "0";
      hint.style.transform = "scale(0.6)";
    }
    window.setTimeout(() => {
      row.style.transition = "";
    }, 200);
  };

  const canSwipe = (msg: Message, target: HTMLElement) =>
    enabled &&
    !!onReply &&
    !msg.removed &&
    msg.id < 1e12 &&
    !target.closest("input, textarea, video, audio, button, a, [role='slider'], [role='button']");

  const onTouchStart = (msg: Message, e: React.TouchEvent<HTMLElement>) => {
    if (!canSwipe(msg, e.target as HTMLElement) || e.touches.length !== 1) {
      state.current = null;
      return;
    }
    const t = e.touches[0];
    state.current = { x: t.clientX, y: t.clientY, mode: "idle", fired: false };
  };

  const onTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    const s = state.current;
    if (!s || s.mode === "scroll") return;
    const t = e.touches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (s.mode === "idle") {
      if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;
      if (dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.5) s.mode = "swipe";
      else {
        s.mode = "scroll";
        return;
      }
    }
    const row = e.currentTarget;
    const shift = Math.max(0, Math.min(dx, MAX_PX));
    const eased = shift > TRIGGER_PX ? TRIGGER_PX + (shift - TRIGGER_PX) * 0.3 : shift;
    row.style.transform = `translateX(${eased}px)`;
    const hint = row.querySelector<HTMLElement>("[data-swipe-hint]");
    if (hint) {
      const p = Math.min(1, shift / TRIGGER_PX);
      hint.style.opacity = String(p);
      hint.style.transform = `scale(${0.6 + 0.4 * p})`;
    }
    if (shift >= TRIGGER_PX && !s.fired) {
      s.fired = true;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(12);
    } else if (shift < TRIGGER_PX && s.fired) {
      s.fired = false;
    }
  };

  const finish = (msg: Message | null, e: React.TouchEvent<HTMLElement>) => {
    const s = state.current;
    state.current = null;
    if (!s || s.mode !== "swipe") return;
    justSwiped.current = true;
    window.setTimeout(() => {
      justSwiped.current = false;
    }, 350);
    reset(e.currentTarget);
    if (msg && s.fired) onReply?.(msg);
  };

  return {
    justSwiped,
    bind: (msg: Message) => ({
      onTouchStart: (e: React.TouchEvent<HTMLElement>) => onTouchStart(msg, e),
      onTouchMove,
      onTouchEnd: (e: React.TouchEvent<HTMLElement>) => finish(msg, e),
      onTouchCancel: (e: React.TouchEvent<HTMLElement>) => finish(null, e),
    }),
  };
}
