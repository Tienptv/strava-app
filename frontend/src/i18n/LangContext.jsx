import { createContext, useContext, useState } from 'react';
import translations from './translations';

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'vi');

  const switchLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const t = (key, params = {}) => {
    let str = translations[lang]?.[key] || translations.vi[key] || key;
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
