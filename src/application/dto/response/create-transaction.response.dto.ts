import { Customer } from "src/domain/entities/customer.entity";
import { Delivery } from "src/domain/entities/delivery.entity";
import { Product } from "src/domain/entities/product.entity";
import { Transaction } from "src/domain/entities/transaction.entity";

export interface CreateTransactionResponse {
  transaction: Transaction;
  customer: Customer;
  product: Product;
  delivery: Delivery;
}
