import { useEffect, useState } from 'react';

import { readAgentProfileMemory } from '../services/agentProfileStore';
import { resolveMobileLanguage } from '../utils/localization';

function readDeviceLanguage(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en';
  } catch {
    return 'en';
  }
}

export function usePreferredMobileLanguage(userId?: string | null): string {
  const [language, setLanguage] = useState(() => resolveMobileLanguage(readDeviceLanguage()));

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored = await readAgentProfileMemory(userId, {
        preferredLanguage: readDeviceLanguage().split(/[-_]/)[0] || 'en',
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
