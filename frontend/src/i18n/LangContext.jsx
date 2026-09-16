import { createContext, useContext, useState, useEffect } from 'react';
import translations from './translations';

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('lang') || 'en';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const switchLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLang;
    }
  };

  const t = (key, params = {}) => {
    let str = translations[lang]?.[key] || translations.en?.[key] || translations.vi?.[key] || key;
    if (params && typeof str === 'string') {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replaceAll(`{${k}}`, v);
      });
    }
    return str;
  };

  return (
    <LangContext.Provider value={{ lang, switchLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
