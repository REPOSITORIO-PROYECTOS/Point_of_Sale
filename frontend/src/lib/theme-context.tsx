import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { WailsAPI, ThemeConfig } from "./wails-bridge";

interface ThemeContextType {
  themeConfig: ThemeConfig;
  updateTheme: (config: Partial<ThemeConfig>) => void;
  uploadLogo: (file: File) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>({
    primaryColor: "#030213",
  });

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    applyThemeToDOM(themeConfig);
  }, [themeConfig]);

  const loadTheme = async () => {
    try {
      const config = await WailsAPI.getThemeConfig();
      setThemeConfig(config);
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
    const newConfig = { ...themeConfig, ...config };
    setThemeConfig(newConfig);

    try {
      await WailsAPI.saveThemeConfig(newConfig);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  const uploadLogo = async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result as string;
          const logoUrl = await WailsAPI.uploadLogo(base64);
          await updateTheme({ logoUrl });
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <ThemeContext.Provider value={{ themeConfig, updateTheme, uploadLogo }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    return {
      themeConfig: { primaryColor: "#030213" },
      updateTheme: () => Promise.resolve(),
      uploadLogo: () => Promise.resolve(),
    };
  }
  return context;
}
