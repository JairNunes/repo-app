export interface Vehicle {
  id: string;
  customerId: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  createdAt: Date;
}

export interface IVehicleRepository {
  create(data: {
    customerId: string;
    plate: string;
    make: string;
    model: string;
    year: number;
  }): Promise<Vehicle>;
  findByCustomerAndPlate(
    customerId: string,
    plate: string,
  ): Promise<Vehicle | null>;
  findById(id: string): Promise<Vehicle | null>;
  findAll(): Promise<Vehicle[]>;
  update(
    id: string,
    data: { make?: string; model?: string; year?: number },
  ): Promise<Vehicle>;
  delete(id: string): Promise<void>;
}
