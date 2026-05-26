import { Request, Response } from 'express';
import {
  CorrelationIdMiddleware,
  correlationStorage,
  getCorrelationId,
  CORRELATION_HEADER,
} from './correlation-id';

describe('CorrelationIdMiddleware', () => {
  const middleware = new CorrelationIdMiddleware();

  function buildReqRes(headers: Record<string, string> = {}) {
    const req = { headers } as unknown as Request;
    const setHeader = jest.fn();
    const res = { setHeader } as unknown as Response;
    return { req, res, setHeader };
  }

  it('gera um novo correlationId quando header ausente', (done) => {
    const { req, res, setHeader } = buildReqRes();
    middleware.use(req, res, () => {
      const id = getCorrelationId();
      expect(id).toMatch(/[0-9a-f-]{36}/);
      expect(setHeader).toHaveBeenCalledWith(CORRELATION_HEADER, id);
      done();
    });
  });

  it('reutiliza correlationId do header quando presente', (done) => {
    const incoming = 'abc-1234-incoming';
    const { req, res, setHeader } = buildReqRes({
      [CORRELATION_HEADER]: incoming,
    });
    middleware.use(req, res, () => {
      expect(getCorrelationId()).toBe(incoming);
      expect(setHeader).toHaveBeenCalledWith(CORRELATION_HEADER, incoming);
      done();
    });
  });

  it('correlationStorage isola requests concorrentes', async () => {
    const ids: string[] = [];
    await Promise.all(
      ['req-1', 'req-2', 'req-3'].map(
        (id) =>
          new Promise<void>((resolve) =>
            correlationStorage.run({ correlationId: id }, () => {
              setTimeout(() => {
                ids.push(getCorrelationId()!);
                resolve();
              }, 10);
            }),
          ),
      ),
    );
    expect(ids.sort()).toEqual(['req-1', 'req-2', 'req-3']);
  });
});
