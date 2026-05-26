import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Body,
  Query,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { UpdateStatusExternalDto } from './dto/update-status-external.dto';
import { CreateServiceOrderUseCase } from '@/application/use-cases/create-service-order.use-case';
import { StartDiagnosisUseCase } from '@/application/use-cases/start-diagnosis.use-case';
import { SendForApprovalUseCase } from '@/application/use-cases/send-for-approval.use-case';
import { ApproveQuoteUseCase } from '@/application/use-cases/approve-quote.use-case';
import { RejectQuoteUseCase } from '@/application/use-cases/reject-quote.use-case';
import { FinalizeServiceOrderUseCase } from '@/application/use-cases/finalize-service-order.use-case';
import { DeliverServiceOrderUseCase } from '@/application/use-cases/deliver-service-order.use-case';
import { ListActiveServiceOrdersUseCase } from '@/application/use-cases/list-active-service-orders.use-case';
import {
  UpdateStatusExternalUseCase,
  ExternalAction,
} from '@/application/use-cases/update-status-external.use-case';
import { IServiceOrderRepository } from '@/application/ports/service-order.repository.interface';
import { ICustomerRepository } from '@/application/ports/customer.repository.interface';
import { IVehicleRepository } from '@/application/ports/vehicle.repository.interface';
import {
  IServiceOrderRepository as IServiceOrderToken,
  ICustomerRepository as ICustomerToken,
  IVehicleRepository as IVehicleToken,
} from '@/application/ports/tokens';
import { NotFoundError } from '@/shared/errors/domain.error';

@ApiTags('admin/service-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/service-orders')
export class ServiceOrdersController {
  constructor(
    private readonly createServiceOrderUseCase: CreateServiceOrderUseCase,
    private readonly startDiagnosisUseCase: StartDiagnosisUseCase,
    private readonly sendForApprovalUseCase: SendForApprovalUseCase,
    private readonly approveQuoteUseCase: ApproveQuoteUseCase,
    private readonly rejectQuoteUseCase: RejectQuoteUseCase,
    private readonly finalizeServiceOrderUseCase: FinalizeServiceOrderUseCase,
    private readonly deliverServiceOrderUseCase: DeliverServiceOrderUseCase,
    private readonly listActiveServiceOrdersUseCase: ListActiveServiceOrdersUseCase,
    @Inject(IServiceOrderToken)
    private readonly serviceOrderRepository: IServiceOrderRepository,
    @Inject(ICustomerToken)
    private readonly customerRepository: ICustomerRepository,
    @Inject(IVehicleToken)
    private readonly vehicleRepository: IVehicleRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create service order' })
  async create(@Body() dto: CreateServiceOrderDto) {
    return this.createServiceOrderUseCase.execute({
      customerDocument: dto.customerDocument,
      customerName: dto.customerName,
      vehicle: dto.vehicle,
      serviceIds: dto.serviceIds,
      partIds: dto.partIds || [],
    });
  }

  @Get()
  @ApiOperation({
    summary:
      'List active service orders (excludes Finalized/Delivered, ordered by priority)',
  })
  async findAll() {
    const orders = await this.listActiveServiceOrdersUseCase.execute();
    return this.enrichOrders(orders);
  }

  @Get('all')
  @ApiOperation({ summary: 'List all service orders including closed ones' })
  async findAllIncludingClosed() {
    const orders = await this.serviceOrderRepository.findAll();
    return this.enrichOrders(orders);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service order by ID' })
  async findOne(@Param('id') id: string) {
    const order = await this.serviceOrderRepository.findById(id);
    if (!order) {
      throw new NotFoundError('Service order not found');
    }
    const customer = await this.customerRepository.findById(order.customerId);
    const vehicle = await this.vehicleRepository.findById(order.vehicleId);
    return {
      ...order,
      customer: customer
        ? { id: customer.id, name: customer.name, document: customer.document }
        : null,
      vehicle: vehicle
        ? {
            id: vehicle.id,
            plate: vehicle.plate,
            make: vehicle.make,
            model: vehicle.model,
          }
        : null,
    };
  }

  @Post(':id/start-diagnosis')
  @ApiOperation({ summary: 'Start diagnosis' })
  async startDiagnosis(@Param('id') id: string) {
    return this.startDiagnosisUseCase.execute(id);
  }

  @Post(':id/send-for-approval')
  @ApiOperation({ summary: 'Send for approval' })
  async sendForApproval(@Param('id') id: string) {
    return this.sendForApprovalUseCase.execute(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve quote' })
  async approve(@Param('id') id: string) {
    return this.approveQuoteUseCase.execute(id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject quote' })
  async reject(@Param('id') id: string) {
    return this.rejectQuoteUseCase.execute(id);
  }

  @Post(':id/finalize')
  @ApiOperation({ summary: 'Finalize service order' })
  async finalize(@Param('id') id: string) {
    return this.finalizeServiceOrderUseCase.execute(id);
  }

  @Post(':id/deliver')
  @ApiOperation({ summary: 'Deliver service order' })
  async deliver(@Param('id') id: string) {
    return this.deliverServiceOrderUseCase.execute(id);
  }

  private async enrichOrders(orders: any[]) {
    const enriched = [];
    for (const order of orders) {
      const customer = await this.customerRepository.findById(order.customerId);
      const vehicle = await this.vehicleRepository.findById(order.vehicleId);
      enriched.push({
        ...order,
        customer: customer
          ? {
              id: customer.id,
              name: customer.name,
              document: customer.document,
            }
          : null,
        vehicle: vehicle
          ? {
              id: vehicle.id,
              plate: vehicle.plate,
              make: vehicle.make,
              model: vehicle.model,
            }
          : null,
      });
    }
    return enriched;
  }
}

@ApiTags('service-orders')
@Controller('service-orders')
export class PublicServiceOrdersController {
  constructor(
    @Inject(IServiceOrderToken)
    private readonly serviceOrderRepository: IServiceOrderRepository,
    @Inject(ICustomerToken)
    private readonly customerRepository: ICustomerRepository,
    @Inject(IVehicleToken)
    private readonly vehicleRepository: IVehicleRepository,
    private readonly updateStatusExternalUseCase: UpdateStatusExternalUseCase,
  ) {}

  @Get(':id/status')
  @ApiOperation({ summary: 'Check service order status (public)' })
  @ApiQuery({ name: 'customerDocument', required: true })
  async getStatus(
    @Param('id') id: string,
    @Query('customerDocument') customerDocument: string,
  ) {
    const order = await this.serviceOrderRepository.findById(id);
    if (!order) {
      throw new NotFoundError('Service order not found');
    }

    const customer = await this.customerRepository.findById(order.customerId);
    if (
      !customer ||
      customer.document !== customerDocument.replace(/\D/g, '')
    ) {
      throw new NotFoundError('Unauthorized');
    }

    const vehicle = await this.vehicleRepository.findById(order.vehicleId);

    return {
      id: order.id,
      status: order.status,
      vehiclePlate: vehicle?.plate,
      updatedAt: order.updatedAt,
    };
  }

  @Post(':id/external-update')
  @ApiOperation({
    summary:
      'Update service order status via external mechanism (email, webhook, etc.)',
  })
  async externalStatusUpdate(
    @Param('id') id: string,
    @Body() dto: UpdateStatusExternalDto,
  ) {
    return this.updateStatusExternalUseCase.execute({
      serviceOrderId: id,
      action: dto.action as ExternalAction,
      source: dto.source,
    });
  }
}
