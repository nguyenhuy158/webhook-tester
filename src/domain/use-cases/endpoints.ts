import { ENDPOINT_DEFAULTS, type Endpoint } from "../entities";
import { EndpointNotFoundError, SlugAlreadyExistsError } from "../exceptions";
import type { EndpointRepository } from "../ports";

export class ListEndpointsUseCase {
  constructor(private readonly repo: EndpointRepository) {}

  execute(search = ""): Promise<Endpoint[]> {
    return this.repo.listAll(search);
  }
}

export class CreateEndpointUseCase {
  constructor(private readonly repo: EndpointRepository) {}

  async execute(name: string, slug: string): Promise<Endpoint> {
    if (await this.repo.slugExists(slug)) {
      throw new SlugAlreadyExistsError(`Slug '${slug}' is already taken`);
    }
    return this.repo.create({ id: null, name, slug, createdAt: null, ...ENDPOINT_DEFAULTS });
  }
}

export class UpdateEndpointUseCase {
  constructor(private readonly repo: EndpointRepository) {}

  async execute(params: {
    endpointId: number;
    responseStatus: number;
    responseBody: string;
    responseContentType: string;
    delayMs: number;
  }): Promise<Endpoint> {
    const endpoint = await this.repo.findById(params.endpointId);
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

  async execute(endpointId: number): Promise<void> {
    if (!(await this.repo.findById(endpointId))) {
      throw new EndpointNotFoundError(`Endpoint ${endpointId} not found`);
    }
    await this.repo.delete(endpointId);
  }
}
