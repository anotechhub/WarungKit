import { Hono } from "hono";
import { API_ERROR_CODES, productListResponseSchema } from "@warungkit/contracts";
import { ApiError } from "../lib/api-error";
import { readSupabaseConfig } from "../config/env";
import { createSupabaseServerClient } from "../lib/supabase";
import { createProductsRepository } from "../repositories/products.repository";
import { createProductsService } from "../services/products.service";
import type { CloudflareBindings } from "../types/bindings";
import type { SecurityVariables } from "../middleware/security";

export const productsRoute = new Hono<{
  Bindings: CloudflareBindings;
  Variables: SecurityVariables;
}>();

// GET /api/products: public, read-only. Reads exclusively through the
// repository layer. If required runtime configuration (Supabase bindings)
// is missing, respond 503 with a generic message — never reveal which
// specific binding/secret is absent.
productsRoute.get("/", async (c) => {
  const supabaseConfig = readSupabaseConfig(c.env);

  if (!supabaseConfig) {
    throw new ApiError(
      503,
      API_ERROR_CODES.CONFIGURATION_ERROR,
      "Service configuration is incomplete.",
    );
  }

  const client = createSupabaseServerClient(supabaseConfig);
  const repository = createProductsRepository(client);
  const service = createProductsService(repository);

  const products = await service.listActiveProducts();
  const body = productListResponseSchema.parse(products);

  return c.json(body, 200);
});
