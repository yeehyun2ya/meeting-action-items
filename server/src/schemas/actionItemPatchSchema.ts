import { z } from "zod";

export const actionItemPatchSchema = z
  .object({
    content: z.string().min(1).optional(),
    assignee: z.string().min(1).nullable().optional(),
    dueDate: z.string().datetime().nullable().optional(),
    dueDateRaw: z.string().min(1).nullable().optional(),
  })
  .strict();

export type ActionItemPatchInput = z.infer<typeof actionItemPatchSchema>;
