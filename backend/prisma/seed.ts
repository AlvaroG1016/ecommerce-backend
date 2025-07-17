import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(' Seeding database...');

  // Limpiar datos existentes
  await prisma.delivery.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();

  // Crear productos
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'iPhone 14 Pro',
        description: 'Smartphone Apple iPhone 14 Pro 256GB - Color Space Black',
        price: 4500000,
        stock: 10,
        imageUrl: 'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-14-pro-finish-select-202209-6-1inch-spaceblack?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1663703841896',
        baseFee: 50000,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Samsung Galaxy S23',
        description: 'Smartphone Samsung Galaxy S23 128GB - Color Phantom Black',
        price: 3200000,
        stock: 15,
        imageUrl: 'https://images.samsung.com/is/image/samsung/p6pim/co/2302/gallery/co-galaxy-s23-s911-sm-s911bzklltc-534851688?$650_519_PNG$',
        baseFee: 45000,
      },
    }),
    prisma.product.create({
      data: {
        name: 'MacBook Air M2',
        description: 'Laptop Apple MacBook Air M2 256GB - Color Midnight',
        price: 8900000,
        stock: 5,
        imageUrl: 'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/macbook-air-midnight-select-20220606?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1653084303665',
        baseFee: 80000,
      },
    }),
    prisma.product.create({
      data: {
        name: 'AirPods Pro 2',
        description: 'Auriculares Apple AirPods Pro 2da Generación con MagSafe',
        price: 850000,
        stock: 25,
        imageUrl: 'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/MME73?wid=1144&hei=1144&fmt=jpeg&qlt=90&.v=1632861342000',
        baseFee: 15000,
      },
    }),
    prisma.product.create({
      data: {
        name: 'PlayStation 5',
        description: 'Consola Sony PlayStation 5 - Edición estándar',
        price: 2500000,
        stock: 8,
        imageUrl: 'https://gmedia.playstation.com/is/image/SIEPDC/ps5-product-thumbnail-01-en-14sep21?$facebook$',
        baseFee: 35000,
      },
    }),
  ]);

  console.log(`Created ${products.length} products`);

  // Crear algunos clientes de prueba
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: 'Juan Pérez',
        email: 'juan.perez@test.com',
        phone: '+57 300 123 4567',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'María García',
        email: 'maria.garcia@test.com',
        phone: '+57 301 987 6543',
      },
    }),
  ]);

  console.log(` Created ${customers.length} customers`);

  console.log(' Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(' Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });