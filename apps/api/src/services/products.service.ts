import type { Product } from "@warungkit/contracts";
import { API_ERROR_CODES } from "@warungkit/contracts";
import { ApiError } from "../lib/api-error";
import type { ProductsRepository } from "../repositories/products.repository";

export interface ProductsService {
  listActiveProducts(): Promise<Product[]>;
}

export function createProductsService(repository: ProductsRepository): ProductsService {
  return {
    async listActiveProducts(): Promise<Product[]> {
      try {
        return await repository.listActiveProducts();
      } catch {
        // Repository already stripped raw database error detail; here we
        // translate to the public ApiError contract without adding detail.
        throw new ApiError(500, API_ERROR_CODES.INTERNAL_ERROR, "Unable to load products right now.");
      }
    },
  };
}
