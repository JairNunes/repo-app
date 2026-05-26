import {
  CreateServiceOrderUseCase,
  CreateServiceOrderInput,
} from './create-service-order.use-case';
import { ICustomerRepository } from '../ports/customer.repository.interface';
import { IVehicleRepository } from '../ports/vehicle.repository.interface';
import { IServiceRepository } from '../ports/service.repository.interface';
import { IPartRepository } from '../ports/part.repository.interface';
import { IServiceOrderRepository } from '../ports/service-order.repository.interface';
import { NotFoundError, ValidationError } from '@/shared/errors/domain.error';

describe('CreateServiceOrderUseCase', () => {
  let useCase: CreateServiceOrderUseCase;
  let mockCustomerRepository: jest.Mocked<ICustomerRepository>;
  let mockVehicleRepository: jest.Mocked<IVehicleRepository>;
  let mockServiceRepository: jest.Mocked<IServiceRepository>;
  let mockPartRepository: jest.Mocked<IPartRepository>;
  let mockServiceOrderRepository: jest.Mocked<IServiceOrderRepository>;

  beforeEach(() => {
    mockCustomerRepository = {
      create: jest.fn(),
      findByDocument: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
    } as any;

    mockVehicleRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCustomerAndPlate: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
    } as any;

    mockServiceRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
    } as any;

    mockPartRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      decrementStock: jest.fn(),
    } as any;

    mockServiceOrderRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findAllActive: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      getAverageExecutionTimeMinutes: jest.fn(),
    } as any;

    useCase = new CreateServiceOrderUseCase(
      mockCustomerRepository,
      mockVehicleRepository,
      mockServiceRepository,
      mockPartRepository,
      mockServiceOrderRepository,
    );
  });

  describe('execute', () => {
    const validInput: CreateServiceOrderInput = {
      customerDocument: '12345678909',
      customerName: 'John Doe',
      vehicle: {
        plate: 'ABC1234',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
      },
      serviceIds: [{ serviceId: 'service-1', quantity: 1 }],
      partIds: [{ partId: 'part-1', quantity: 2 }],
    };

    it('should successfully create a service order with existing customer', async () => {
      const mockCustomer = {
        id: 'customer-1',
        document: '12345678909',
        name: 'John Doe',
      };
      const mockVehicle = {
        id: 'vehicle-1',
        customerId: 'customer-1',
        plate: 'ABC1234',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
      };
      const mockService = {
        id: 'service-1',
        name: 'Oil Change',
        priceCents: 5000,
      };
      const mockPart = {
        id: 'part-1',
        name: 'Oil Filter',
        priceCents: 2500,
        stock: 10,
      };
      const mockServiceOrder = {
        id: 'order-1',
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
        status: 'Received',
        totalCentsSnapshot: 10000,
        services: [
          { serviceId: 'service-1', quantity: 1, unitPriceCentsSnapshot: 5000 },
        ],
        parts: [
          { partId: 'part-1', quantity: 2, unitPriceCentsSnapshot: 2500 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCustomerRepository.findByDocument.mockResolvedValue(
        mockCustomer as any,
      );
      mockVehicleRepository.findByCustomerAndPlate.mockResolvedValue(
        mockVehicle as any,
      );
      mockServiceRepository.findById.mockResolvedValue(mockService as any);
      mockPartRepository.findById.mockResolvedValue(mockPart as any);
      mockServiceOrderRepository.create.mockResolvedValue(
        mockServiceOrder as any,
      );

      const result = await useCase.execute(validInput);

      expect(result).toEqual(mockServiceOrder);
      expect(mockCustomerRepository.findByDocument).toHaveBeenCalledWith(
        '12345678909',
      );
      expect(mockCustomerRepository.create).not.toHaveBeenCalled();
      expect(mockVehicleRepository.findByCustomerAndPlate).toHaveBeenCalledWith(
        'customer-1',
        'ABC1234',
      );
      expect(mockVehicleRepository.create).not.toHaveBeenCalled();
    });

    it('should successfully create a service order with new customer', async () => {
      const newCustomer = {
        id: 'customer-2',
        document: '12345678909',
        name: 'John Doe',
      };
      const newVehicle = {
        id: 'vehicle-2',
        customerId: 'customer-2',
        plate: 'ABC1234',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
      };
      const mockService = {
        id: 'service-1',
        name: 'Oil Change',
        priceCents: 5000,
      };
      const mockPart = {
        id: 'part-1',
        name: 'Oil Filter',
        priceCents: 2500,
        stock: 10,
      };
      const mockServiceOrder = {
        id: 'order-2',
        customerId: 'customer-2',
        vehicleId: 'vehicle-2',
        status: 'Received',
        totalCentsSnapshot: 10000,
        services: [
          { serviceId: 'service-1', quantity: 1, unitPriceCentsSnapshot: 5000 },
        ],
        parts: [
          { partId: 'part-1', quantity: 2, unitPriceCentsSnapshot: 2500 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCustomerRepository.findByDocument.mockResolvedValue(null);
      mockCustomerRepository.create.mockResolvedValue(newCustomer as any);
      mockVehicleRepository.findByCustomerAndPlate.mockResolvedValue(null);
      mockVehicleRepository.create.mockResolvedValue(newVehicle as any);
      mockServiceRepository.findById.mockResolvedValue(mockService as any);
      mockPartRepository.findById.mockResolvedValue(mockPart as any);
      mockServiceOrderRepository.create.mockResolvedValue(
        mockServiceOrder as any,
      );

      const result = await useCase.execute(validInput);

      expect(result).toEqual(mockServiceOrder);
      expect(mockCustomerRepository.create).toHaveBeenCalledWith({
        document: '12345678909',
        name: 'John Doe',
      });
      expect(mockVehicleRepository.create).toHaveBeenCalledWith({
        customerId: 'customer-2',
        plate: 'ABC1234',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
      });
    });

    it('should throw NotFoundError when service not found', async () => {
      const mockCustomer = {
        id: 'customer-1',
        document: '12345678909',
        name: 'John Doe',
      };
      const mockVehicle = {
        id: 'vehicle-1',
        customerId: 'customer-1',
        plate: 'ABC1234',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
      };

      mockCustomerRepository.findByDocument.mockResolvedValue(
        mockCustomer as any,
      );
      mockVehicleRepository.findByCustomerAndPlate.mockResolvedValue(
        mockVehicle as any,
      );
      mockServiceRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(validInput)).rejects.toThrow(NotFoundError);
      await expect(useCase.execute(validInput)).rejects.toThrow(
        'Service service-1 not found',
      );
    });

    it('should throw NotFoundError when part not found', async () => {
      const mockCustomer = {
        id: 'customer-1',
        document: '12345678909',
        name: 'John Doe',
      };
      const mockVehicle = {
        id: 'vehicle-1',
        customerId: 'customer-1',
        plate: 'ABC1234',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
      };
      const mockService = {
        id: 'service-1',
        name: 'Oil Change',
        priceCents: 5000,
      };

      mockCustomerRepository.findByDocument.mockResolvedValue(
        mockCustomer as any,
      );
      mockVehicleRepository.findByCustomerAndPlate.mockResolvedValue(
        mockVehicle as any,
      );
      mockServiceRepository.findById.mockResolvedValue(mockService as any);
      mockPartRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(validInput)).rejects.toThrow(NotFoundError);
      await expect(useCase.execute(validInput)).rejects.toThrow(
        'Part part-1 not found',
      );
    });

    it('should validate document format', async () => {
      const invalidInput = { ...validInput, customerDocument: 'invalid' };

      await expect(useCase.execute(invalidInput)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should validate plate format', async () => {
      const invalidInput = {
        ...validInput,
        vehicle: {
          ...validInput.vehicle,
          plate: 'invalid',
        },
      };

      await expect(useCase.execute(invalidInput)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle multiple services and parts', async () => {
      const multiServiceInput: CreateServiceOrderInput = {
        ...validInput,
        serviceIds: [
          { serviceId: 'service-1', quantity: 2 },
          { serviceId: 'service-2', quantity: 1 },
        ],
        partIds: [
          { partId: 'part-1', quantity: 2 },
          { partId: 'part-2', quantity: 3 },
        ],
      };

      const mockCustomer = {
        id: 'customer-1',
        document: '12345678909',
        name: 'John Doe',
      };
      const mockVehicle = {
        id: 'vehicle-1',
        customerId: 'customer-1',
        plate: 'ABC1234',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
      };
      const mockService1 = {
        id: 'service-1',
        name: 'Oil Change',
        priceCents: 5000,
      };
      const mockService2 = {
        id: 'service-2',
        name: 'Filter Change',
        priceCents: 3000,
      };
      const mockPart1 = {
        id: 'part-1',
        name: 'Oil Filter',
        priceCents: 2500,
        stock: 10,
      };
      const mockPart2 = {
        id: 'part-2',
        name: 'Air Filter',
        priceCents: 1500,
        stock: 10,
      };
      const mockServiceOrder = {
        id: 'order-1',
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
        status: 'Received',
        totalCentsSnapshot: 19000,
        services: [
          { serviceId: 'service-1', quantity: 2, unitPriceCentsSnapshot: 5000 },
          { serviceId: 'service-2', quantity: 1, unitPriceCentsSnapshot: 3000 },
        ],
        parts: [
          { partId: 'part-1', quantity: 2, unitPriceCentsSnapshot: 2500 },
          { partId: 'part-2', quantity: 3, unitPriceCentsSnapshot: 1500 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCustomerRepository.findByDocument.mockResolvedValue(
        mockCustomer as any,
      );
      mockVehicleRepository.findByCustomerAndPlate.mockResolvedValue(
        mockVehicle as any,
      );
      mockServiceRepository.findById
        .mockResolvedValueOnce(mockService1 as any)
        .mockResolvedValueOnce(mockService2 as any);
      mockPartRepository.findById
        .mockResolvedValueOnce(mockPart1 as any)
        .mockResolvedValueOnce(mockPart2 as any);
      mockServiceOrderRepository.create.mockResolvedValue(
        mockServiceOrder as any,
      );

      const result = await useCase.execute(multiServiceInput);

      expect(result).toEqual(mockServiceOrder);
      expect(mockServiceRepository.findById).toHaveBeenCalledTimes(2);
      expect(mockPartRepository.findById).toHaveBeenCalledTimes(2);
    });

    it('should use default quantity of 1 when service quantity is not specified', async () => {
      const inputWithoutQuantity: CreateServiceOrderInput = {
        ...validInput,
        serviceIds: [{ serviceId: 'service-1' }],
      };

      const mockCustomer = {
        id: 'customer-1',
        document: '12345678909',
        name: 'John Doe',
      };
      const mockVehicle = {
        id: 'vehicle-1',
        customerId: 'customer-1',
        plate: 'ABC1234',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
      };
      const mockService = {
        id: 'service-1',
        name: 'Oil Change',
        priceCents: 5000,
      };
      const mockPart = {
        id: 'part-1',
        name: 'Oil Filter',
        priceCents: 2500,
        stock: 10,
      };
      const mockServiceOrder = {
        id: 'order-1',
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
        status: 'Received',
        totalCentsSnapshot: 7500,
        services: [
          { serviceId: 'service-1', quantity: 1, unitPriceCentsSnapshot: 5000 },
        ],
        parts: [
          { partId: 'part-1', quantity: 2, unitPriceCentsSnapshot: 2500 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCustomerRepository.findByDocument.mockResolvedValue(
        mockCustomer as any,
      );
      mockVehicleRepository.findByCustomerAndPlate.mockResolvedValue(
        mockVehicle as any,
      );
      mockServiceRepository.findById.mockResolvedValue(mockService as any);
      mockPartRepository.findById.mockResolvedValue(mockPart as any);
      mockServiceOrderRepository.create.mockResolvedValue(
        mockServiceOrder as any,
      );

      const result = await useCase.execute(inputWithoutQuantity);

      expect(mockServiceOrderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          services: [expect.objectContaining({ quantity: 1 })],
        }),
      );
      expect(result).toEqual(mockServiceOrder);
    });
  });
});
