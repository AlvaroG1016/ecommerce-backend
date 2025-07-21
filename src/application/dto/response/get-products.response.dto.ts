import { Product } from "src/domain/entities/product.entity";

export interface GetProductsResponse {
  products: Product[];
  total: number;
  hasMore: boolean;
}
