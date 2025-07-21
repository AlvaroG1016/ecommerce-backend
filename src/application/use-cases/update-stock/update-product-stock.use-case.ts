
import { Injectable, Inject } from '@nestjs/common';
import { Result } from '../../../shared/utils/result.util';
import { PRODUCT_REPOSITORY, ProductRepository } from 'src/domain/repositories/product.repository';
import { TRANSACTION_REPOSITORY, TransactionRepository } from 'src/domain/repositories/transaction.repository';
import { Product } from 'src/domain/entities/product.entity';
import { Transaction } from 'src/domain/entities/transaction.entity';


@Injectable()
export class UpdateProductStockUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,

    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepository,
  ) {}

  /**
   * Actualiza el stock de un producto basado en una transacción completada
   * @param transactionId - ID de la transacción completada
   * @param quantity - Cantidad a reducir del stock (default: 1)
   */
  async execute(transactionId: number, quantity: number = 1): Promise<Result<Product>> {
    try {
      console.log(`📦 Updating stock for transaction ${transactionId}, quantity: ${quantity}`);

      debugger;
      const transactionResult = await this.getTransaction(transactionId);
      if (!transactionResult.isSuccess) {
        return Result.failure(transactionResult.error!);
      }
      const transaction = transactionResult.value!;

   
      if (!transaction.isCompleted()) {
        return Result.failure(
          new Error(`Cannot update stock: Transaction ${transactionId} is not completed (status: ${transaction.status})`)
        );
      }

     
      const productResult = await this.getProduct(transaction.productId);
      if (!productResult.isSuccess) {
        return Result.failure(productResult.error!);
      }
      const product = productResult.value!;

   
      if (!product.isActive) {
        return Result.failure(
          new Error(`Cannot update stock: Product ${product.name} is not active`)
        );
      }

     
      const updatedProductResult = this.reduceProductStock(product, quantity);
      if (!updatedProductResult.isSuccess) {
        return Result.failure(updatedProductResult.error!);
      }
      const updatedProduct = updatedProductResult.value!;

     
      const savedProductResult = await this.saveProduct(updatedProduct);
      if (!savedProductResult.isSuccess) {
        return Result.failure(savedProductResult.error!);
      }

      console.log(`✅ Stock updated successfully for product ${product.name}: ${product.stock} → ${updatedProduct.stock}`);
      return Result.success(savedProductResult.value!);

    } catch (error) {
      console.error(`❌ Update product stock failed:`, error);
      return Result.failure(
        new Error(`Failed to update product stock: ${error.message}`)
      );
    }
  }

  private async getTransaction(transactionId: number): Promise<Result<Transaction>> {
    try {
      const transaction = await this.transactionRepository.findById(transactionId);

      if (!transaction) {
        return Result.failure(new Error(`Transaction ${transactionId} not found`));
      }

      console.log(`📋 Transaction found: ID ${transaction.id}, Product ID ${transaction.productId}, Status: ${transaction.status}`);
      return Result.success(transaction);
    } catch (error) {
      return Result.failure(new Error(`Failed to get transaction: ${error.message}`));
    }
  }

  private async getProduct(productId: number): Promise<Result<Product>> {
    try {
      const product = await this.productRepository.findById(productId);

      if (!product) {
        return Result.failure(new Error(`Product ${productId} not found`));
      }

      console.log(`📦 Product found: ${product.name}, Current stock: ${product.stock}`);
      return Result.success(product);
    } catch (error) {
      return Result.failure(new Error(`Failed to get product: ${error.message}`));
    }
  }

  private reduceProductStock(product: Product, quantity: number): Result<Product> {
    try {
   
      const updatedProduct = product.reduceStock(quantity);
      return Result.success(updatedProduct);
    } catch (error) {
      
      return Result.failure(new Error(`Failed to reduce stock: ${error.message}`));
    }
  }

  private async saveProduct(product: Product): Promise<Result<Product>> {
    try {
      const savedProduct = await this.productRepository.save(product);
      return Result.success(savedProduct);
    } catch (error) {
      return Result.failure(new Error(`Failed to save product: ${error.message}`));
    }
  }
}