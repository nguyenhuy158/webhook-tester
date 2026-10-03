import { DurableObject } from "cloudflare:workers";

/**
 * The hub for one endpoint. The WebSocket route and the broadcaster must resolve
 * the same Durable Object, so the naming scheme lives only here.
 */
export function endpointHubStub(namespace: DurableObjectNamespace, endpointId: number): DurableObjectStub {
  return namespace.get(namespace.idFromName(`endpoint:${endpointId}`));
}

/**
 * Replaces the in-process ConnectionManager: a Worker is stateless, so the set of
 * live sockets for one endpoint lives in a Durable Object keyed by endpoint id.
 *
 * Hibernatable WebSockets are used, so an idle hub costs nothing while its
 * browsers stay connected.
 */
export class EndpointHub extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/broadcast") {
      const payload = await request.text();
      for (const socket of this.ctx.getWebSockets()) {
        try {
          socket.send(payload);
        } catch {
          // Socket died between getWebSockets() and send(); the runtime cleans it up.
        }
      }
      return new Response(null, { status: 204 });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket", { status: 426 });
    }

    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  /** The dashboard only sends keep-alive pings; nothing to do with them. */
  async webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer): Promise<void> {}

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    ws.close(code === 1006 ? 1000 : code, reason);
  }
}
