import { Product } from "src/domain/entities/product.entity";

export interface GetProductByIdResponse {
  product: Product;
}