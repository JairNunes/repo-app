import { Document } from './document.value-object';
import { ValidationError } from '../errors/domain.error';

describe('Document', () => {
  describe('CPF validation', () => {
    it('should accept valid CPF', () => {
      const doc = Document.create('12345678909');
      expect(doc.getValue()).toBe('12345678909');
      expect(doc.isCPF()).toBe(true);
    });

    it('should accept valid CPF with formatting', () => {
      const doc = Document.create('123.456.789-09');
      expect(doc.getValue()).toBe('12345678909');
    });

    it('should reject invalid CPF', () => {
      expect(() => Document.create('12345678900')).toThrow(ValidationError);
    });

    it('should reject CPF with all same digits', () => {
      expect(() => Document.create('11111111111')).toThrow(ValidationError);
    });
  });

  describe('CNPJ validation', () => {
    it('should accept valid CNPJ', () => {
      const doc = Document.create('11222333000181');
      expect(doc.getValue()).toBe('11222333000181');
      expect(doc.isCNPJ()).toBe(true);
    });

    it('should accept valid CNPJ with formatting', () => {
      const doc = Document.create('11.222.333/0001-81');
      expect(doc.getValue()).toBe('11222333000181');
    });

    it('should reject invalid CNPJ', () => {
      expect(() => Document.create('11222333000180')).toThrow(ValidationError);
    });

    it('should reject CNPJ with all same digits', () => {
      expect(() => Document.create('11111111111111')).toThrow(ValidationError);
    });
  });

  describe('Invalid formats', () => {
    it('should reject document with invalid length', () => {
      expect(() => Document.create('123456789')).toThrow(ValidationError);
    });

    it('should reject empty document', () => {
      expect(() => Document.create('')).toThrow(ValidationError);
    });
  });
});
