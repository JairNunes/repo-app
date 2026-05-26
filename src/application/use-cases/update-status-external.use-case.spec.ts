import {
  UpdateStatusExternalUseCase,
  UpdateStatusExternalInput,
  ExternalAction,
} from './update-status-external.use-case';
import { IServiceOrderRepository } from '../ports/service-order.repository.interface';
import { IPartRepository } from '../ports/part.repository.interface';
import { ServiceOrderStatus } from '@/domain/service-orders/service-order-status.enum';
import {
  NotFoundError,
  BusinessRuleViolationError,
} from '@/shared/errors/domain.error';

describe('UpdateStatusExternalUseCase', () => {
  let useCase: UpdateStatusExternalUseCase;
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

    useCase = new UpdateStatusExternalUseCase(
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
      status: ServiceOrderStatus.Received,
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

  describe('execute - start-diagnosis action', () => {
    it('should successfully start diagnosis from Received status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.Received,
      });
      const updatedOrder = {
        ...mockServiceOrder,
        status: ServiceOrderStatus.InDiagnosis,
        diagnosisStartedAt: new Date(),
      };

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);
      mockServiceOrderRepository.updateStatus.mockResolvedValue(updatedOrder);

      const input: UpdateStatusExternalInput = {
        serviceOrderId: 'order-1',
        action: 'start-diagnosis',
        source: 'external-system',
      };

      const result = await useCase.execute(input);

      expect(mockServiceOrderRepository.findById).toHaveBeenCalledWith(
        'order-1',
      );
      expect(mockServiceOrderRepository.updateStatus).toHaveBeenCalledWith(
        'order-1',
        ServiceOrderStatus.InDiagnosis,
        expect.objectContaining({ diagnosisStartedAt: expect.any(Date) }),
      );
      expect(result).toEqual(updatedOrder);
    });

    it('should throw error when starting diagnosis from wrong status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.InExecution,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      const input: UpdateStatusExternalInput = {
        serviceOrderId: 'order-1',
        action: 'start-diagnosis',
        source: 'external-system',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        BusinessRuleViolationError,
      );
    });
  });

  describe('execute - approve action', () => {
    it('should successfully approve from AwaitingApproval status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.AwaitingApproval,
        parts: [
          { partId: 'part-1', quantity: 2, unitPriceCentsSnapshot: 2500 },
        ],
      });
      const updatedOrder = {
        ...mockServiceOrder,
        status: ServiceOrderStatus.InExecution,
        executionStartedAt: new Date(),
      };

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);
      mockPartRepository.decrementStock.mockResolvedValue(undefined);
      mockPrismaService.$transaction.mockImplementation(async (callback: any) =>
        callback(),
      );
      mockServiceOrderRepository.updateStatus.mockResolvedValue(updatedOrder);

      const input: UpdateStatusExternalInput = {
        serviceOrderId: 'order-1',
        action: 'approve',
        source: 'external-system',
      };

      const result = await useCase.execute(input);

      expect(mockPartRepository.decrementStock).toHaveBeenCalledWith(
        'part-1',
        2,
      );
      expect(mockServiceOrderRepository.updateStatus).toHaveBeenCalledWith(
        'order-1',
        ServiceOrderStatus.InExecution,
        expect.objectContaining({ executionStartedAt: expect.any(Date) }),
      );
      expect(result).toEqual(updatedOrder);
    });

    it('should throw error when approving from wrong status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.InDiagnosis,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      const input: UpdateStatusExternalInput = {
        serviceOrderId: 'order-1',
        action: 'approve',
        source: 'external-system',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        BusinessRuleViolationError,
      );
    });

    it('should use transaction for approve action', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.AwaitingApproval,
      });
      const updatedOrder = {
        ...mockServiceOrder,
        status: ServiceOrderStatus.InExecution,
        executionStartedAt: new Date(),
      };

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);
      mockPartRepository.decrementStock.mockResolvedValue(undefined);
      mockServiceOrderRepository.updateStatus.mockResolvedValue(updatedOrder);

      let transactionCalled = false;
      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          transactionCalled = true;
          return callback();
        },
      );

      const input: UpdateStatusExternalInput = {
        serviceOrderId: 'order-1',
        action: 'approve',
        source: 'external-system',
      };

      await useCase.execute(input);

      expect(transactionCalled).toBe(true);
    });
  });

  describe('execute - reject action', () => {
    it('should successfully reject from AwaitingApproval status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.AwaitingApproval,
      });
      const rejectedOrder = {
        ...mockServiceOrder,
        status: ServiceOrderStatus.InDiagnosis,
      };

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);
      mockServiceOrderRepository.updateStatus.mockResolvedValue(rejectedOrder);

      const input: UpdateStatusExternalInput = {
        serviceOrderId: 'order-1',
        action: 'reject',
        source: 'external-system',
      };

      const result = await useCase.execute(input);

      expect(mockServiceOrderRepository.updateStatus).toHaveBeenCalledWith(
        'order-1',
        ServiceOrderStatus.InDiagnosis,
      );
      expect(result).toEqual(rejectedOrder);
    });

    it('should throw error when rejecting from wrong status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.InDiagnosis,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      const input: UpdateStatusExternalInput = {
        serviceOrderId: 'order-1',
        action: 'reject',
        source: 'external-system',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        BusinessRuleViolationError,
      );
    });
  });

  describe('execute - finalize action', () => {
    it('should successfully finalize from InExecution status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.InExecution,
      });
      const finalizedOrder = {
        ...mockServiceOrder,
        status: ServiceOrderStatus.Finalized,
        finalizedAt: new Date(),
      };

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);
      mockServiceOrderRepository.updateStatus.mockResolvedValue(finalizedOrder);

      const input: UpdateStatusExternalInput = {
        serviceOrderId: 'order-1',
        action: 'finalize',
        source: 'external-system',
      };

      const result = await useCase.execute(input);

      expect(mockServiceOrderRepository.updateStatus).toHaveBeenCalledWith(
        'order-1',
        ServiceOrderStatus.Finalized,
        expect.objectContaining({ finalizedAt: expect.any(Date) }),
      );
      expect(result).toEqual(finalizedOrder);
    });

    it('should throw error when finalizing from wrong status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.InDiagnosis,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      const input: UpdateStatusExternalInput = {
        serviceOrderId: 'order-1',
        action: 'finalize',
        source: 'external-system',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        BusinessRuleViolationError,
      );
    });
  });

  describe('execute - deliver action', () => {
    it('should successfully deliver from Finalized status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.Finalized,
      });
      const deliveredOrder = {
        ...mockServiceOrder,
        status: ServiceOrderStatus.Delivered,
        deliveredAt: new Date(),
      };

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);
      mockServiceOrderRepository.updateStatus.mockResolvedValue(deliveredOrder);

      const input: UpdateStatusExternalInput = {
        serviceOrderId: 'order-1',
        action: 'deliver',
        source: 'external-system',
      };

      const result = await useCase.execute(input);

      expect(mockServiceOrderRepository.updateStatus).toHaveBeenCalledWith(
        'order-1',
        ServiceOrderStatus.Delivered,
        expect.objectContaining({ deliveredAt: expect.any(Date) }),
      );
      expect(result).toEqual(deliveredOrder);
    });

    it('should throw error when delivering from wrong status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.InDiagnosis,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      const input: UpdateStatusExternalInput = {
        serviceOrderId: 'order-1',
        action: 'deliver',
        source: 'external-system',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        BusinessRuleViolationError,
      );
    });
  });

  describe('execute - general', () => {
    it('should throw NotFoundError when order not found', async () => {
      mockServiceOrderRepository.findById.mockResolvedValue(null);

      const input: UpdateStatusExternalInput = {
        serviceOrderId: 'non-existent',
        action: 'start-diagnosis',
        source: 'external-system',
      };

      await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
      await expect(useCase.execute(input)).rejects.toThrow(
        'Service order not found',
      );
    });

    it('should throw error for unknown action', async () => {
      const mockServiceOrder = createMockServiceOrder();
      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      const input: UpdateStatusExternalInput = {
        serviceOrderId: 'order-1',
        action: 'unknown' as ExternalAction,
        source: 'external-system',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        BusinessRuleViolationError,
      );
      await expect(useCase.execute(input)).rejects.toThrow('Unknown action');
    });

    it('should validate current status for all actions', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.Received,
      });
      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      const actions: ExternalAction[] = [
        'approve',
        'reject',
        'finalize',
        'deliver',
      ];

      for (const action of actions) {
        const input: UpdateStatusExternalInput = {
          serviceOrderId: 'order-1',
          action,
          source: 'external-system',
        };

        await expect(useCase.execute(input)).rejects.toThrow(
          BusinessRuleViolationError,
        );
      }
    });

    it('should include source in the input', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.Received,
      });
      const updatedOrder = {
        ...mockServiceOrder,
        status: ServiceOrderStatus.InDiagnosis,
        diagnosisStartedAt: new Date(),
      };

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);
      mockServiceOrderRepository.updateStatus.mockResolvedValue(updatedOrder);

      const input: UpdateStatusExternalInput = {
        serviceOrderId: 'order-1',
        action: 'start-diagnosis',
        source: 'mobile-app',
      };

      await useCase.execute(input);

      expect(mockServiceOrderRepository.findById).toHaveBeenCalledWith(
        'order-1',
      );
    });

    it('should handle multiple parts when approving', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.AwaitingApproval,
        parts: [
          { partId: 'part-1', quantity: 2, unitPriceCentsSnapshot: 2500 },
          { partId: 'part-2', quantity: 3, unitPriceCentsSnapshot: 1500 },
        ],
      });
      const updatedOrder = {
        ...mockServiceOrder,
        status: ServiceOrderStatus.InExecution,
        executionStartedAt: new Date(),
      };

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);
      mockPartRepository.decrementStock.mockResolvedValue(undefined);
      mockPrismaService.$transaction.mockImplementation(async (callback: any) =>
        callback(),
      );
      mockServiceOrderRepository.updateStatus.mockResolvedValue(updatedOrder);

      const input: UpdateStatusExternalInput = {
        serviceOrderId: 'order-1',
        action: 'approve',
        source: 'external-system',
      };

      await useCase.execute(input);

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
  });
});
