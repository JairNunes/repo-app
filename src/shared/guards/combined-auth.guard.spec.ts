import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CombinedAuthGuard, ALLOW_USER_TYPES_KEY } from './combined-auth.guard';

describe('CombinedAuthGuard', () => {
  function buildContext(user: unknown): ExecutionContext {
    const req = { user };
    return {
      getHandler: () => () => undefined,
      getClass: () => function Klass() {},
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  }

  function buildGuard(allowed?: string[]) {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(allowed),
    } as unknown as Reflector;
    const guard = new CombinedAuthGuard(reflector);
    Object.setPrototypeOf(guard, {
      ...Object.getPrototypeOf(guard),
      canActivate: jest.fn().mockResolvedValue(true),
    });
    return { guard, reflector };
  }

  it('aceita admin por default', async () => {
    const { guard } = buildGuard();
    const ctx = buildContext({ userId: 'u1', type: 'admin' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('rejeita customer em rota só de admin', async () => {
    const { guard } = buildGuard(['admin']);
    const ctx = buildContext({ userId: 'c1', type: 'customer' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('aceita customer em rota com @AllowUserTypes(customer)', async () => {
    const { guard } = buildGuard(['customer']);
    const ctx = buildContext({ userId: 'c1', type: 'customer' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('chave do metadata é a constante exportada', () => {
    expect(ALLOW_USER_TYPES_KEY).toBe('allowUserTypes');
  });
});
