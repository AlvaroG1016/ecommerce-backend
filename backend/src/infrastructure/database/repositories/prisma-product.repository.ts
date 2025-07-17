import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../../domain/repositories/product.repository';
import { Product } from '../../../domain/entities/product.entity';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return products.map(this.toDomain);
  }

  async findById(id: number): Promise<Product | null> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    return product ? this.toDomain(product) : null;
  }

  async findByIdOrFail(id: number): Promise<Product> {
    const product = await this.findById(id);
    
    if (!product) {
      throw new Error(`Product with ID ${id} not found`);
    }

    return product;
  }

  async findAvailable(): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map(this.toDomain);
  }

  async updateStock(id: number, newStock: number): Promise<Product> {
    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: { 
        stock: newStock,
        updatedAt: new Date(),
      },
    });

    return this.toDomain(updatedProduct);
  }

  async save(product: Product): Promise<Product> {
    const data = this.toPersistence(product);

    let savedProduct;
    
    if (product.id === 0) {
      // Crear nuevo producto
      const { id, ...createData } = data;
      savedProduct = await this.prisma.product.create({
        data: createData,
      });
    } else {
      // Actualizar producto existente
      savedProduct = await this.prisma.product.update({
        where: { id: product.id },
        data,
      });
    }

    return this.toDomain(savedProduct);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.product.delete({
      where: { id },
    });
  }

  // Mappers entre Domain y Persistence
  
  private toDomain(prismaProduct: any): Product {
    return Product.fromPersistence({
      id: prismaProduct.id,
      name: prismaProduct.name,
      description: prismaProduct.description || '',
      price: Number(prismaProduct.price),
      stock: prismaProduct.stock,
      imageUrl: prismaProduct.imageUrl || '',
      baseFee: Number(prismaProduct.baseFee),
      isActive: prismaProduct.isActive,
      createdAt: prismaProduct.createdAt,
      updatedAt: prismaProduct.updatedAt,
    });
  }

  private toPersistence(product: Product) {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      imageUrl: product.imageUrl,
      baseFee: product.baseFee,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}