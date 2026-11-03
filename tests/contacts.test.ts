import type { Field, TextFieldSingleValidation } from 'payload';
import { describe, expect, it } from 'vitest';

import { Contacts } from '@/globals/contacts';

const validate = (name: string) =>
  (
    Contacts.fields.find(
      (field: Field) => 'name' in field && field.name === name,
    ) as { validate: TextFieldSingleValidation }
  ).validate;
const check = (name: string, value: string) =>
  validate(name)(value, {} as never);

describe('the store’s contacts', () => {
  it.each(['', '067 123-45-67', '+38 (067) 123-45-67'])(
    'takes the phone «%s»',
    (value) => {
      expect(check('phone', value)).toBe(true);
    },
  );

  it.each(['12', '+48 123 456 789', 'call us'])(
    'refuses the phone «%s»',
    (value) => {
      expect(check('phone', value)).toEqual(expect.any(String));
    },
  );

  it.each([
    '',
    'https://www.instagram.com/sikora.beauty',
    'https://instagram.com/sikora.beauty/',
  ])('takes the Instagram «%s»', (value) => {
    expect(check('instagram', value)).toBe(true);
  });

  // The footer links to it, so a value here decides where a shopper's click goes.
  it.each([
    'javascript:alert(1)',
    'http://www.instagram.com/sikora.beauty',
    'https://www.instagram.com.example.com/sikora.beauty',
    'https://example.com/instagram.com',
    '@sikora.beauty',
  ])('refuses the Instagram «%s»', (value) => {
    expect(check('instagram', value)).toEqual(expect.any(String));
  });
});
