import { SendForApprovalUseCase } from './send-for-approval.use-case';
import { IServiceOrderRepository } from '../ports/service-order.repository.interface';
import { ServiceOrderStatus } from '@/domain/service-orders/service-order-status.enum';
import {
  NotFoundError,
  BusinessRuleViolationError,
} from '@/shared/errors/domain.error';

describe('SendForApprovalUseCase', () => {
  let useCase: SendForApprovalUseCase;
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

    useCase = new SendForApprovalUseCase(mockServiceOrderRepository);
  });

  function createMockServiceOrder(overrides: Record<string, any> = {}) {
    return {
      id: 'order-1',
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      status: ServiceOrderStatus.InDiagnosis,
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
    it('should successfully send for approval from InDiagnosis with totalCentsSnapshot > 0', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.InDiagnosis,
        totalCentsSnapshot: 10000,
      });
      const sentForApprovalOrder = {
        ...mockServiceOrder,
        status: ServiceOrderStatus.AwaitingApproval,
      };

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);
      mockServiceOrderRepository.updateStatus.mockResolvedValue(
        sentForApprovalOrder,
      );

      const result = await useCase.execute('order-1');

      expect(mockServiceOrderRepository.findById).toHaveBeenCalledWith(
        'order-1',
      );
      expect(mockServiceOrderRepository.updateStatus).toHaveBeenCalledWith(
        'order-1',
        ServiceOrderStatus.AwaitingApproval,
      );
      expect(result).toEqual(sentForApprovalOrder);
    });

    it('should throw error when totalCentsSnapshot is 0', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.InDiagnosis,
        totalCentsSnapshot: 0,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      await expect(useCase.execute('order-1')).rejects.toThrow(
        BusinessRuleViolationError,
      );
      expect(mockServiceOrderRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should throw error when sending for approval from wrong status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.Received,
        totalCentsSnapshot: 10000,
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

    it('should not send for approval from Received status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.Received,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      await expect(useCase.execute('order-1')).rejects.toThrow(
        BusinessRuleViolationError,
      );
    });

    it('should not send for approval from AwaitingApproval status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.AwaitingApproval,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      await expect(useCase.execute('order-1')).rejects.toThrow(
        BusinessRuleViolationError,
      );
    });

    it('should not send for approval from InExecution status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.InExecution,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      await expect(useCase.execute('order-1')).rejects.toThrow(
        BusinessRuleViolationError,
      );
    });

    it('should not send for approval from Finalized status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.Finalized,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      await expect(useCase.execute('order-1')).rejects.toThrow(
        BusinessRuleViolationError,
      );
    });

    it('should not send for approval from Delivered status', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.Delivered,
      });

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);

      await expect(useCase.execute('order-1')).rejects.toThrow(
        BusinessRuleViolationError,
      );
    });

    it('should transition to AwaitingApproval status when sending for approval', async () => {
      const mockServiceOrder = createMockServiceOrder();
      const sentForApprovalOrder = {
        ...mockServiceOrder,
        status: ServiceOrderStatus.AwaitingApproval,
      };

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);
      mockServiceOrderRepository.updateStatus.mockResolvedValue(
        sentForApprovalOrder,
      );

      await useCase.execute('order-1');

      expect(mockServiceOrderRepository.updateStatus).toHaveBeenCalledWith(
        'order-1',
        ServiceOrderStatus.AwaitingApproval,
      );
    });

    it('should accept large totalCentsSnapshot values', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.InDiagnosis,
        totalCentsSnapshot: 999999999,
      });
      const sentForApprovalOrder = {
        ...mockServiceOrder,
        status: ServiceOrderStatus.AwaitingApproval,
      };

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);
      mockServiceOrderRepository.updateStatus.mockResolvedValue(
        sentForApprovalOrder,
      );

      const result = await useCase.execute('order-1');

      expect(result).toEqual(sentForApprovalOrder);
      expect(mockServiceOrderRepository.updateStatus).toHaveBeenCalled();
    });

    it('should accept minimum totalCentsSnapshot of 1', async () => {
      const mockServiceOrder = createMockServiceOrder({
        status: ServiceOrderStatus.InDiagnosis,
        totalCentsSnapshot: 1,
      });
      const sentForApprovalOrder = {
        ...mockServiceOrder,
        status: ServiceOrderStatus.AwaitingApproval,
      };

      mockServiceOrderRepository.findById.mockResolvedValue(mockServiceOrder);
      mockServiceOrderRepository.updateStatus.mockResolvedValue(
        sentForApprovalOrder,
      );

      const result = await useCase.execute('order-1');

      expect(result).toEqual(sentForApprovalOrder);
      expect(mockServiceOrderRepository.updateStatus).toHaveBeenCalled();
    });
  });
});
