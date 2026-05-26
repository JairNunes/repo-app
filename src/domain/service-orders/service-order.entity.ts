import { BusinessRuleViolationError } from '@/shared/errors/domain.error';
import { ServiceOrderStatus } from './service-order-status.enum';

export interface ServiceOrderService {
  serviceId: string;
  quantity: number;
  unitPriceCentsSnapshot: number;
}

export interface ServiceOrderPart {
  partId: string;
  quantity: number;
  unitPriceCentsSnapshot: number;
}

export class ServiceOrder {
  id: string;
  customerId: string;
  vehicleId: string;
  status: ServiceOrderStatus;
  totalCentsSnapshot: number;
  services: ServiceOrderService[];
  parts: ServiceOrderPart[];
  createdAt: Date;
  updatedAt: Date;
  diagnosisStartedAt?: Date;
  executionStartedAt?: Date;
  finalizedAt?: Date;
  deliveredAt?: Date;

  constructor(data: Partial<ServiceOrder>) {
    Object.assign(this, data);
  }

  canStartDiagnosis(): boolean {
    return this.status === ServiceOrderStatus.Received;
  }

  canSendForApproval(): boolean {
    return (
      this.status === ServiceOrderStatus.InDiagnosis &&
      this.totalCentsSnapshot > 0
    );
  }

  canApprove(): boolean {
    return this.status === ServiceOrderStatus.AwaitingApproval;
  }

  canReject(): boolean {
    return this.status === ServiceOrderStatus.AwaitingApproval;
  }

  canFinalize(): boolean {
    return this.status === ServiceOrderStatus.InExecution;
  }

  canDeliver(): boolean {
    return this.status === ServiceOrderStatus.Finalized;
  }

  startDiagnosis(): void {
    if (!this.canStartDiagnosis()) {
      throw new BusinessRuleViolationError(
        `Cannot start diagnosis. Current status: ${this.status}`,
      );
    }
    this.status = ServiceOrderStatus.InDiagnosis;
    this.diagnosisStartedAt = new Date();
  }

  sendForApproval(): void {
    if (!this.canSendForApproval()) {
      throw new BusinessRuleViolationError(
        `Cannot send for approval. Current status: ${this.status}. Ensure quote exists.`,
      );
    }
    this.status = ServiceOrderStatus.AwaitingApproval;
  }

  approve(): void {
    if (!this.canApprove()) {
      throw new BusinessRuleViolationError(
        `Cannot approve. Current status: ${this.status}`,
      );
    }
    this.status = ServiceOrderStatus.InExecution;
    this.executionStartedAt = new Date();
  }

  reject(): void {
    if (!this.canReject()) {
      throw new BusinessRuleViolationError(
        `Cannot reject. Current status: ${this.status}`,
      );
    }
    this.status = ServiceOrderStatus.InDiagnosis;
  }

  finalize(): void {
    if (!this.canFinalize()) {
      throw new BusinessRuleViolationError(
        `Cannot finalize. Current status: ${this.status}`,
      );
    }
    this.status = ServiceOrderStatus.Finalized;
    this.finalizedAt = new Date();
  }

  deliver(): void {
    if (!this.canDeliver()) {
      throw new BusinessRuleViolationError(
        `Cannot deliver. Current status: ${this.status}`,
      );
    }
    this.status = ServiceOrderStatus.Delivered;
    this.deliveredAt = new Date();
  }

  calculateTotal(): number {
    const servicesTotal = this.services.reduce(
      (sum, s) => sum + s.quantity * s.unitPriceCentsSnapshot,
      0,
    );
    const partsTotal = this.parts.reduce(
      (sum, p) => sum + p.quantity * p.unitPriceCentsSnapshot,
      0,
    );
    return servicesTotal + partsTotal;
  }
}
