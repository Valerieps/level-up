import { describe, expect, it } from 'vitest';
import type { Celebration } from '../../application/api-contract';
import { mergeMoments, summarize } from './Celebration';

const mastered: Celebration = { kind: 'mastered', habitId: 'h1', habitName: 'Ler', gold: 50, firstTime: true };
const firstAutomated: Celebration = { kind: 'achievement', track: 'automated', milestone: 1, gold: 50 };
const firstStar: Celebration = { kind: 'achievement', track: 'courage', milestone: 1, gold: 50 };

describe('the stacked celebration', () => {
  it('leaves a level alone to its toast', () => {
    expect(summarize({ levelUp: 3, celebrations: [] })).toBeNull();
  });

  it('celebrates a mastery with the habit, its prize and the régua', () => {
    const summary = summarize({ levelUp: null, celebrations: [mastered] });
    expect(summary).toMatchObject({ badge: { kind: 'mastered' }, title: 'Automatizado!', gold: 50, next: { kind: 'regua', habitId: 'h1' } });
    expect(summary?.text).toContain('Ler');
  });

  it('offers the conquistas instead when the habit cannot go up', () => {
    expect(summarize({ levelUp: null, celebrations: [mastered] }, () => false)?.next).toEqual({ kind: 'achievements' });
  });

  it('stacks the level, the mastery and the conquista, smallest first, led by the biggest', () => {
    const summary = summarize({ levelUp: 4, celebrations: [mastered, firstAutomated] });
    expect(summary).toMatchObject({ title: 'Conquista!', badge: { kind: 'achievement', target: 1 }, gold: 100, next: { kind: 'achievements' } });
    expect(summary?.lines.map((line) => line.key)).toEqual(['level', 'm0', 'a1']);
    expect(summary?.kicker).toBe('Trilha Automatizados · marco 1');
  });

  it('names the milestone by its target', () => {
    const summary = summarize({ levelUp: null, celebrations: [{ kind: 'achievement', track: 'courage', milestone: 2, gold: 100 }] });
    expect(summary).toMatchObject({ badge: { target: 5 } });
    expect(summary?.text).toContain('5 Estrelas');
  });

  it('merges what arrives while it is open into one celebration', () => {
    const merged = mergeMoments({ levelUp: 2, celebrations: [mastered] }, { levelUp: 3, celebrations: [firstStar] });
    expect(merged).toEqual({ levelUp: 3, celebrations: [mastered, firstStar] });
    expect(mergeMoments(null, { levelUp: null, celebrations: [] })).toEqual({ levelUp: null, celebrations: [] });
  });
});
