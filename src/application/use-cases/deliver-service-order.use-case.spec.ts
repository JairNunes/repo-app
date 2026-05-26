import { DeliverServiceOrderUseCase } from './deliver-service-order.use-case';
import { IServiceOrderRepository } from '../ports/service-order.repository.interface';
import { ServiceOrderStatus } from '@/domain/service-orders/service-order-status.enum';
import {
  NotFoundError,
  BusinessRuleViolationError,
} from '@/shared/errors/domain.error';

describe('DeliverServiceOrderUseCase', () => {
  let useCase: DeliverServiceOrderUseCase;
  let mockServiceOrderRepository: jest.Mocked<IServiceOrderRepository>;

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

    useCase = new DeliverServiceOrderUseCase(mockServiceOrderRepository);
  });

  function createMockServiceOrder(overrides: Record<string, any> = {}) {
    return {
      id: 'order-1',
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      status: ServiceOrderStatus.Finalized,
      totalCentsSnapshot: 10000,
      services: [
        { serviceId: 'svc-1', quantity: 1, unitPriceCentsSnapshot: 5000 },
      ],
      parts: [{ partId: 'part-1', quantity: 2, unitPriceCentsSnapshot: 2500 }],
      createdAt: new Date(),
      updatedAt: new Date(),
      executionStartedAt: new Date(),
      finalizedAt: new Date(),
      ...overrides,
    };
  }

  describe('execute', () => {
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

      const result = await useCase.execute('order-1');

      expect(mockServiceOrderRepository.findById).toHaveBeenCalledWith(
        'order-1',
      );
      expect(mockServiceOrderRepository.updateStatus).toHaveBeenCalledWith(
        'order-1',
        ServiceOrderStatus.Delivered,
        expect.objectContaining({ deliveredAt: expect.any(Date) }),
      );
      expect(result).toEqual(deliveredOrder);
    });

    it('should throw BusinessRuleViolationError when delivering from wrong status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.InExecution,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      await expect(useCase.execute('order-1')).rejects.toThrow(
        BusinessRuleViolationError,
      );
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
      expect(mockServiceOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should not deliver from Received status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.Received,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      await expect(useCase.execute('order-1')).rejects.toThrow(
        BusinessRuleViolationError,
      );
    });

    it('should not deliver from InDiagnosis status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.InDiagnosis,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      await expect(useCase.execute('order-1')).rejects.toThrow(
        BusinessRuleViolationError,
      );
    });

    it('should not deliver from AwaitingApproval status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.AwaitingApproval,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      await expect(useCase.execute('order-1')).rejects.toThrow(
        BusinessRuleViolationError,
      );
    });

    it('should not deliver from InExecution status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.InExecution,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      await expect(useCase.execute('order-1')).rejects.toThrow(
        BusinessRuleViolationError,
      );
    });

    it('should not deliver from Delivered status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.Delivered,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      await expect(useCase.execute('order-1')).rejects.toThrow(
        BusinessRuleViolationError,
      );
    });

    it('should transition to Delivered status when delivering', async () => {
      const mockServiceOrder = createMockServiceOrder();
      const deliveredOrder = {
        ...mockServiceOrder,
        status: ServiceOrderStatus.Delivered,
        deliveredAt: new Date(),
      };

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);
      mockServiceOrderRepository.updateStatus.mockResolvedValue(deliveredOrder);

      await useCase.execute('order-1');

      expect(mockServiceOrderRepository.updateStatus).toHaveBeenCalledWith(
        'order-1',
        ServiceOrderStatus.Delivered,
        expect.objectContaining({ deliveredAt: expect.any(Date) }),
      );
    });

    it('should set deliveredAt timestamp when delivering', async () => {
      const mockServiceOrder = createMockServiceOrder();
      const deliveredOrder = {
        ...mockServiceOrder,
        status: ServiceOrderStatus.Delivered,
        deliveredAt: new Date(),
      };

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);
      mockServiceOrderRepository.updateStatus.mockResolvedValue(deliveredOrder);

      await useCase.execute('order-1');

      const callArgs = mockServiceOrderRepository.updateStatus.mock.calls[0];
      expect(callArgs[2]).toHaveProperty('deliveredAt');
      expect(callArgs[2]!.deliveredAt).toBeInstanceOf(Date);
    });
  });
});
