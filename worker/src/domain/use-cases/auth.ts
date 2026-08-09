import type { User } from "../entities";
import { InvalidCredentialsError } from "../exceptions";
import type { AuthService, UserRepository } from "../ports";

export class AuthenticateUserUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly authService: AuthService,
  ) {}

  async execute(username: string, password: string): Promise<User> {
    const user = await this.userRepo.findByUsername(username);
    if (!user?.passwordHash || !(await this.authService.verifyPassword(password, user.passwordHash))) {
      throw new InvalidCredentialsError("Invalid username or password");
    }
    return user;
  }
}

/**
 * Replaces the FastAPI startup hook that seeded a default user. A Worker has no
 * startup phase, so seeding happens lazily on the first login attempt instead.
 */
export class SeedDefaultUserUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly authService: AuthService,
  ) {}

  async execute(username: string, password: string): Promise<void> {
    if ((await this.userRepo.count()) > 0) return;
    const passwordHash = await this.authService.hashPassword(password);
    await this.userRepo.create({ id: null, username, passwordHash });
  }
}
