import { useEffect, useRef, useState } from "react";

import { safeParseServerEvent, type ServerEvent } from "@crowdplay/protocol";

type SocketStatus = "idle" | "connecting" | "open" | "closed" | "error";

interface UseSessionSocketOptions {
  enabled: boolean;
  url: string | null;
  onEvent: (event: ServerEvent) => void;
}

export function useSessionSocket({ enabled, url, onEvent }: UseSessionSocketOptions) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const onEventRef = useRef(onEvent);
  const [status, setStatus] = useState<SocketStatus>("idle");

  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || !url) {
      return;
    }

    let cancelled = false;
    const connect = () => {
      setStatus("connecting");
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        if (!cancelled) {
          setStatus("open");
        }
      });

      socket.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(String(event.data));
          const parsed = safeParseServerEvent(payload);
          if (parsed) {
            onEventRef.current(parsed);
          }
        } catch {
          setStatus("error");
        }
      });

      socket.addEventListener("close", () => {
        if (cancelled) {
          return;
        }
        setStatus("closed");
        reconnectTimerRef.current = window.setTimeout(connect, 1_000);
      });

      socket.addEventListener("error", () => {
        if (!cancelled) {
          setStatus("error");
        }
      });
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      socketRef.current?.close(1000, "Unmounted");
      socketRef.current = null;
    };
  }, [enabled, url]);

  return {
    status,
    send(event: unknown) {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(event));
      }
    }
  };
}
