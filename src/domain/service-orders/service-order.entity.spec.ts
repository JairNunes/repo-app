import { ServiceOrder } from './service-order.entity';
import { ServiceOrderStatus } from './service-order-status.enum';
import { BusinessRuleViolationError } from '@/shared/errors/domain.error';

describe('ServiceOrder Entity', () => {
  let serviceOrder: ServiceOrder;

  beforeEach(() => {
    serviceOrder = new ServiceOrder({
      id: '1',
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      status: ServiceOrderStatus.Received,
      totalCentsSnapshot: 10000,
      services: [
        { serviceId: 'service-1', quantity: 1, unitPriceCentsSnapshot: 5000 },
      ],
      parts: [{ partId: 'part-1', quantity: 2, unitPriceCentsSnapshot: 2500 }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  describe('Status transitions', () => {
    it('should transition from Received to InDiagnosis', () => {
      expect(serviceOrder.canStartDiagnosis()).toBe(true);
      serviceOrder.startDiagnosis();
      expect(serviceOrder.status).toBe(ServiceOrderStatus.InDiagnosis);
      expect(serviceOrder.diagnosisStartedAt).toBeDefined();
    });

    it('should not start diagnosis if not in Received status', () => {
      serviceOrder.status = ServiceOrderStatus.InExecution;
      expect(serviceOrder.canStartDiagnosis()).toBe(false);
      expect(() => serviceOrder.startDiagnosis()).toThrow(
        BusinessRuleViolationError,
      );
    });

    it('should transition from InDiagnosis to AwaitingApproval', () => {
      serviceOrder.status = ServiceOrderStatus.InDiagnosis;
      expect(serviceOrder.canSendForApproval()).toBe(true);
      serviceOrder.sendForApproval();
      expect(serviceOrder.status).toBe(ServiceOrderStatus.AwaitingApproval);
    });

    it('should not send for approval if total is zero', () => {
      serviceOrder.status = ServiceOrderStatus.InDiagnosis;
      serviceOrder.totalCentsSnapshot = 0;
      expect(serviceOrder.canSendForApproval()).toBe(false);
      expect(() => serviceOrder.sendForApproval()).toThrow(
        BusinessRuleViolationError,
      );
    });

    it('should approve quote and transition to InExecution', () => {
      serviceOrder.status = ServiceOrderStatus.AwaitingApproval;
      expect(serviceOrder.canApprove()).toBe(true);
      serviceOrder.approve();
      expect(serviceOrder.status).toBe(ServiceOrderStatus.InExecution);
      expect(serviceOrder.executionStartedAt).toBeDefined();
    });

    it('should reject quote and return to InDiagnosis', () => {
      serviceOrder.status = ServiceOrderStatus.AwaitingApproval;
      expect(serviceOrder.canReject()).toBe(true);
      serviceOrder.reject();
      expect(serviceOrder.status).toBe(ServiceOrderStatus.InDiagnosis);
    });

    it('should finalize order from InExecution', () => {
      serviceOrder.status = ServiceOrderStatus.InExecution;
      expect(serviceOrder.canFinalize()).toBe(true);
      serviceOrder.finalize();
      expect(serviceOrder.status).toBe(ServiceOrderStatus.Finalized);
      expect(serviceOrder.finalizedAt).toBeDefined();
    });

    it('should deliver order from Finalized', () => {
      serviceOrder.status = ServiceOrderStatus.Finalized;
      expect(serviceOrder.canDeliver()).toBe(true);
      serviceOrder.deliver();
      expect(serviceOrder.status).toBe(ServiceOrderStatus.Delivered);
      expect(serviceOrder.deliveredAt).toBeDefined();
    });
  });

  describe('Quote calculation', () => {
    it('should calculate total correctly', () => {
      const total = serviceOrder.calculateTotal();
      expect(total).toBe(10000);
    });

    it('should handle multiple services', () => {
      serviceOrder.services = [
        { serviceId: 'service-1', quantity: 2, unitPriceCentsSnapshot: 3000 },
        { serviceId: 'service-2', quantity: 1, unitPriceCentsSnapshot: 2000 },
      ];
      serviceOrder.parts = [];
      const total = serviceOrder.calculateTotal();
      expect(total).toBe(8000);
    });

    it('should handle multiple parts', () => {
      serviceOrder.services = [];
      serviceOrder.parts = [
        { partId: 'part-1', quantity: 3, unitPriceCentsSnapshot: 1000 },
        { partId: 'part-2', quantity: 2, unitPriceCentsSnapshot: 1500 },
      ];
      const total = serviceOrder.calculateTotal();
      expect(total).toBe(6000);
    });

    it('should calculate total with no items', () => {
      serviceOrder.services = [];
      serviceOrder.parts = [];
      const total = serviceOrder.calculateTotal();
      expect(total).toBe(0);
    });
  });
});
