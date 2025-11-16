import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Bulgarian/English translations
const resources = {
  bg: {
    translation: {
      welcome: 'Добре дошли в SoilViews',
      dashboard: 'Табло',
      map: 'Карта',
      fields: 'Полета',
    },
  },
  en: {
    translation: {
      welcome: 'Welcome to SoilViews',
      dashboard: 'Dashboard',
      map: 'Map',
      fields: 'Fields',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'bg', // Default to Bulgarian
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
