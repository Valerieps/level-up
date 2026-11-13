import { useEffect } from 'react';
import { useQuery } from '../use-query';
import { setFeedbackSwitches } from './feedback';

/**
 * Keeps the feedback switches in the member's stored ones: on load, and when another of their apps
 * changes them (they follow the account, like the theme). The defaults hold until then.
 */
export function useFeedbackSync(): void {
  const stored = useQuery('feedback', {}, ['feedback']);
  const vibration = stored.data?.vibration;
  const sound = stored.data?.sound;
  useEffect(() => {
    if (vibration !== undefined && sound !== undefined) setFeedbackSwitches({ vibration, sound });
  }, [vibration, sound]);
}
