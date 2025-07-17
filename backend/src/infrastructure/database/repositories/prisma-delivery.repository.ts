import { Injectable } from '@nestjs/common';
import { DeliveryRepository } from '../../../domain/repositories/delivery.repository';
import { Delivery, DeliveryStatus } from '../../../domain/entities/delivery.entity';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaDeliveryRepository implements DeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Delivery[]> {
    const deliveries = await this.prisma.delivery.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return deliveries.map(this.toDomain);
  }

  async findById(id: number): Promise<Delivery | null> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
    });

    return delivery ? this.toDomain(delivery) : null;
  }

  async findByIdOrFail(id: number): Promise<Delivery> {
    const delivery = await this.findById(id);
    
    if (!delivery) {
      throw new Error(`Delivery with ID ${id} not found`);
    }

    return delivery;
  }

  async findByTransactionId(transactionId: number): Promise<Delivery | null> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { transactionId },
    });

    return delivery ? this.toDomain(delivery) : null;
  }

  async findByStatus(status: DeliveryStatus): Promise<Delivery[]> {
    const deliveries = await this.prisma.delivery.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });

    return deliveries.map(this.toDomain);
  }

  async save(delivery: Delivery): Promise<Delivery> {
    const data = this.toPersistence(delivery);

    let savedDelivery;
    
    if (delivery.id === 0) {
      // Crear nueva entrega
      const { id, ...createData } = data;
      savedDelivery = await this.prisma.delivery.create({
        data: createData,
      });
    } else {
      // Actualizar entrega existente
      savedDelivery = await this.prisma.delivery.update({
        where: { id: delivery.id },
        data,
      });
    }

    return this.toDomain(savedDelivery);
  }

  async update(id: number, delivery: Delivery): Promise<Delivery> {
    const data = this.toPersistence(delivery);
    
    const updatedDelivery = await this.prisma.delivery.update({
      where: { id },
      data,
    });

    return this.toDomain(updatedDelivery);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.delivery.delete({
      where: { id },
    });
  }

  // Mappers entre Domain y Persistence
  
  private toDomain(prismaDelivery: any): Delivery {
    return Delivery.fromPersistence({
      id: prismaDelivery.id,
      transactionId: prismaDelivery.transactionId,
      address: prismaDelivery.address,
      city: prismaDelivery.city,
      postalCode: prismaDelivery.postalCode,
      phone: prismaDelivery.phone,
      deliveryFee: Number(prismaDelivery.deliveryFee),
      status: prismaDelivery.status,
      createdAt: prismaDelivery.createdAt,
      updatedAt: prismaDelivery.updatedAt,
    });
  }

  private toPersistence(delivery: Delivery) {
    return {
      id: delivery.id,
      transactionId: delivery.transactionId,
      address: delivery.address,
      city: delivery.city,
      postalCode: delivery.postalCode,
      phone: delivery.phone,
      deliveryFee: delivery.deliveryFee,
      status: delivery.status,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt,
    };
  }
}