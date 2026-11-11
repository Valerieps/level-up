import { beforeEach, describe, expect, it } from 'vitest';
import type { ProgressView, RewardView, ShopView } from '../../src/application/api-contract';
import { fixedClock, memorySql, sequentialIds } from '../testing/node-sql';
import { GroupService } from './group-service';

const ADMIN = 'ana@example.com';
const WEDNESDAY = '2026-11-11T12:00:00Z';
const ana = 'h-ana';
const bia = 'h-bia';

let service: GroupService;
let sql: ReturnType<typeof memorySql>;

beforeEach(() => {
  sql = memorySql();
  service = new GroupService(sql, fixedClock(WEDNESDAY), sequentialIds());
  service.migrate();
  service.signIn({ sub: 's-ana', email: ADMIN, name: 'Ana', picture: null }, ana, [ADMIN]);
  service.command(ana, 'invite.create', { email: 'bia@example.com' });
  service.signIn({ sub: 's-bia', email: 'bia@example.com', name: 'Bia', picture: null }, bia, [ADMIN]);
});

function ok<T>(result: { ok: boolean; value?: unknown; error?: string }): T {
  expect(result).toMatchObject({ ok: true });
  return result.value as T;
}

const giveGold = (gold: number) => sql.run(
    'INSERT INTO progress (member_id, gold) SELECT id, ? FROM members WHERE email = ? ON CONFLICT (member_id) DO UPDATE SET gold = excluded.gold',
    gold,
    ADMIN,
  );
const create = (name: string, cost: number, session = ana) => service.command(session, 'reward.create', { name, cost });
const shop = (session = ana) => ok<ShopView>(service.query(session, 'shop', {}));
const gold = () => ok<ProgressView>(service.query(ana, 'progress', {})).gold;
const redeem = (rewardId: string) => service.command(ana, 'reward.redeem', { rewardId });

describe('Loja (spec/loja.md)', () => {
  it('creates rewards, cheapest first, and refuses bad names and costs', () => {
    expect(create('Sobremesa especial', 100)).toMatchObject({ ok: true, changed: ['shop'] });
    ok(create('  1  episódio de série ', 40));
    expect(shop().rewards.map((r) => [r.name, r.cost])).toEqual([
      ['1 episódio de série', 40],
      ['Sobremesa especial', 100],
    ]);
    expect(create('', 10)).toEqual({ ok: false, error: 'invalid' });
    expect(create('x'.repeat(81), 10)).toEqual({ ok: false, error: 'invalid' });
    expect(create('Café', 0)).toEqual({ ok: false, error: 'invalid' });
    expect(create('Café', 100_000)).toEqual({ ok: false, error: 'invalid' });
  });

  it('keeps each member’s rewards private', () => {
    const mine = ok<RewardView>(create('Café', 10));
    expect(shop(bia).rewards).toEqual([]);
    expect(service.command(bia, 'reward.update', { rewardId: mine.id, name: 'Meu', cost: 1 })).toEqual({ ok: false, error: 'not_found' });
    expect(service.command(bia, 'reward.delete', { rewardId: mine.id })).toEqual({ ok: false, error: 'not_found' });
    expect(service.command(bia, 'reward.redeem', { rewardId: mine.id })).toEqual({ ok: false, error: 'not_found' });
  });

  it('redeems while the balance covers the cost, again and again, never below 0', () => {
    giveGold(50);
    const coffee = ok<RewardView>(create('Café', 20));
    expect(redeem(coffee.id)).toMatchObject({ ok: true, value: { gold: 30, redemption: { name: 'Café', cost: 20, day: '2026-11-11' } }, changed: ['shop', 'progress'] });
    ok(redeem(coffee.id));
    expect(gold()).toBe(10);
    expect(redeem(coffee.id)).toEqual({ ok: false, error: 'conflict' });
    expect(gold()).toBe(10);
    expect(shop().redemptionCount).toBe(2);
  });

  it('keeps the name and cost of the time of the redemption after an edit or deletion', () => {
    giveGold(100);
    const coffee = ok<RewardView>(create('Café', 20));
    ok(redeem(coffee.id));
    ok(service.command(ana, 'reward.update', { rewardId: coffee.id, name: 'Café gourmet', cost: 30 }));
    ok(redeem(coffee.id));
    ok(service.command(ana, 'reward.delete', { rewardId: coffee.id }));
    expect(shop().rewards).toEqual([]);
    expect(ok<{ name: string; cost: number }[]>(service.query(ana, 'redemptions', {})).map((r) => [r.name, r.cost])).toEqual([
      ['Café gourmet', 30],
      ['Café', 20],
    ]);
  });

  it('shows only the latest redemptions, and counts them all for "Ver tudo"', () => {
    giveGold(100);
    const coffee = ok<RewardView>(create('Café', 1));
    for (let i = 0; i < 7; i++) ok(redeem(coffee.id));
    expect(shop().recent).toHaveLength(5);
    expect(shop().redemptionCount).toBe(7);
    expect(ok<unknown[]>(service.query(ana, 'redemptions', {}))).toHaveLength(7);
  });
});
