
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

interface SystemSettings {
  // Signup is permanently disabled
}

interface SystemSettingsContextType {
  settings: SystemSettings;
  isLoading: boolean;
  refetchSettings: () => Promise<void>;
}

const defaultSettings: SystemSettings = {
  // No settings needed since signup is disabled
};

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export function SystemSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("system_settings")
        .select("key, value");

      if (error) {
        throw error;
      }

      const settingsMap = data.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);

      setSettings({
        // No settings needed since signup is disabled
      });
    } catch (error) {
      console.error("Error fetching system settings:", error);
      // Fall back to default settings
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    // Subscribe to changes in system_settings table
    const subscription = supabase
      .channel('system_settings_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'system_settings' }, 
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SystemSettingsContext.Provider
      value={{
        settings,
        isLoading,
        refetchSettings: fetchSettings
      }}
    >
      {children}
    </SystemSettingsContext.Provider>
  );
}

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (context === undefined) {
    throw new Error("useSystemSettings must be used within a SystemSettingsProvider");
  }
  return context;
};
