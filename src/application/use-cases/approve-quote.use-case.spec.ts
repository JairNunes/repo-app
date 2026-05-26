import { ApproveQuoteUseCase } from './approve-quote.use-case';
import { IServiceOrderRepository } from '../ports/service-order.repository.interface';
import { IPartRepository } from '../ports/part.repository.interface';
import { ServiceOrderStatus } from '@/domain/service-orders/service-order-status.enum';
import {
  NotFoundError,
  BusinessRuleViolationError,
} from '@/shared/errors/domain.error';

describe('ApproveQuoteUseCase', () => {
  let useCase: ApproveQuoteUseCase;
  let mockServiceOrderRepository: jest.Mocked<IServiceOrderRepository>;
  let mockPartRepository: jest.Mocked<IPartRepository>;
  let mockPrismaService: any;

  beforeEach(() => {
    mockServiceOrderRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findAllActive: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      getAverageExecutionTimeMinutes: jest.fn(),
    } as any;

    mockPartRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      decrementStock: jest.fn(),
    } as any;

    mockPrismaService = {
      $transaction: jest.fn(),
    } as any;

    useCase = new ApproveQuoteUseCase(
      mockServiceOrderRepository,
      mockPartRepository,
      mockPrismaService,
    );
  });

  function createMockServiceOrder(overrides: Record<string, any> = {}) {
    return {
      id: 'order-1',
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      status: ServiceOrderStatus.AwaitingApproval,
      totalCentsSnapshot: 10000,
      services: [
        { serviceId: 'svc-1', quantity: 1, unitPriceCentsSnapshot: 5000 },
      ],
      parts: [{ partId: 'part-1', quantity: 2, unitPriceCentsSnapshot: 2500 }],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  describe('execute', () => {
    it('should successfully approve quote from AwaitingApproval status', async () => {
      const mockServiceOrder = createMockServiceOrder();
      const updatedServiceOrder = {
        ...mockServiceOrder,
        status: ServiceOrderStatus.InExecution,
        executionStartedAt: new Date(),
      };

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);
      mockPartRepository.decrementStock.mockResolvedValue(undefined);
      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback();
        },
      );
      mockServiceOrderRepository.updateStatus.mockResolvedValue(
        updatedServiceOrder,
      );

      const result = await useCase.execute('order-1');

      expect(mockServiceOrderRepository.findById).toHaveBeenCalledWith(
        'order-1',
      );
      expect(mockPartRepository.decrementStock).toHaveBeenCalledWith(
        'part-1',
        2,
      );
      expect(mockServiceOrderRepository.updateStatus).toHaveBeenCalledWith(
        'order-1',
        ServiceOrderStatus.InExecution,
        expect.objectContaining({ executionStartedAt: expect.any(Date) }),
      );
      expect(result).toEqual(updatedServiceOrder);
    });

    it('should throw BusinessRuleViolationError when approving from wrong status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.InDiagnosis,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      await expect(useCase.execute('order-1')).rejects.toThrow(
        BusinessRuleViolationError,
      );
      expect(mockPartRepository.decrementStock).not.toHaveBeenCalled();
      expect(mockServiceOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when service order not found', async () => {
      mockServiceOrderRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('non-existent-order')).rejects.toThrow(
        NotFoundError,
      );
      await expect(useCase.execute('non-existent-order')).rejects.toThrow(
        'Service order not found',
      );
      expect(mockPartRepository.decrementStock).not.toHaveBeenCalled();
      expect(mockServiceOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should decrement part stock on approval', async () => {
      const mockServiceOrder = createMockServiceOrder({
        parts: [
          { partId: 'part-1', quantity: 2, unitPriceCentsSnapshot: 2500 },
          { partId: 'part-2', quantity: 3, unitPriceCentsSnapshot: 1500 },
        ],
      });
      const updatedServiceOrder = {
        ...mockServiceOrder,
        status: ServiceOrderStatus.InExecution,
        executionStartedAt: new Date(),
      };

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);
      mockPartRepository.decrementStock.mockResolvedValue(undefined);
      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback();
        },
      );
      mockServiceOrderRepository.updateStatus.mockResolvedValue(
        updatedServiceOrder,
      );

      await useCase.execute('order-1');

      expect(mockPartRepository.decrementStock).toHaveBeenCalledWith(
        'part-1',
        2,
      );
      expect(mockPartRepository.decrementStock).toHaveBeenCalledWith(
        'part-2',
        3,
      );
      expect(mockPartRepository.decrementStock).toHaveBeenCalledTimes(2);
    });

    it('should use prisma transaction when decrementing stock', async () => {
      const mockServiceOrder = createMockServiceOrder();
      const updatedServiceOrder = {
        ...mockServiceOrder,
        status: ServiceOrderStatus.InExecution,
        executionStartedAt: new Date(),
      };

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);
      mockPartRepository.decrementStock.mockResolvedValue(undefined);
      mockServiceOrderRepository.updateStatus.mockResolvedValue(
        updatedServiceOrder,
      );

      let transactionCalled = false;
      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          transactionCalled = true;
          return callback();
        },
      );

      await useCase.execute('order-1');

      expect(transactionCalled).toBe(true);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should not approve from Received status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.Received,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      await expect(useCase.execute('order-1')).rejects.toThrow(
        BusinessRuleViolationError,
      );
    });

    it('should not approve from InExecution status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.InExecution,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      await expect(useCase.execute('order-1')).rejects.toThrow(
        BusinessRuleViolationError,
      );
    });

    it('should not approve from Finalized status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.Finalized,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      await expect(useCase.execute('order-1')).rejects.toThrow(
        BusinessRuleViolationError,
      );
    });

    it('should not approve from Delivered status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.Delivered,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      await expect(useCase.execute('order-1')).rejects.toThrow(
        BusinessRuleViolationError,
      );
    });

    it('should set executionStartedAt timestamp when approving', async () => {
      const mockServiceOrder = createMockServiceOrder();
      const updatedServiceOrder = {
        ...mockServiceOrder,
        status: ServiceOrderStatus.InExecution,
        executionStartedAt: new Date(),
      };

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);
      mockPartRepository.decrementStock.mockResolvedValue(undefined);
      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback();
        },
      );
      mockServiceOrderRepository.updateStatus.mockResolvedValue(
        updatedServiceOrder,
      );

      await useCase.execute('order-1');

      const callArgs = mockServiceOrderRepository.updateStatus.mock.calls[0];
      expect(callArgs[2]).toHaveProperty('executionStartedAt');
      expect(callArgs[2]!.executionStartedAt).toBeInstanceOf(Date);
    });

    it('should handle service order with no parts', async () => {
      const mockServiceOrder = createMockServiceOrder({
        parts: [],
      });
      const updatedServiceOrder = {
        ...mockServiceOrder,
        status: ServiceOrderStatus.InExecution,
        executionStartedAt: new Date(),
      };

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);
      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback();
        },
      );
      mockServiceOrderRepository.updateStatus.mockResolvedValue(
        updatedServiceOrder,
      );

      const result = await useCase.execute('order-1');

      expect(mockPartRepository.decrementStock).not.toHaveBeenCalled();
      expect(result).toEqual(updatedServiceOrder);
    });
  });
});
