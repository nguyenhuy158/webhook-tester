import { ENDPOINT_DEFAULTS, type Endpoint } from "../entities";
import { EndpointNotFoundError, SlugAlreadyExistsError } from "../exceptions";
import type { EndpointRepository, RequestRepository } from "../ports";

export class ListEndpointsUseCase {
  constructor(private readonly repo: EndpointRepository) {}

  execute(ownerId: number, search = ""): Promise<Endpoint[]> {
    return this.repo.listByOwner(ownerId, search);
  }
}

export class CreateEndpointUseCase {
  constructor(private readonly repo: EndpointRepository) {}

  async execute(params: { ownerId: number; name: string; slug: string }): Promise<Endpoint> {
    // Slugs are checked across every account: they share the /hook/<slug> namespace.
    if (await this.repo.slugExists(params.slug)) {
      throw new SlugAlreadyExistsError(`Slug '${params.slug}' is already taken`);
    }
    return this.repo.create({
      id: null,
      userId: params.ownerId,
      name: params.name,
      slug: params.slug,
      createdAt: null,
      ...ENDPOINT_DEFAULTS,
    });
  }
}

export class UpdateEndpointUseCase {
  constructor(private readonly repo: EndpointRepository) {}

  async execute(params: {
    endpointId: number;
    ownerId: number;
    responseStatus: number;
    responseBody: string;
    responseContentType: string;
    delayMs: number;
  }): Promise<Endpoint> {
    const endpoint = await this.repo.findById(params.endpointId, params.ownerId);
    if (!endpoint) {
      throw new EndpointNotFoundError(`Endpoint ${params.endpointId} not found`);
    }
    return this.repo.update({
      ...endpoint,
      responseStatus: params.responseStatus,
      responseBody: params.responseBody,
      responseContentType: params.responseContentType,
      delayMs: params.delayMs,
    });
  }
}

export class DeleteEndpointUseCase {
  constructor(private readonly repo: EndpointRepository) {}

  async execute(endpointId: number, ownerId: number): Promise<void> {
    if (!(await this.repo.findById(endpointId, ownerId))) {
      throw new EndpointNotFoundError(`Endpoint ${endpointId} not found`);
    }
    await this.repo.delete(endpointId, ownerId);
  }
}

/** Ownership is checked here so no route can clear another account's history. */
export class ClearRequestsUseCase {
  constructor(
    private readonly endpointRepo: EndpointRepository,
    private readonly requestRepo: RequestRepository,
  ) {}

  async execute(endpointId: number, ownerId: number): Promise<void> {
    if (!(await this.endpointRepo.findById(endpointId, ownerId))) {
      throw new EndpointNotFoundError(`Endpoint ${endpointId} not found`);
    }
    await this.requestRepo.deleteByEndpoint(endpointId);
  }
}
