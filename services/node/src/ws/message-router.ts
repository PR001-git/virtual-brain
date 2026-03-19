import type { WSMessage } from "../types.js";

type MessageHandler = (message: WSMessage) => void;

/**
 * Routes incoming WebSocket messages by their `type` field
 * to registered handlers.
 */
export class MessageRouter {
  private handlers = new Map<string, MessageHandler[]>();

  on(type: string, handler: MessageHandler): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
  }

  off(type: string, handler: MessageHandler): void {
    const list = this.handlers.get(type) ?? [];
    this.handlers.set(
      type,
      list.filter((h) => h !== handler),
    );
  }

  route(raw: string): void {
    let message: WSMessage;
    try {
      message = JSON.parse(raw);
    } catch {
      return; // ignore malformed messages
    }

    const handlers = this.handlers.get(message.type) ?? [];
    for (const handler of handlers) {
      handler(message);
    }
  }
}
