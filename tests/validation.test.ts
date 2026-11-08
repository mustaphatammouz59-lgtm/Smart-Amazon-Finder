import { describe, expect, it } from 'vitest'
import { contactSchema, giftFinderSchema, productFinderSchema } from '../app/lib/validation'

describe('productFinderSchema', () => {
  it('accepts a valid profile', () => {
    const r = productFinderSchema.safeParse({ category: 'home-office', budget: '150', priority: 'value' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.budget).toBe(150)
  })
  it('rejects an unknown category', () => {
    expect(productFinderSchema.safeParse({ category: 'cars', budget: 100, priority: 'value' }).success).toBe(
      false,
    )
  })
  it('rejects an out-of-range budget', () => {
    expect(
      productFinderSchema.safeParse({ category: 'home-office', budget: 5, priority: 'value' }).success,
    ).toBe(false)
    expect(
      productFinderSchema.safeParse({ category: 'home-office', budget: 99999, priority: 'value' }).success,
    ).toBe(false)
  })
})

describe('giftFinderSchema', () => {
  it('accepts valid input and rejects bad budgets', () => {
    expect(
      giftFinderSchema.safeParse({ recipient: 'friend', occasion: 'birthday', budget: 50 }).success,
    ).toBe(true)
    expect(
      giftFinderSchema.safeParse({ recipient: 'friend', occasion: 'birthday', budget: -1 }).success,
    ).toBe(false)
  })
})

describe('contactSchema', () => {
  it('rejects an invalid email and a too-short message', () => {
    expect(
      contactSchema.safeParse({ name: 'Sam', email: 'not-an-email', message: 'hello there world' }).success,
    ).toBe(false)
    expect(contactSchema.safeParse({ name: 'Sam', email: 'sam@example.com', message: 'hi' }).success).toBe(
      false,
    )
    expect(
      contactSchema.safeParse({ name: 'Sam', email: 'sam@example.com', message: 'A perfectly fine message.' })
        .success,
    ).toBe(true)
  })
})
