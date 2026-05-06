import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import {
  SUPPORTED_LANGUAGES,
  dictionaries,
  type Language,
  type TranslationKey
} from './translations';

const STORAGE_KEY = 'signature-stone.language';

const detectInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && (SUPPORTED_LANGUAGES as string[]).includes(stored)) {
    return stored as Language;
  }
  const browser = window.navigator.language?.slice(0, 2).toLowerCase();
  if (browser && (SUPPORTED_LANGUAGES as string[]).includes(browser)) {
    return browser as Language;
  }
  return 'en';
};

const interpolate = (template: string, params?: Record<string, string | number>) => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : `{${key}}`
  );
};

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(detectInitialLanguage);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, lang);
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      const dict = dictionaries[language] ?? dictionaries.en;
      const fallback = dictionaries.en[key];
      const template = dict[key] ?? fallback ?? key;
      return interpolate(template, params);
    },
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useTranslation = (): I18nContextValue => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useTranslation must be used inside <I18nProvider>.');
  }
  return ctx;
};
