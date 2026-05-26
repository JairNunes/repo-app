const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...\n');

  // Clean existing data (reverse FK order)
  await prisma.serviceOrderPart.deleteMany();
  await prisma.serviceOrderService.deleteMany();
  await prisma.serviceOrder.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.part.deleteMany();
  await prisma.service.deleteMany();
  console.log('Existing data cleaned.');

  // 1. Admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashedPassword },
    create: { email: adminEmail, password: hashedPassword },
  });
  console.log('Admin: ' + adminEmail + ' / ' + adminPassword);

  // 2. Services
  const services = await Promise.all([
    prisma.service.create({ data: { name: 'Troca de Oleo', priceCents: 15000 } }),
    prisma.service.create({ data: { name: 'Alinhamento e Balanceamento', priceCents: 12000 } }),
    prisma.service.create({ data: { name: 'Revisao de Freios', priceCents: 25000 } }),
    prisma.service.create({ data: { name: 'Troca de Correia Dentada', priceCents: 45000 } }),
    prisma.service.create({ data: { name: 'Diagnostico Eletronico', priceCents: 8000 } }),
    prisma.service.create({ data: { name: 'Troca de Amortecedores', priceCents: 60000 } }),
    prisma.service.create({ data: { name: 'Reparo no Ar Condicionado', priceCents: 35000 } }),
    prisma.service.create({ data: { name: 'Troca de Embreagem', priceCents: 80000 } }),
  ]);
  console.log(services.length + ' services created.');

  // 3. Parts
  const parts = await Promise.all([
    prisma.part.create({ data: { name: 'Oleo Motor 5W30 (1L)', priceCents: 4500, stockQuantity: 50 } }),
    prisma.part.create({ data: { name: 'Filtro de Oleo', priceCents: 3500, stockQuantity: 30 } }),
    prisma.part.create({ data: { name: 'Filtro de Ar', priceCents: 4000, stockQuantity: 25 } }),
    prisma.part.create({ data: { name: 'Pastilha de Freio (jogo)', priceCents: 12000, stockQuantity: 20 } }),
    prisma.part.create({ data: { name: 'Disco de Freio (unidade)', priceCents: 18000, stockQuantity: 15 } }),
    prisma.part.create({ data: { name: 'Correia Dentada', priceCents: 8000, stockQuantity: 10 } }),
    prisma.part.create({ data: { name: 'Amortecedor Dianteiro', priceCents: 25000, stockQuantity: 12 } }),
    prisma.part.create({ data: { name: 'Fluido de Freio DOT4 (500ml)', priceCents: 3000, stockQuantity: 40 } }),
    prisma.part.create({ data: { name: 'Vela de Ignicao (unidade)', priceCents: 2500, stockQuantity: 60 } }),
    prisma.part.create({ data: { name: 'Bateria 60Ah', priceCents: 45000, stockQuantity: 8 } }),
  ]);
  console.log(parts.length + ' parts created.');

  // 4. Customers
  const customers = await Promise.all([
    prisma.customer.create({ data: { name: 'Joao da Silva', document: '12345678901' } }),
    prisma.customer.create({ data: { name: 'Maria Oliveira', document: '98765432100' } }),
    prisma.customer.create({ data: { name: 'Carlos Souza', document: '11122233344' } }),
  ]);
  console.log(customers.length + ' customers created.');

  // 5. Vehicles
  const vehicles = await Promise.all([
    prisma.vehicle.create({ data: { customerId: customers[0].id, plate: 'ABC1D23', make: 'Toyota', model: 'Corolla', year: 2022 } }),
    prisma.vehicle.create({ data: { customerId: customers[0].id, plate: 'XYZ9K88', make: 'Honda', model: 'Civic', year: 2021 } }),
    prisma.vehicle.create({ data: { customerId: customers[1].id, plate: 'DEF4G56', make: 'Volkswagen', model: 'Gol', year: 2020 } }),
    prisma.vehicle.create({ data: { customerId: customers[2].id, plate: 'GHI7H90', make: 'Fiat', model: 'Argo', year: 2023 } }),
  ]);
  console.log(vehicles.length + ' vehicles created.');

  // 6. Service Orders in different statuses

  // OS 1 - Received
  const so1 = await prisma.serviceOrder.create({
    data: {
      customerId: customers[0].id,
      vehicleId: vehicles[0].id,
      status: 'Received',
      totalCentsSnapshot: 19500,
      services: { create: [{ serviceId: services[0].id, quantity: 1, unitPriceCentsSnapshot: 15000 }] },
      parts: { create: [{ partId: parts[0].id, quantity: 1, unitPriceCentsSnapshot: 4500 }] },
    },
  });

  // OS 2 - InDiagnosis
  const so2 = await prisma.serviceOrder.create({
    data: {
      customerId: customers[1].id,
      vehicleId: vehicles[2].id,
      status: 'InDiagnosis',
      totalCentsSnapshot: 37000,
      diagnosisStartedAt: new Date(),
      services: { create: [{ serviceId: services[2].id, quantity: 1, unitPriceCentsSnapshot: 25000 }] },
      parts: { create: [{ partId: parts[3].id, quantity: 1, unitPriceCentsSnapshot: 12000 }] },
    },
  });

  // OS 3 - AwaitingApproval
  const so3 = await prisma.serviceOrder.create({
    data: {
      customerId: customers[2].id,
      vehicleId: vehicles[3].id,
      status: 'AwaitingApproval',
      totalCentsSnapshot: 63000,
      diagnosisStartedAt: new Date(Date.now() - 86400000),
      services: { create: [{ serviceId: services[3].id, quantity: 1, unitPriceCentsSnapshot: 45000 }] },
      parts: {
        create: [
          { partId: parts[5].id, quantity: 1, unitPriceCentsSnapshot: 8000 },
          { partId: parts[8].id, quantity: 4, unitPriceCentsSnapshot: 2500 },
        ],
      },
    },
  });

  // OS 4 - InExecution
  const so4 = await prisma.serviceOrder.create({
    data: {
      customerId: customers[0].id,
      vehicleId: vehicles[1].id,
      status: 'InExecution',
      totalCentsSnapshot: 72000,
      diagnosisStartedAt: new Date(Date.now() - 172800000),
      executionStartedAt: new Date(Date.now() - 86400000),
      services: {
        create: [
          { serviceId: services[1].id, quantity: 1, unitPriceCentsSnapshot: 12000 },
          { serviceId: services[5].id, quantity: 1, unitPriceCentsSnapshot: 60000 },
        ],
      },
    },
  });

  console.log('\nService Orders:');
  console.log('  ' + so1.id + ' - Received        (Joao/Corolla)');
  console.log('  ' + so2.id + ' - InDiagnosis     (Maria/Gol)');
  console.log('  ' + so3.id + ' - AwaitingApproval (Carlos/Argo)');
  console.log('  ' + so4.id + ' - InExecution     (Joao/Civic)');

  console.log('\n=== Seed completed! ===');
  console.log('Login: ' + adminEmail + ' / ' + adminPassword);
  console.log('Customers: Joao (12345678901), Maria (98765432100), Carlos (11122233344)');
}

main()
  .catch(function (e) {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async function () {
    await prisma.$disconnect();
  });
