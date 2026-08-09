import type { WebSocketBroadcaster } from "../../../domain/ports";

/** Outbound side of the WebSocket port: forwards a payload to the endpoint's hub. */
export class DurableObjectBroadcaster implements WebSocketBroadcaster {
  constructor(private readonly namespace: DurableObjectNamespace) {}

  async broadcast(endpointId: number, data: unknown): Promise<void> {
    const stub = this.namespace.get(this.namespace.idFromName(`endpoint:${endpointId}`));
    await stub.fetch("https://hub.internal/broadcast", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}
