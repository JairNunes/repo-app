import { ValidationError } from '../errors/domain.error';

export class Plate {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): Plate {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    const oldPattern = /^[A-Z]{3}[0-9]{4}$/;
    const mercosulPattern = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

    if (!oldPattern.test(normalized) && !mercosulPattern.test(normalized)) {
      throw new ValidationError('Invalid vehicle plate format');
    }

    return new Plate(normalized);
  }

  getValue(): string {
    return this.value;
  }

  isOldFormat(): boolean {
    return /^[A-Z]{3}[0-9]{4}$/.test(this.value);
  }

  isMercosulFormat(): boolean {
    return /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(this.value);
  }
}
