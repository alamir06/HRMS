import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationAM from './locales/am/translation.json';

const resources = {
  en: {
    translation: translationEN,
  },
  am: {
    translation: translationAM,
  },
};

i18n
  // detect user language
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  .init({
    resources,
    fallbackLng: 'en',
    
    // We can use the language from localStorage if we implement a custom toggle
    lng: localStorage.getItem('i18nextLng') || 'en',

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

export default i18n;
