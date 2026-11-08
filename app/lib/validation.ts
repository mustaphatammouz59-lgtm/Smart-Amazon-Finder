import { z } from 'zod'

/**
 * Server-side input validation infrastructure (SECURITY-PLAN.md §5).
 * Every form action and API input in this project validates through a
 * zod schema on the server. Client-side attributes are UX only.
 */

export const productFinderSchema = z.object({
  q: z.string().trim().max(120, 'Please keep your description under 120 characters.').optional(),
  category: z.enum(['home-office', 'electronics-accessories']),
  sort: z.enum(['best-fit', 'price-asc', 'price-desc', 'durability']).default('best-fit'),
  budget: z.coerce
    .number()
    .int()
    .min(10, 'Budget must be at least $10.')
    .max(10000, 'Budget must be $10,000 or less.'),
  priority: z.enum(['value', 'performance', 'durability', 'design']),
})

export type ProductFinderInput = z.infer<typeof productFinderSchema>

export const giftFinderSchema = z.object({
  recipient: z.enum(['partner', 'parent', 'friend', 'colleague', 'child', 'other']),
  occasion: z.enum(['birthday', 'holiday', 'thank-you', 'new-home', 'back-to-school', 'other']),
  budget: z.coerce
    .number()
    .int()
    .min(10, 'Budget must be at least $10.')
    .max(5000, 'Budget must be $5,000 or less.'),
})

export type GiftFinderInput = z.infer<typeof giftFinderSchema>

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(80),
  email: z.string().trim().email('Please enter a valid email address.').max(160),
  message: z.string().trim().min(10, 'Please write at least a few words.').max(2000),
})

export type ContactInput = z.infer<typeof contactSchema>

export type FieldErrors = Record<string, string>

export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    if (!out[key]) out[key] = issue.message
  }
  return out
}
