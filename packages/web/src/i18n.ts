import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

// Get saved language from localStorage or default to Bulgarian
const savedLanguage = localStorage.getItem('soilviews_language') || 'bg';

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: savedLanguage, // Use saved language or default to Bulgarian
    fallbackLng: 'en',
    debug: false, // Disable debug in production

    // Namespaces for organized translations
    ns: [
      'common',
      'dashboard',
      'analysis',
      'cadastre',
      'fields',
      'soilMaps',
      'prescriptions',
      'tutorial',
    ],
    defaultNS: 'common',

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    backend: {
      // Load translation files from public/locales directory
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // React-specific options
    react: {
      useSuspense: true,
    },
  });

// Save language preference when it changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('soilviews_language', lng);
  // Update HTML lang attribute for accessibility
  document.documentElement.lang = lng;
});

// Set initial HTML lang attribute
document.documentElement.lang = savedLanguage;

export default i18n;
