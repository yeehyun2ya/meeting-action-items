import { z } from "zod";

export const decisionPatchSchema = z
  .object({
    content: z.string().min(1).optional(),
  })
  .strict();

export type DecisionPatchInput = z.infer<typeof decisionPatchSchema>;
