export interface Part {
  id: string;
  name: string;
  priceCents: number;
  stockQuantity: number;
  createdAt: Date;
}

export interface IPartRepository {
  create(data: {
    name: string;
    priceCents: number;
    stockQuantity: number;
  }): Promise<Part>;
  findById(id: string): Promise<Part | null>;
  findAll(): Promise<Part[]>;
  update(
    id: string,
    data: { name?: string; priceCents?: number; stockQuantity?: number },
  ): Promise<Part>;
  delete(id: string): Promise<void>;
  decrementStock(partId: string, quantity: number): Promise<void>;
}
