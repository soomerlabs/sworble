// THE DAY-ROLLOVER WATCHER (audit blocker: "deal memoized forever") — an app
// alive across midnight must notice the new day. Two triggers, both needed:
//   1. a timer armed for msToNextDay (fires if the app is foregrounded at
//      midnight; JS timers do NOT fire in the background)
//   2. an AppState foreground-return check (covers every slept-past-midnight
//      path the timer misses)
// The hook only reports the CURRENT day key — policy (when to actually
// re-deal, e.g. never mid-round) belongs to the caller.
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import engine from '@sworbl/engine';

export function useDayKey(): string {
  const [dayKey, setDayKey] = useState<string>(() => engine.core.dayKey(new Date()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const armMidnight = () => {
      clearTimeout(timer);
      // +500ms slack: never fire a hair BEFORE the boundary
      timer = setTimeout(check, engine.core.msToNextDay(new Date()) + 500);
    };
    const check = () => {
      const now = engine.core.dayKey(new Date());
      setDayKey((cur) => (cur === now ? cur : now));
      armMidnight();
    };
    armMidnight();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return dayKey;
}
