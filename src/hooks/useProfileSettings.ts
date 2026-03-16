import { useCallback, useEffect, useMemo, useState } from "react";
import { syncService } from "../lib/syncService";
import {
  defaultProfileSettings,
  type ProfileSettings,
} from "../types/settings.types";

export const useProfileSettings = (phone: string) => {
  const normalizedPhone = useMemo(() => phone.trim(), [phone]);
  const [settings, setSettings] = useState<ProfileSettings>(
    defaultProfileSettings,
  );

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!normalizedPhone) {
        if (mounted) {
          setSettings(defaultProfileSettings);
        }
        return;
      }

      const synced = await syncService.getSettings(normalizedPhone);
      if (mounted) {
        setSettings(synced ?? defaultProfileSettings);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [normalizedPhone]);

  const saveSettings = useCallback(
    async (next: ProfileSettings) => {
      if (!normalizedPhone) {
        return;
      }

      setSettings(next);
      await syncService.saveSettings(normalizedPhone, next);
    },
    [normalizedPhone],
  );

  const updateSetting = useCallback(
    async <K extends keyof ProfileSettings>(
      key: K,
      value: ProfileSettings[K],
    ) => {
      const next = {
        ...settings,
        [key]: value,
      };

      await saveSettings(next);
    },
    [saveSettings, settings],
  );

  return {
    settings,
    updateSetting,
    saveSettings,
  };
};
