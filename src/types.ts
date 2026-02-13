import { z } from "zod";

export const FlareOutputSchema = z.object({
  status: z.enum(["clear", "alert"]),
  severity: z.enum(["none", "low", "medium", "high", "critical"]),
  checked_at: z.string(),
  assessment: z.string(),
  signals: z
    .array(
      z.object({
        type: z.string(),
        source: z.string(),
        detail: z.string(),
      })
    )
    .optional(),
});

export const CoreOutputSchema = z.object({
  timestamp: z.string(),
  environment: z.enum(["stable", "elevated", "stressed", "crisis"]),
  assessment: z.string(),
  key_factors: z.array(z.string()),
  sources_used: z.array(z.string()),
  data_freshness: z.string(),
});

export type FlareOutput = z.infer<typeof FlareOutputSchema>;
export type CoreOutput = z.infer<typeof CoreOutputSchema>;
