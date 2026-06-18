import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { WailsAPI, ThemeConfig } from "./wails-bridge";
import { PosAPI } from "./pos-api";
import { getDefaultLogoUrl, mapThemeConfigFromApi } from "./theme-logo";

const isWailsEnvironment = (): boolean =>
  typeof window !== "undefined" && !!window.go?.main?.App;

interface ThemeContextType {
  themeConfig: ThemeConfig;
  updateTheme: (config: Partial<ThemeConfig>) => Promise<void>;
  uploadLogo: (file: File) => Promise<void>;
  removeLogo: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const defaultTheme: ThemeConfig = {
  primaryColor: "#030213",
  receiptWidthMm: 80,
  logoUrl: getDefaultLogoUrl(),
};

function withResolvedLogo(config: ThemeConfig): ThemeConfig {
  return mapThemeConfigFromApi(config);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(defaultTheme);

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    applyThemeToDOM(themeConfig);
  }, [themeConfig]);

  const loadTheme = async () => {
    try {
      const config = isWailsEnvironment()
        ? await WailsAPI.getThemeConfig()
        : await PosAPI.getThemeConfig();
      setThemeConfig(withResolvedLogo(config));
    } catch (error) {
      console.error("Error loading theme:", error);
    }
  };

  const applyThemeToDOM = (config: ThemeConfig) => {
    const root = document.documentElement;

    if (config.primaryColor) {
      root.style.setProperty("--color-primary", config.primaryColor);
      root.style.setProperty("--primary", config.primaryColor);
    }
  };

  const updateTheme = async (config: Partial<ThemeConfig>) => {
    const newConfig = withResolvedLogo({ ...themeConfig, ...config });
    setThemeConfig(newConfig);

    try {
      if (isWailsEnvironment()) {
        await WailsAPI.saveThemeConfig(newConfig);
      } else {
        const saved = await PosAPI.saveThemeConfig(newConfig);
        setThemeConfig(withResolvedLogo(saved));
      }
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  const uploadLogo = async (file: File) => {
    if (isWailsEnvironment()) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const logoUrl = await WailsAPI.uploadLogo(base64);
      await updateTheme({ logoUrl });
      return;
    }

    const saved = await PosAPI.uploadThemeLogo(file);
    setThemeConfig(withResolvedLogo(saved));
  };

  const removeLogo = async () => {
    if (isWailsEnvironment()) {
      await updateTheme({ logoUrl: undefined, customLogoUrl: undefined });
      return;
    }

    const saved = await PosAPI.deleteThemeLogo();
    setThemeConfig(withResolvedLogo(saved));
  };

  return (
    <ThemeContext.Provider value={{ themeConfig, updateTheme, uploadLogo, removeLogo }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    return {
      themeConfig: defaultTheme,
      updateTheme: async () => undefined,
      uploadLogo: async () => undefined,
      removeLogo: async () => undefined,
    };
  }
  return context;
}
