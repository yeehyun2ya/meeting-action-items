import { z } from "zod";

export const meetingPatchSchema = z
  .object({
    title: z.string().min(1).optional(),
  })
  .strict();

export type MeetingPatchInput = z.infer<typeof meetingPatchSchema>;
