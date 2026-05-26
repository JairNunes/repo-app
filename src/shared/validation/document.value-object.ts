import { ValidationError } from '../errors/domain.error';

export class Document {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): Document {
    const cleaned = value.replace(/\D/g, '');

    if (cleaned.length === 11) {
      if (!Document.isValidCPF(cleaned)) {
        throw new ValidationError('Invalid CPF');
      }
    } else if (cleaned.length === 14) {
      if (!Document.isValidCNPJ(cleaned)) {
        throw new ValidationError('Invalid CNPJ');
      }
    } else {
      throw new ValidationError(
        'Document must be CPF (11 digits) or CNPJ (14 digits)',
      );
    }

    return new Document(cleaned);
  }

  private static isValidCPF(cpf: string): boolean {
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
      return false;
    }

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cpf.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cpf.charAt(10))) return false;

    return true;
  }

  private static isValidCNPJ(cnpj: string): boolean {
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
      return false;
    }

    let sum = 0;
    let weight = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj.charAt(i)) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (digit !== parseInt(cnpj.charAt(12))) return false;

    sum = 0;
    weight = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj.charAt(i)) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (digit !== parseInt(cnpj.charAt(13))) return false;

    return true;
  }

  getValue(): string {
    return this.value;
  }

  isCPF(): boolean {
    return this.value.length === 11;
  }

  isCNPJ(): boolean {
    return this.value.length === 14;
  }
}
