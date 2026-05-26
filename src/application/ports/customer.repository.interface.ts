export interface Customer {
  id: string;
  name?: string;
  document: string;
  createdAt: Date;
}

export interface ICustomerRepository {
  create(data: { name?: string; document: string }): Promise<Customer>;
  findByDocument(document: string): Promise<Customer | null>;
  findById(id: string): Promise<Customer | null>;
  findAll(): Promise<Customer[]>;
  update(id: string, data: { name?: string }): Promise<Customer>;
  delete(id: string): Promise<void>;
}
