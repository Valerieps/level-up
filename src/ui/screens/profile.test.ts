import { describe, expect, it } from 'vitest';
import { initialOf } from './Profile';

describe('the Perfil avatar without a photo', () => {
  it('shows the first letter of the name, upper case', () => {
    expect(initialOf('valeria souza')).toBe('V');
    expect(initialOf('  élida')).toBe('É');
  });

  it('falls back to a question mark for an empty name', () => {
    expect(initialOf('   ')).toBe('?');
  });
});
