import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

describe('Auto Repair Shop API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let serviceId: string;
  let partId: string;
  let serviceOrderId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    await prisma.serviceOrderPart.deleteMany();
    await prisma.serviceOrderService.deleteMany();
    await prisma.serviceOrder.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.part.deleteMany();
    await prisma.service.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication', () => {
    it('should login with admin credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: process.env.ADMIN_EMAIL || 'admin@oficina.com',
          password: process.env.ADMIN_PASSWORD || 'Oficina@2024',
        })
        .expect(201);

      expect(response.body.access_token).toBeDefined();
      authToken = response.body.access_token;
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrong',
        })
        .expect(401);
    });
  });

  describe('Services Management', () => {
    it('should create a service', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Oil Change',
          priceCents: 15000,
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      serviceId = response.body.id;
    });

    it('should list services', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/services')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('Parts Management', () => {
    it('should create a part', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/parts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Engine Oil 5W30',
          priceCents: 5000,
          stockQuantity: 50,
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      partId = response.body.id;
    });
  });

  describe('Service Order Flow', () => {
    it('should create a service order', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/service-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerDocument: '12345678909',
          customerName: 'John Doe',
          vehicle: {
            plate: 'ABC1234',
            make: 'Toyota',
            model: 'Corolla',
            year: 2020,
          },
          serviceIds: [{ serviceId, quantity: 1 }],
          partIds: [{ partId, quantity: 2 }],
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('Received');
      serviceOrderId = response.body.id;
    });

    it('should start diagnosis', async () => {
      const response = await request(app.getHttpServer())
        .post(`/admin/service-orders/${serviceOrderId}/start-diagnosis`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.status).toBe('InDiagnosis');
    });

    it('should send for approval', async () => {
      const response = await request(app.getHttpServer())
        .post(`/admin/service-orders/${serviceOrderId}/send-for-approval`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.status).toBe('AwaitingApproval');
    });

    it('should approve quote and decrement stock', async () => {
      const partBefore = await prisma.part.findUnique({
        where: { id: partId },
      });

      const response = await request(app.getHttpServer())
        .post(`/admin/service-orders/${serviceOrderId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.status).toBe('InExecution');

      const partAfter = await prisma.part.findUnique({ where: { id: partId } });
      if (partBefore && partAfter) {
        expect(partAfter.stockQuantity).toBe(partBefore.stockQuantity - 2);
      }
    });

    it('should finalize service order', async () => {
      const response = await request(app.getHttpServer())
        .post(`/admin/service-orders/${serviceOrderId}/finalize`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.status).toBe('Finalized');
    });

    it('should deliver service order', async () => {
      const response = await request(app.getHttpServer())
        .post(`/admin/service-orders/${serviceOrderId}/deliver`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.status).toBe('Delivered');
    });
  });

  describe('Public Status Query', () => {
    it('should allow customer to check status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/service-orders/${serviceOrderId}/status`)
        .query({ customerDocument: '12345678909' })
        .expect(200);

      expect(response.body.id).toBe(serviceOrderId);
      expect(response.body.status).toBe('Delivered');
      expect(response.body.vehiclePlate).toBeDefined();
    });

    it('should reject status query with wrong document', async () => {
      await request(app.getHttpServer())
        .get(`/service-orders/${serviceOrderId}/status`)
        .query({ customerDocument: '98765432100' })
        .expect(500);
    });
  });

  describe('Metrics', () => {
    it('should get average execution time', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/metrics/average-execution-time')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.averageExecutionTimeMinutes).toBeDefined();
      expect(typeof response.body.averageExecutionTimeMinutes).toBe('number');
    });
  });
});
