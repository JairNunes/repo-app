import { ListActiveServiceOrdersUseCase } from './list-active-service-orders.use-case';
import { IServiceOrderRepository } from '../ports/service-order.repository.interface';
import { ServiceOrderStatus } from '@/domain/service-orders/service-order-status.enum';

describe('ListActiveServiceOrdersUseCase', () => {
  let useCase: ListActiveServiceOrdersUseCase;
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

    useCase = new ListActiveServiceOrdersUseCase(mockServiceOrderRepository);
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

  describe('execute', () => {
    it('should return orders from findAllActive', async () => {
      const mockOrders = [
        createMockServiceOrder({
          id: 'order-1',
          status: ServiceOrderStatus.Received,
        }),
        createMockServiceOrder({
          id: 'order-2',
          status: ServiceOrderStatus.InDiagnosis,
        }),
        createMockServiceOrder({
          id: 'order-3',
          status: ServiceOrderStatus.AwaitingApproval,
        }),
      ];

      mockServiceOrderRepository.findAllActive.mockResolvedValue(mockOrders);

      const result = await useCase.execute();

      expect(mockServiceOrderRepository.findAllActive).toHaveBeenCalled();
      expect(result).toEqual(mockOrders);
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no active orders', async () => {
      mockServiceOrderRepository.findAllActive.mockResolvedValue([]);

      const result = await useCase.execute();

      expect(mockServiceOrderRepository.findAllActive).toHaveBeenCalled();
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should include orders in Received status', async () => {
      const mockOrders = [
        createMockServiceOrder({
          id: 'order-1',
          status: ServiceOrderStatus.Received,
        }),
      ];

      mockServiceOrderRepository.findAllActive.mockResolvedValue(mockOrders);

      const result = await useCase.execute();

      expect(result).toContainEqual(
        expect.objectContaining({ status: ServiceOrderStatus.Received }),
      );
    });

    it('should include orders in InDiagnosis status', async () => {
      const mockOrders = [
        createMockServiceOrder({
          id: 'order-1',
          status: ServiceOrderStatus.InDiagnosis,
        }),
      ];

      mockServiceOrderRepository.findAllActive.mockResolvedValue(mockOrders);

      const result = await useCase.execute();

      expect(result).toContainEqual(
        expect.objectContaining({ status: ServiceOrderStatus.InDiagnosis }),
      );
    });

    it('should include orders in AwaitingApproval status', async () => {
      const mockOrders = [
        createMockServiceOrder({
          id: 'order-1',
          status: ServiceOrderStatus.AwaitingApproval,
        }),
      ];

      mockServiceOrderRepository.findAllActive.mockResolvedValue(mockOrders);

      const result = await useCase.execute();

      expect(result).toContainEqual(
        expect.objectContaining({
          status: ServiceOrderStatus.AwaitingApproval,
        }),
      );
    });

    it('should include orders in InExecution status', async () => {
      const mockOrders = [
        createMockServiceOrder({
          id: 'order-1',
          status: ServiceOrderStatus.InExecution,
        }),
      ];

      mockServiceOrderRepository.findAllActive.mockResolvedValue(mockOrders);

      const result = await useCase.execute();

      expect(result).toContainEqual(
        expect.objectContaining({ status: ServiceOrderStatus.InExecution }),
      );
    });

    it('should return multiple active orders', async () => {
      const mockOrders = [
        createMockServiceOrder({
          id: 'order-1',
          status: ServiceOrderStatus.Received,
        }),
        createMockServiceOrder({
          id: 'order-2',
          status: ServiceOrderStatus.InDiagnosis,
        }),
        createMockServiceOrder({
          id: 'order-3',
          status: ServiceOrderStatus.AwaitingApproval,
        }),
        createMockServiceOrder({
          id: 'order-4',
          status: ServiceOrderStatus.InExecution,
        }),
        createMockServiceOrder({
          id: 'order-5',
          status: ServiceOrderStatus.Finalized,
        }),
      ];

      mockServiceOrderRepository.findAllActive.mockResolvedValue(mockOrders);

      const result = await useCase.execute();

      expect(result).toHaveLength(5);
      expect(result).toEqual(mockOrders);
    });

    it('should call findAllActive exactly once', async () => {
      const mockOrders = [createMockServiceOrder({ id: 'order-1' })];

      mockServiceOrderRepository.findAllActive.mockResolvedValue(mockOrders);

      await useCase.execute();

      expect(mockServiceOrderRepository.findAllActive).toHaveBeenCalledTimes(1);
    });

    it('should handle large number of active orders', async () => {
      const mockOrders = Array.from({ length: 100 }, (_, i) =>
        createMockServiceOrder({
          id: `order-${i}`,
          status: ServiceOrderStatus.InDiagnosis,
        }),
      );

      mockServiceOrderRepository.findAllActive.mockResolvedValue(mockOrders);

      const result = await useCase.execute();

      expect(result).toHaveLength(100);
      expect(mockServiceOrderRepository.findAllActive).toHaveBeenCalled();
    });

    it('should return orders with correct structure', async () => {
      const mockOrder = createMockServiceOrder({
        id: 'order-1',
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
        totalCentsSnapshot: 15000,
      });

      mockServiceOrderRepository.findAllActive.mockResolvedValue([mockOrder]);

      const result = await useCase.execute();

      expect(result[0]).toHaveProperty('id', 'order-1');
      expect(result[0]).toHaveProperty('customerId', 'customer-1');
      expect(result[0]).toHaveProperty('vehicleId', 'vehicle-1');
      expect(result[0]).toHaveProperty('totalCentsSnapshot', 15000);
      expect(result[0]).toHaveProperty('status');
      expect(result[0]).toHaveProperty('services');
      expect(result[0]).toHaveProperty('parts');
      expect(result[0]).toHaveProperty('createdAt');
      expect(result[0]).toHaveProperty('updatedAt');
    });
  });
});
