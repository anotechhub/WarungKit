import { z } from "zod";

export const productTypeSchema = z.enum(["digital_product", "service"]);

export type ProductType = z.infer<typeof productTypeSchema>;

// Public product contract: only fields safe to expose to the storefront.
// Internal metadata (created_at, updated_at, is_active) is intentionally excluded.
export const productSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  price_idr: z.number().int().nonnegative(),
  product_type: productTypeSchema,
  sort_order: z.number().int(),
});

export type Product = z.infer<typeof productSchema>;

export const productListResponseSchema = z.array(productSchema);
