export interface Service {
  id: string;
  name: string;
  priceCents: number;
  createdAt: Date;
}

export interface IServiceRepository {
  create(data: { name: string; priceCents: number }): Promise<Service>;
  findById(id: string): Promise<Service | null>;
  findAll(): Promise<Service[]>;
  update(
    id: string,
    data: { name?: string; priceCents?: number },
  ): Promise<Service>;
  delete(id: string): Promise<void>;
}
