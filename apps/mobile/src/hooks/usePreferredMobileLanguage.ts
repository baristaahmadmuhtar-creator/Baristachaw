import { useEffect, useState } from 'react';

import { readAgentProfileMemory } from '../services/agentProfileStore';
import { DEFAULT_LANGUAGE } from '../web-shared/constants';
import { resolveMobileLanguage } from '../utils/localization';

export function usePreferredMobileLanguage(userId?: string | null): string {
  const [language, setLanguage] = useState(() => resolveMobileLanguage(DEFAULT_LANGUAGE));

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored = await readAgentProfileMemory(userId, {
        preferredLanguage: DEFAULT_LANGUAGE,
      });
      if (!cancelled) {
        setLanguage(resolveMobileLanguage(stored.preferredLanguage));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return language;
}
