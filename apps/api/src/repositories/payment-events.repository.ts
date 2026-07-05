import type { SupabaseClient } from "@supabase/supabase-js";

export type PaymentEventProcessingStatus =
  | "received"
  | "verified"
  | "duplicate"
  | "ignored"
  | "failed"
  | "rejected";

export interface PaymentEventRecord {
  id: string;
  provider: "mayar";
  provider_event_id: string | null;
  provider_event_hash: string;
  order_id: string | null;
  sanitized_payload: Record<string, unknown>;
  processing_status: PaymentEventProcessingStatus;
  processed_at: string | null;
  error_code: string | null;
}

export interface PaymentEventsRepository {
  findByProviderHash(providerEventHash: string): Promise<PaymentEventRecord | null>;
  create(input: {
    providerEventId: string | null;
    providerEventHash: string;
    orderId: string | null;
    sanitizedPayload: Record<string, unknown>;
    processingStatus: PaymentEventProcessingStatus;
    errorCode?: string | null;
  }): Promise<PaymentEventRecord>;
  markProcessed(
    eventId: string,
    fields: { processingStatus: PaymentEventProcessingStatus; errorCode?: string | null },
  ): Promise<void>;
}

// All database access for payment_events lives here. Only sanitized,
// non-secret fields are ever written — never a raw provider payload, never
// a signature/secret, never unnecessary customer PII.
export function createPaymentEventsRepository(client: SupabaseClient): PaymentEventsRepository {
  return {
    async findByProviderHash(providerEventHash: string): Promise<PaymentEventRecord | null> {
      const { data, error } = await client
        .from("payment_events")
        .select(
          "id, provider, provider_event_id, provider_event_hash, order_id, sanitized_payload, processing_status, processed_at, error_code",
        )
        .eq("provider", "mayar")
        .eq("provider_event_hash", providerEventHash)
        .maybeSingle();

      if (error) {
        throw new Error("payment_events_repository_query_failed");
      }

      return (data as PaymentEventRecord | null) ?? null;
    },

    async create(input): Promise<PaymentEventRecord> {
      const { data, error } = await client
        .from("payment_events")
        .insert({
          provider: "mayar",
          provider_event_id: input.providerEventId,
          provider_event_hash: input.providerEventHash,
          order_id: input.orderId,
          sanitized_payload: input.sanitizedPayload,
          processing_status: input.processingStatus,
          error_code: input.errorCode ?? null,
        })
        .select(
          "id, provider, provider_event_id, provider_event_hash, order_id, sanitized_payload, processing_status, processed_at, error_code",
        )
        .single();

      if (error || !data) {
        throw new Error("payment_events_repository_insert_failed");
      }

      return data as PaymentEventRecord;
    },

    async markProcessed(eventId, fields): Promise<void> {
      const { error } = await client
        .from("payment_events")
        .update({
          processing_status: fields.processingStatus,
          processed_at: new Date().toISOString(),
          error_code: fields.errorCode ?? null,
        })
        .eq("id", eventId);

      if (error) {
        throw new Error("payment_events_repository_update_failed");
      }
    },
  };
}
