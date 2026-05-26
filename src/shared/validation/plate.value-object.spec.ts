import { Plate } from './plate.value-object';
import { ValidationError } from '../errors/domain.error';

describe('Plate', () => {
  describe('Old format validation', () => {
    it('should accept valid old format plate', () => {
      const plate = Plate.create('ABC1234');
      expect(plate.getValue()).toBe('ABC1234');
      expect(plate.isOldFormat()).toBe(true);
    });

    it('should accept old format with lowercase and normalize', () => {
      const plate = Plate.create('abc1234');
      expect(plate.getValue()).toBe('ABC1234');
    });

    it('should accept old format with hyphens and normalize', () => {
      const plate = Plate.create('ABC-1234');
      expect(plate.getValue()).toBe('ABC1234');
    });
  });

  describe('Mercosul format validation', () => {
    it('should accept valid Mercosul format plate', () => {
      const plate = Plate.create('ABC1D23');
      expect(plate.getValue()).toBe('ABC1D23');
      expect(plate.isMercosulFormat()).toBe(true);
    });

    it('should accept Mercosul format with lowercase and normalize', () => {
      const plate = Plate.create('abc1d23');
      expect(plate.getValue()).toBe('ABC1D23');
    });
  });

  describe('Invalid formats', () => {
    it('should reject plate with invalid format', () => {
      expect(() => Plate.create('ABCD123')).toThrow(ValidationError);
    });

    it('should reject plate with too few characters', () => {
      expect(() => Plate.create('ABC123')).toThrow(ValidationError);
    });

    it('should reject plate with too many characters', () => {
      expect(() => Plate.create('ABC12345')).toThrow(ValidationError);
    });

    it('should reject empty plate', () => {
      expect(() => Plate.create('')).toThrow(ValidationError);
    });
  });
});
