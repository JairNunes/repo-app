export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class BusinessRuleViolationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessRuleViolationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class InsufficientStockError extends BusinessRuleViolationError {
  constructor(partName: string, required: number, available: number) {
    super(
      `Insufficient stock for ${partName}. Required: ${required}, Available: ${available}`,
    );
    this.name = 'InsufficientStockError';
  }
}
