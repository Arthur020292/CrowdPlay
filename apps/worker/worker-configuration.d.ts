declare module "cloudflare:workers" {
  export class DurableObject<Env = unknown> {
    constructor(ctx: DurableObjectState, env: Env);
    ctx: DurableObjectState;
    env: Env;
  }
}

interface Fetcher {
  fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
}

interface DurableObjectId {}

interface DurableObjectStub extends Fetcher {}

interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

interface DurableObjectStorage {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  setAlarm(scheduledTime: number): Promise<void>;
}

interface DurableObjectState {
  storage: DurableObjectStorage;
  blockConcurrencyWhile(callback: () => Promise<void>): void;
  getWebSockets(): WebSocket[];
  acceptWebSocket(socket: WebSocket): void;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

declare var WebSocketPair: {
  new (): { 0: WebSocket; 1: WebSocket };
};

interface WebSocket {
  serializeAttachment?(attachment: unknown): void;
  deserializeAttachment?(): unknown;
}

interface ResponseInit {
  webSocket?: WebSocket | null;
}
