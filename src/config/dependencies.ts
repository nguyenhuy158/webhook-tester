import { D1EndpointRepository } from "../adapters/outbound/persistence/endpoint-repository";
import { D1RequestRepository } from "../adapters/outbound/persistence/request-repository";
import { D1UserRepository } from "../adapters/outbound/persistence/user-repository";
import { WebCryptoAuthService } from "../adapters/outbound/security/jwt-service";
import { SsoVerifier } from "../adapters/outbound/security/sso-verifier";
import { DurableObjectBroadcaster } from "../adapters/outbound/ws/durable-object-broadcaster";
import type { AuthService, EndpointRepository, RequestRepository, UserRepository } from "../domain/ports";
import {
  AuthenticateUserUseCase,
  LoginWithExternalIdentityUseCase,
  RegisterUserUseCase,
} from "../domain/use-cases/auth";
import {
  ClearRequestsUseCase,
  CreateEndpointUseCase,
  DeleteEndpointUseCase,
  ListEndpointsUseCase,
  UpdateEndpointUseCase,
} from "../domain/use-cases/endpoints";
import { ReceiveWebhookUseCase } from "../domain/use-cases/webhooks";
import { settings, type Env } from "./env";

// ── Repository factories ──────────────────────────────────────────────────────

export const getEndpointRepo = (env: Env): EndpointRepository => new D1EndpointRepository(env.DB);

export const getRequestRepo = (env: Env): RequestRepository => new D1RequestRepository(env.DB);

export const getUserRepo = (env: Env): UserRepository => new D1UserRepository(env.DB);

export const getAuthService = (env: Env): AuthService => {
  const config = settings(env);
  return new WebCryptoAuthService(config.secretKey, config.accessTokenExpireMinutes);
};

export const getSsoVerifier = (env: Env): SsoVerifier => new SsoVerifier(settings(env).ssoIssuer);

// ── Use case factories ────────────────────────────────────────────────────────

export const getListEndpointsUseCase = (env: Env) => new ListEndpointsUseCase(getEndpointRepo(env));

export const getCreateEndpointUseCase = (env: Env) => new CreateEndpointUseCase(getEndpointRepo(env));

export const getUpdateEndpointUseCase = (env: Env) => new UpdateEndpointUseCase(getEndpointRepo(env));

export const getDeleteEndpointUseCase = (env: Env) => new DeleteEndpointUseCase(getEndpointRepo(env));

export const getClearRequestsUseCase = (env: Env) =>
  new ClearRequestsUseCase(getEndpointRepo(env), getRequestRepo(env));

export const getAuthUseCase = (env: Env) =>
  new AuthenticateUserUseCase(getUserRepo(env), getAuthService(env));

export const getRegisterUserUseCase = (env: Env) =>
  new RegisterUserUseCase(getUserRepo(env), getAuthService(env));

export const getLoginWithExternalIdentityUseCase = (env: Env) =>
  new LoginWithExternalIdentityUseCase(getUserRepo(env));

export const getReceiveWebhookUseCase = (env: Env) =>
  new ReceiveWebhookUseCase(
    getEndpointRepo(env),
    getRequestRepo(env),
    new DurableObjectBroadcaster(env.ENDPOINT_HUB),
  );
