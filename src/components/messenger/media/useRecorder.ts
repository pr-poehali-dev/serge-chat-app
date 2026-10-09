import { useCallback, useEffect, useRef, useState } from "react";

export interface RecordedMedia {
  blob: Blob;
  mime: string;
  duration: number;
}

const AUDIO_MIMES = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"];
const VIDEO_MIMES = ["video/webm;codecs=vp8,opus", "video/mp4", "video/webm"];

function pickMime(list: string[]): string {
  if (typeof MediaRecorder === "undefined") return "";
  return list.find((m) => MediaRecorder.isTypeSupported(m)) || "";
}

export function useRecorder(video: boolean, maxSeconds: number) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const resolveRef = useRef<((m: RecordedMedia | null) => void) | null>(null);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setStream((s) => {
      s?.getTracks().forEach((t) => t.stop());
      return null;
    });
    setRecording(false);
    setSeconds(0);
  }, []);

  const stop = useCallback((): Promise<RecordedMedia | null> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === "inactive") {
        resolve(null);
        return;
      }
      resolveRef.current = resolve;
      rec.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    else cleanup();
  }, [cleanup]);

  const start = useCallback(async () => {
    setError("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Запись не поддерживается в этом браузере");
      return false;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia(
        video
          ? { audio: true, video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 } } }
          : { audio: true }
      );
      const mime = pickMime(video ? VIDEO_MIMES : AUDIO_MIMES);
      const rec = new MediaRecorder(media, mime ? { mimeType: mime, ...(video ? { videoBitsPerSecond: 600000 } : {}) } : undefined);
      chunksRef.current = [];
      cancelledRef.current = false;

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const type = rec.mimeType || mime || (video ? "video/mp4" : "audio/mp4");
        const blob = new Blob(chunksRef.current, { type });
        const result = cancelledRef.current ? null : { blob, mime: type, duration };
        cleanup();
        resolveRef.current?.(result);
        resolveRef.current = null;
      };

      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      rec.start(250);
      setStream(media);
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        const s = Math.round((Date.now() - startedAtRef.current) / 1000);
        setSeconds(s);
        if (s >= maxSeconds && recorderRef.current?.state === "recording") recorderRef.current.stop();
      }, 250);
      return true;
    } catch {
      setError("Нет доступа к микрофону или камере");
      cleanup();
      return false;
    }
  }, [video, maxSeconds, cleanup]);

  useEffect(() => () => cancel(), [cancel]);

  return { recording, seconds, stream, error, start, stop, cancel };
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
