import { describe, expect, it } from 'vitest';
import { isCurrent } from './TabBar';

describe('the current tab', () => {
  it('is Hoje only on its own path', () => {
    expect(isCurrent('/', '/')).toBe(true);
    expect(isCurrent('/', '/perfil')).toBe(false);
  });

  it('stays Perfil on the screens under it', () => {
    expect(isCurrent('/perfil', '/perfil')).toBe(true);
    expect(isCurrent('/perfil', '/perfil/arquivados')).toBe(true);
    expect(isCurrent('/perfil', '/perfilx')).toBe(false);
  });
});
