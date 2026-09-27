import { z } from "zod";

// Match backend constraints.
export const draftSchema = z.object({
  title: z.string().trim().max(100, "タイトルは100文字以内で入力してください。"),
  content: z.string().max(100_000, "本文は100,000文字以内で入力してください。"),
});

export type Draft = z.infer<typeof draftSchema>;
