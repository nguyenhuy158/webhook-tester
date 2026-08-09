import type { EndpointResponse, IncomingRequest } from "../entities";
import { EndpointNotFoundError } from "../exceptions";
import type { EndpointRepository, RequestRepository, WebSocketBroadcaster } from "../ports";

/** Upper bound on the configurable per-endpoint delay, to stay inside the Worker request lifetime. */
const MAX_DELAY_MS = 30_000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class ReceiveWebhookUseCase {
  constructor(
    private readonly endpointRepo: EndpointRepository,
    private readonly requestRepo: RequestRepository,
    private readonly broadcaster: WebSocketBroadcaster,
  ) {}

  async execute(slug: string, incoming: IncomingRequest): Promise<EndpointResponse> {
    const endpoint = await this.endpointRepo.findBySlug(slug);
    if (!endpoint?.id) {
      throw new EndpointNotFoundError(`No endpoint with slug '${slug}'`);
    }

    const saved = await this.requestRepo.save({
      id: null,
      endpointId: endpoint.id,
      method: incoming.method,
      headers: incoming.headers,
      body: incoming.body,
      queryParams: incoming.queryParams,
      remoteAddr: incoming.remoteAddr,
      timestamp: null,
    });

    await this.broadcaster.broadcast(endpoint.id, {
      id: saved.id,
      method: saved.method,
      remote_addr: saved.remoteAddr,
      timestamp: saved.timestamp,
      headers: saved.headers,
      query_params: saved.queryParams,
      body: saved.body,
    });

    if (endpoint.delayMs > 0) {
      await sleep(Math.min(endpoint.delayMs, MAX_DELAY_MS));
    }

    return {
      status: endpoint.responseStatus,
      body: endpoint.responseBody,
      contentType: endpoint.responseContentType,
    };
  }
}
