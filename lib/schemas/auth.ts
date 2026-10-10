import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),
});

export type LoginInput = z.input<typeof loginSchema>;
