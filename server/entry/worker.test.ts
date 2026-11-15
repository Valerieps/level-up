import { describe, expect, it, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({
  DurableObject: class {},
  WorkerEntrypoint: class {
    constructor(
      public ctx: unknown,
      public env: unknown,
    ) {}
  },
}));

// Loaded by a computed path: the test project has no Workers types, so TypeScript must not follow it.
const workerPath = './worker';
const { default: worker, runCron, Cron } = (await import(workerPath)) as {
  default: { scheduled(controller: unknown, env: unknown, ctx: unknown): Promise<void> };
  runCron(env: unknown, ctx: unknown): Promise<void>;
  Cron: new (ctx: unknown, env: unknown) => { tick(): Promise<void> };
};

function fakeEnv() {
  const tick = vi.fn(async () => {});
  const env = { GROUP: { idFromName: () => 'id', get: () => ({ tick }) } };
  return { env, tick };
}

describe('cron', () => {
  it('runCron ticks the group', async () => {
    const { env, tick } = fakeEnv();
    await runCron(env, {});
    expect(tick).toHaveBeenCalledOnce();
  });

  it('scheduled() does the same as runCron', async () => {
    const { env, tick } = fakeEnv();
    await worker.scheduled({}, env, {});
    expect(tick).toHaveBeenCalledOnce();
  });

  it('the Cron entrypoint tick() does the same as runCron', async () => {
    const { env, tick } = fakeEnv();
    await new Cron({}, env).tick();
    expect(tick).toHaveBeenCalledOnce();
  });
});
