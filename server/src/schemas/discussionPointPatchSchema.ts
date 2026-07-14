import { z } from "zod";

export const discussionPointPatchSchema = z
  .object({
    content: z.string().min(1).optional(),
  })
  .strict();

export type DiscussionPointPatchInput = z.infer<typeof discussionPointPatchSchema>;
