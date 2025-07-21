import { Injectable } from '@nestjs/common';
import { TransactionRepository } from '../../../domain/repositories/transaction.repository';
import { Transaction, TransactionStatus } from '../../../domain/entities/transaction.entity';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaTransactionRepository implements TransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Transaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        product: true,
        delivery: true,
      },
    });

    return transactions.map(this.toDomain);
  }

  async findById(id: number): Promise<Transaction | null> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        product: true,
        delivery: true,
      },
    });

    return transaction ? this.toDomain(transaction) : null;
  }

  async findByIdOrFail(id: number): Promise<Transaction> {
    const transaction = await this.findById(id);
    
    if (!transaction) {
      throw new Error(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async findByCustomerId(customerId: number): Promise<Transaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        product: true,
        delivery: true,
      },
    });

    return transactions.map(this.toDomain);
  }

  async findByStatus(status: TransactionStatus): Promise<Transaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        product: true,
        delivery: true,
      },
    });

    return transactions.map(this.toDomain);
  }

  async findByWompiReference(wompiReference: string): Promise<Transaction | null> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { wompiReference },
      include: {
        customer: true,
        product: true,
        delivery: true,
      },
    });

    return transaction ? this.toDomain(transaction) : null;
  }

  async save(transaction: Transaction): Promise<Transaction> {
    const data = this.toPersistence(transaction);

    let savedTransaction;
    
    if (transaction.id === 0) {
      const { id, ...createData } = data;
      savedTransaction = await this.prisma.transaction.create({
        data: createData,
        include: {
          customer: true,
          product: true,
          delivery: true,
        },
      });
    } else {
      savedTransaction = await this.prisma.transaction.update({
        where: { id: transaction.id },
        data,
        include: {
          customer: true,
          product: true,
          delivery: true,
        },
      });
    }

    return this.toDomain(savedTransaction);
  }

  async update(id: number, transaction: Transaction): Promise<Transaction> {
    const data = this.toPersistence(transaction);
    
    const updatedTransaction = await this.prisma.transaction.update({
      where: { id },
      data,
      include: {
        customer: true,
        product: true,
        delivery: true,
      },
    });

    return this.toDomain(updatedTransaction);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.transaction.delete({
      where: { id },
    });
  }

  
  private toDomain(prismaTransaction: any): Transaction {
    return Transaction.fromPersistence({
      id: prismaTransaction.id,
      customerId: prismaTransaction.customerId,
      productId: prismaTransaction.productId,
      productAmount: Number(prismaTransaction.productAmount),
      baseFee: Number(prismaTransaction.baseFee),
      deliveryFee: Number(prismaTransaction.deliveryFee),
      totalAmount: Number(prismaTransaction.totalAmount),
      status: prismaTransaction.status,
      wompiTransactionId: prismaTransaction.wompiTransactionId,
      wompiReference: prismaTransaction.wompiReference,
      paymentMethod: prismaTransaction.paymentMethod,
      cardLastFour: prismaTransaction.cardLastFour,
      cardBrand: prismaTransaction.cardBrand,
      createdAt: prismaTransaction.createdAt,
      updatedAt: prismaTransaction.updatedAt,
      completedAt: prismaTransaction.completedAt,
    });
  }

  private toPersistence(transaction: Transaction) {
    return {
      id: transaction.id,
      customerId: transaction.customerId,
      productId: transaction.productId,
      productAmount: transaction.productAmount,
      baseFee: transaction.baseFee,
      deliveryFee: transaction.deliveryFee,
      totalAmount: transaction.totalAmount,
      status: transaction.status,
      wompiTransactionId: transaction.wompiTransactionId,
      wompiReference: transaction.wompiReference,
      paymentMethod: transaction.paymentMethod,
      cardLastFour: transaction.cardLastFour,
      cardBrand: transaction.cardBrand,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      completedAt: transaction.completedAt,
    };
  }
}