import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { correlationStorage } from '../logging/correlation-id';

export const ALLOW_USER_TYPES_KEY = 'allowUserTypes';
export type UserType = 'admin' | 'customer';

export const AllowUserTypes = (...types: UserType[]) =>
  SetMetadata(ALLOW_USER_TYPES_KEY, types);

@Injectable()
export class CombinedAuthGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const valid = (await super.canActivate(context)) as boolean;
    if (!valid) return false;

    const req = context.switchToHttp().getRequest();
    const allowed = this.reflector.getAllAndOverride<UserType[]>(
      ALLOW_USER_TYPES_KEY,
      [context.getHandler(), context.getClass()],
    ) ?? ['admin'];

    const userType = (req.user?.type ?? 'admin') as UserType;
    if (!allowed.includes(userType)) {
      throw new UnauthorizedException(
        `Esta rota não aceita tokens do tipo "${userType}"`,
      );
    }

    const store = correlationStorage.getStore();
    if (store) {
      store.userId = req.user?.userId;
      store.userType = userType;
    }

    return true;
  }
}
