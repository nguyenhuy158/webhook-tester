import type { WebSocketBroadcaster } from "../../../domain/ports";
import { endpointHubStub } from "../../inbound/ws/endpoint-hub";

/** Outbound side of the WebSocket port: forwards a payload to the endpoint's hub. */
export class DurableObjectBroadcaster implements WebSocketBroadcaster {
  constructor(private readonly namespace: DurableObjectNamespace) {}

  async broadcast(endpointId: number, data: unknown): Promise<void> {
    await endpointHubStub(this.namespace, endpointId).fetch("https://hub.internal/broadcast", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}
