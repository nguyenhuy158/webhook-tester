import type { ExternalIdentity, User } from "../entities";
import { InvalidCredentialsError, UsernameAlreadyExistsError, WeakPasswordError } from "../exceptions";
import type { AuthService, UserRepository } from "../ports";

export const MIN_PASSWORD_LENGTH = 8;
export const MIN_USERNAME_LENGTH = 3;

export class AuthenticateUserUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly authService: AuthService,
  ) {}

  async execute(username: string, password: string): Promise<User> {
    const user = await this.userRepo.findByUsername(username);
    // Accounts created through Google have no password and cannot log in this way.
    if (!user?.passwordHash || !(await this.authService.verifyPassword(password, user.passwordHash))) {
      throw new InvalidCredentialsError("Invalid username or password");
    }
    return user;
  }
}

export class RegisterUserUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly authService: AuthService,
  ) {}

  async execute(username: string, password: string): Promise<User> {
    if (username.length < MIN_USERNAME_LENGTH) {
      throw new WeakPasswordError(`Username must be at least ${MIN_USERNAME_LENGTH} characters`);
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new WeakPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (await this.userRepo.findByUsername(username)) {
      throw new UsernameAlreadyExistsError(`Username '${username}' is already taken`);
    }
    return this.userRepo.create({
      id: null,
      username,
      passwordHash: await this.authService.hashPassword(password),
      email: null,
      googleSub: null,
    });
  }
}

/** Finds the account matching a Google identity, creating it on first sign-in. */
export class LoginWithExternalIdentityUseCase {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(identity: ExternalIdentity): Promise<User> {
    const existing = await this.userRepo.findByGoogleSub(identity.subject);
    if (existing) return existing;

    const base = (identity.email?.split("@")[0] ?? identity.name ?? "user")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .slice(0, 24) || "user";

    // Usernames are unique, so a suffix is appended until a free one is found.
    let username = base;
    for (let attempt = 1; await this.userRepo.findByUsername(username); attempt++) {
      username = `${base}-${attempt}`;
    }

    return this.userRepo.create({
      id: null,
      username,
      passwordHash: null,
      email: identity.email,
      googleSub: identity.subject,
    });
  }
}
