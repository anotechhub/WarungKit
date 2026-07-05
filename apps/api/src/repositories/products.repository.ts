import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@warungkit/contracts";

export interface ProductsRepository {
  listActiveProducts(): Promise<Product[]>;
  findActiveProductById(productId: string): Promise<Product | null>;
}

// All database access for products lives here. Services/routes must never
// query Supabase directly — this is the only module aware of table/column
// names for `products`.
export function createProductsRepository(client: SupabaseClient): ProductsRepository {
  return {
    async listActiveProducts(): Promise<Product[]> {
      const { data, error } = await client
        .from("products")
        .select("id, slug, name, description, price_idr, product_type, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        // Never surface raw Supabase/Postgres error detail to callers that
        // might forward it to the client — throw a generic signal instead.
        throw new Error("products_repository_query_failed");
      }

      return (data ?? []) as Product[];
    },

    async findActiveProductById(productId: string): Promise<Product | null> {
      const { data, error } = await client
        .from("products")
        .select("id, slug, name, description, price_idr, product_type, sort_order")
        .eq("id", productId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        throw new Error("products_repository_query_failed");
      }

      return (data as Product | null) ?? null;
    },
  };
}
