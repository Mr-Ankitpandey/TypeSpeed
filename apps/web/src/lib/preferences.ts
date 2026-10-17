import { z } from 'zod';
import { readStored } from './storage';
export const practiceSchema = z.object({
  duration: z.union([
    z.literal(15),
    z.literal(30),
    z.literal(60),
    z.literal(120),
  ]),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  punctuation: z.boolean(),
  numbers: z.boolean(),
});
export type PracticePreferences = z.infer<typeof practiceSchema>;
export function readPreferences() {
  return readStored<PracticePreferences>(
    'typespeed.practice',
    { duration: 30, difficulty: 'easy', punctuation: false, numbers: false },
    (v): v is PracticePreferences => practiceSchema.safeParse(v).success,
  );
}
