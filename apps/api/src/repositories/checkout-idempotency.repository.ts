import type { SupabaseClient } from "@supabase/supabase-js";

export interface IdempotencyRecord {
  id: string;
  idempotency_key: string;
  request_hash: string;
  order_id: string | null;
  response_payload: Record<string, unknown> | null;
  expires_at: string;
}

export interface CheckoutIdempotencyRepository {
  findByKey(idempotencyKey: string): Promise<IdempotencyRecord | null>;
  create(input: {
    idempotencyKey: string;
    requestHash: string;
    orderId: string;
    responsePayload: Record<string, unknown>;
    expiresAt: string;
  }): Promise<void>;
}

// All database access for checkout idempotency records lives here — the
// service layer never touches Supabase directly for this table.
export function createCheckoutIdempotencyRepository(
  client: SupabaseClient,
): CheckoutIdempotencyRepository {
  return {
    async findByKey(idempotencyKey: string): Promise<IdempotencyRecord | null> {
      const { data, error } = await client
        .from("checkout_idempotency")
        .select("id, idempotency_key, request_hash, order_id, response_payload, expires_at")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (error) {
        throw new Error("checkout_idempotency_repository_query_failed");
      }

      return (data as IdempotencyRecord | null) ?? null;
    },

    async create(input): Promise<void> {
      const { error } = await client.from("checkout_idempotency").insert({
        idempotency_key: input.idempotencyKey,
        request_hash: input.requestHash,
        order_id: input.orderId,
        response_payload: input.responsePayload,
        expires_at: input.expiresAt,
      });

      if (error) {
        throw new Error("checkout_idempotency_repository_insert_failed");
      }
    },
  };
}
