// Who hears about a change (ADR-008). Shared by the server, which decides whose apps to tell, and
// the live socket, which refetches everything after a reconnect.
import type { Topic } from './api-contract';

/** Every topic, for the refetch after a reconnect. */
export const ALL_TOPICS: readonly Topic[] = ['me', 'members', 'invites', 'settings', 'day'];

/** Topics about the group as a whole; every other topic is one member's own data. */
export const GROUP_TOPICS: readonly Topic[] = ['members', 'invites'];

export function isGroupTopic(topic: Topic): boolean {
  return GROUP_TOPICS.includes(topic);
}
