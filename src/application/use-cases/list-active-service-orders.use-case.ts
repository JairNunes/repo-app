import { Injectable, Inject } from '@nestjs/common';
import { IServiceOrderRepository } from '../ports/service-order.repository.interface';
import { IServiceOrderRepository as IServiceOrderToken } from '../ports/tokens';

@Injectable()
export class ListActiveServiceOrdersUseCase {
  constructor(
    @Inject(IServiceOrderToken)
    private readonly serviceOrderRepository: IServiceOrderRepository,
  ) {}

  async execute() {
    return this.serviceOrderRepository.findAllActive();
  }
}
