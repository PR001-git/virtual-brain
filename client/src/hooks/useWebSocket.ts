import { useCallback, useEffect, useRef, useState } from "react";
import type { WSMessage } from "../types";

export type WSStatus = "connecting" | "connected" | "disconnected";

interface UseWebSocketReturn {
  status: WSStatus;
  messages: WSMessage[];
  send: (msg: WSMessage) => void;
  connect: () => void;
  disconnect: () => void;
  clearMessages: () => void;
}

const WS_URL = "ws://localhost:8200/ws";
const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Observer hook: manages WebSocket connection with auto-reconnect.
 * Components subscribe by reading `messages` — re-renders on each new message.
 */
export function useWebSocket(): UseWebSocketReturn {
  const [status, setStatus] = useState<WSStatus>("disconnected");
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const intentionalClose = useRef(false);

  const clearMessages = useCallback(() => setMessages([]), []);

  const connect = useCallback(() => {
    // Don't reconnect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    intentionalClose.current = false;
    setStatus("connecting");

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        setMessages((prev) => [...prev, msg]);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      setStatus("disconnected");

      // Auto-reconnect with backoff (unless intentionally closed)
      if (!intentionalClose.current &&
          reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_DELAY_MS * Math.pow(1.5, reconnectAttempts.current);
        reconnectAttempts.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      // onclose will fire after onerror, so reconnect is handled there
    };
  }, []);

  const disconnect = useCallback(() => {
    intentionalClose.current = true;
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("disconnected");
  }, []);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intentionalClose.current = true;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      wsRef.current?.close();
    };
  }, []);

  return { status, messages, send, connect, disconnect, clearMessages };
}
