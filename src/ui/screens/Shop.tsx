import { useState, type FormEvent } from 'react';
import type { RedemptionView, RewardView } from '../../application/api-contract';
import { formatDayShort } from '../../domain/habits/describe';
import { DAILY_GOLD_REFERENCE, daysOfGold, goldMissing, isValidRewardCost, MAX_REWARD_COST, normalizeRewardName, REWARD_NAME_MAX_LENGTH } from '../../domain/shop/reward';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { CoinIcon, Icon } from '../components/Icon';
import { Notice } from '../components/Notice';
import { ScreenHeader } from '../components/ScreenHeader';
import { Sheet } from '../components/Sheet';
import { useQuery } from '../use-query';

const s = strings.shop;

/** The reward being created (null id) or edited, or none. */
type Editing = { readonly reward: RewardView | null } | null;

/**
 * The Loja tab (docs/spec/loja.md): the gold balance, the rewards from the cheapest, each with
 * "Resgatar" or how much gold is missing, and the latest redemptions. An empty Loja suggests two
 * rewards and the pace of gold.
 */
export function Shop() {
  const { backend } = useServices();
  const shop = useQuery('shop', {}, ['shop']);
  const progress = useQuery('progress', {}, ['progress']);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<RewardView | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const gold = progress.data?.gold;

  async function redeem(reward: RewardView) {
    setBusy(reward.id);
    const result = await backend.command('reward.redeem', { rewardId: reward.id });
    setBusy(null);
    if (result.ok) setMessage({ tone: 'info', text: s.redeemed(reward.name) });
    else setMessage({ tone: 'error', text: result.error === 'conflict' ? s.notEnough : strings.genericError });
    shop.reload();
    progress.reload();
  }

  async function addSuggestion(suggestion: { name: string; cost: number }) {
    setBusy(suggestion.name);
    const result = await backend.command('reward.create', suggestion);
    setBusy(null);
    setMessage(result.ok ? null : { tone: 'error', text: strings.genericError });
    shop.reload();
  }

  const header = (
    <ScreenHeader
      title={s.title}
      actions={
        <button type="button" className="icon-button" aria-label={s.create} onClick={() => setEditing({ reward: null })}>
          <Icon name="plus" />
        </button>
      }
    />
  );

  if (!shop.data) {
    return (
      <section>
        {header}
        {shop.error ? (
          <>
            <Notice tone="error">{strings.genericError}</Notice>
            <Button onClick={shop.reload}>{strings.retry}</Button>
          </>
        ) : (
          <p className="muted">{strings.loading}</p>
        )}
      </section>
    );
  }

  const { rewards, recent, redemptionCount } = shop.data;

  return (
    <section>
      {header}
      <div className="card balance-card row">
        <span className="grow">{s.balance}</span>
        <span className="balance mono">
          <CoinIcon />
          <span aria-hidden="true">{gold ?? '–'}</span>
          {gold !== undefined && <span className="visually-hidden">{strings.progress.gold(gold)}</span>}
        </span>
      </div>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {rewards.length === 0 ? (
        <EmptyShop busy={busy} onAdd={(suggestion) => void addSuggestion(suggestion)} onCreate={() => setEditing({ reward: null })} />
      ) : (
        <section className="section-title" aria-labelledby="rewards-title">
          <h2 id="rewards-title">{s.rewards}</h2>
          <ul className="list">
            {rewards.map((reward) => {
              const missing = gold === undefined ? 0 : goldMissing(gold, reward.cost);
              return (
                <li key={reward.id} className="card reward">
                  <button type="button" className="reward-open" aria-label={`${s.edit}: ${reward.name}`} onClick={() => setEditing({ reward })}>
                    <span className="reward-name">{reward.name}</span>
                    <span className="reward-cost mono">
                      <CoinIcon />
                      <span aria-hidden="true">{reward.cost}</span>
                      <span className="visually-hidden">{s.cost(reward.cost)}</span>
                    </span>
                  </button>
                  {missing > 0 ? (
                    <span className="muted small reward-missing">{s.missing(missing)}</span>
                  ) : (
                    <Button
                      variant="secondary"
                      aria-label={s.redeemOf(reward.name)}
                      disabled={gold === undefined || busy !== null}
                      onClick={() => void redeem(reward)}
                    >
                      {s.redeem}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {rewards.length > 0 || recent.length > 0 ? (
        <section className="section-title" aria-labelledby="history-title">
          <div className="section-head">
            <h2 id="history-title">{s.history}</h2>
            {redemptionCount > recent.length && (
              <button type="button" className="text-button" onClick={() => setShowAll(true)}>
                {s.seeAll}
              </button>
            )}
          </div>
          {recent.length === 0 ? <p className="muted small">{s.historyEmpty}</p> : <RedemptionList redemptions={recent} />}
        </section>
      ) : null}

      <RewardSheet
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          setMessage(null);
          shop.reload();
        }}
        onDelete={(reward) => {
          setEditing(null);
          setDeleting(reward);
        }}
      />
      <DeleteRewardDialog
        reward={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => {
          setDeleting(null);
          shop.reload();
        }}
      />
      <Sheet open={showAll} title={s.historyAll} onClose={() => setShowAll(false)}>
        {showAll && <AllRedemptions />}
        <Button variant="secondary" onClick={() => setShowAll(false)}>
          {strings.close}
        </Button>
      </Sheet>
    </section>
  );
}

function EmptyShop({
  busy,
  onAdd,
  onCreate,
}: {
  busy: string | null;
  onAdd: (suggestion: { name: string; cost: number }) => void;
  onCreate: () => void;
}) {
  return (
    <>
      <div className="card column-card section-title">
        <h2>{s.emptyTitle}</h2>
        <p className="muted">{s.emptyText(DAILY_GOLD_REFERENCE)}</p>
      </div>
      <section className="section-title" aria-labelledby="suggestions-title">
        <h2 id="suggestions-title">{s.suggestions}</h2>
        <ul className="list">
          {s.suggestionList.map((suggestion) => (
            <li key={suggestion.name} className="card reward">
              <span className="reward-open">
                <span className="reward-name">{suggestion.name}</span>
                <span className="reward-cost mono">
                  <CoinIcon />
                  <span aria-hidden="true">{suggestion.cost}</span>
                  <span className="visually-hidden">{s.cost(suggestion.cost)}</span>
                </span>
              </span>
              <Button variant="secondary" aria-label={s.addSuggestionOf(suggestion.name)} disabled={busy !== null} onClick={() => onAdd(suggestion)}>
                {s.addSuggestion}
              </Button>
            </li>
          ))}
        </ul>
      </section>
      <Button className="wide" onClick={onCreate}>
        {s.createOwn}
      </Button>
    </>
  );
}

function RedemptionList({ redemptions }: { redemptions: readonly RedemptionView[] }) {
  return (
    <ul className="list day-list">
      {redemptions.map((redemption) => (
        <li key={redemption.id} className="day-item">
          <span className="day-item-name">
            <span>{redemption.name}</span>
            <span className="muted small">{formatDayShort(redemption.day)}</span>
          </span>
          <span className="mono muted" aria-label={s.spentLabel(redemption.cost)}>
            {s.spent(redemption.cost)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AllRedemptions() {
  const all = useQuery('redemptions', {}, ['shop']);
  if (!all.data) return all.error ? <Notice tone="error">{strings.genericError}</Notice> : <p className="muted">{strings.loading}</p>;
  return all.data.length === 0 ? <p className="muted small">{s.historyEmpty}</p> : <RedemptionList redemptions={all.data} />;
}

/** Create or edit a reward: name and cost in gold, with the pace of gold for scale. */
function RewardSheet({
  editing,
  onClose,
  onSaved,
  onDelete,
}: {
  editing: Editing;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (reward: RewardView) => void;
}) {
  const reward = editing?.reward ?? null;
  return (
    <Sheet open={editing !== null} title={reward ? s.edit : s.create} onClose={onClose}>
      {editing && <RewardForm key={reward?.id ?? 'new'} reward={reward} onClose={onClose} onSaved={onSaved} onDelete={onDelete} />}
    </Sheet>
  );
}

function RewardForm({
  reward,
  onClose,
  onSaved,
  onDelete,
}: {
  reward: RewardView | null;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (reward: RewardView) => void;
}) {
  const { backend } = useServices();
  const [name, setName] = useState(reward?.name ?? '');
  const [cost, setCost] = useState(reward ? String(reward.cost) : '');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const cleanName = normalizeRewardName(name);
  const costNumber = Number(cost);
  const costValid = cost.trim() !== '' && isValidRewardCost(costNumber);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (cleanName === null || !costValid) return;
    setBusy(true);
    const input = { name: cleanName, cost: costNumber };
    const result = reward ? await backend.command('reward.update', { ...input, rewardId: reward.id }) : await backend.command('reward.create', input);
    setBusy(false);
    if (!result.ok) return setError(true);
    onSaved();
  }

  return (
    <form className="stack" onSubmit={(event) => void save(event)} noValidate>
      {error && <Notice tone="error">{strings.genericError}</Notice>}
      <Field
        label={s.name}
        value={name}
        maxLength={REWARD_NAME_MAX_LENGTH}
        autoComplete="off"
        error={submitted && cleanName === null ? s.nameError(REWARD_NAME_MAX_LENGTH) : null}
        onChange={(event) => setName(event.target.value)}
      />
      <Field
        label={s.costLabel}
        value={cost}
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_REWARD_COST}
        step={1}
        error={submitted && !costValid ? s.costError(MAX_REWARD_COST.toLocaleString('pt-BR')) : null}
        onChange={(event) => setCost(event.target.value)}
      />
      <p className="muted small">{costValid ? s.pace(DAILY_GOLD_REFERENCE, costNumber, daysOfGold(costNumber)) : s.paceShort(DAILY_GOLD_REFERENCE)}</p>
      <Button type="submit" className="wide" disabled={busy}>
        {s.save}
      </Button>
      {reward ? (
        <Button variant="secondary-danger" className="wide" onClick={() => onDelete(reward)}>
          {s.delete}
        </Button>
      ) : (
        <Button variant="secondary" className="wide" onClick={onClose}>
          {s.cancel}
        </Button>
      )}
    </form>
  );
}

function DeleteRewardDialog({ reward, onClose, onDeleted }: { reward: RewardView | null; onClose: () => void; onDeleted: () => void }) {
  const { backend } = useServices();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function remove() {
    if (!reward) return;
    setBusy(true);
    const result = await backend.command('reward.delete', { rewardId: reward.id });
    setBusy(false);
    if (!result.ok) return setError(true);
    setError(false);
    onDeleted();
  }

  return (
    <Sheet open={reward !== null} variant="confirm" title={reward ? s.deleteTitle(reward.name) : ''} onClose={onClose}>
      {error && <Notice tone="error">{strings.genericError}</Notice>}
      <p>{s.deleteText}</p>
      <div className="stack">
        <Button variant="danger" className="wide" disabled={busy} onClick={() => void remove()}>
          {s.deleteConfirm}
        </Button>
        <Button variant="secondary" className="wide" onClick={onClose}>
          {s.cancel}
        </Button>
      </div>
    </Sheet>
  );
}
