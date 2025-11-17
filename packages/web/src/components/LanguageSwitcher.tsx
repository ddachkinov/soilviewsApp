import { useTranslation } from 'react-i18next';

/**
 * Language switcher component for toggling between Bulgarian and English
 */
export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language;

  const toggleLanguage = () => {
    const newLanguage = currentLanguage === 'bg' ? 'en' : 'bg';
    i18n.changeLanguage(newLanguage);
  };

  const getLanguageLabel = () => {
    return currentLanguage === 'bg' ? 'English' : 'Български';
  };

  const getLanguageFlag = () => {
    return currentLanguage === 'bg' ? '🇬🇧' : '🇧🇬';
  };

  return (
    <button
      onClick={toggleLanguage}
      className="language-switcher"
      title={currentLanguage === 'bg' ? 'Switch to English' : 'Превключи на български'}
      aria-label={`Change language to ${getLanguageLabel()}`}
    >
      <span className="language-flag" aria-hidden="true">
        {getLanguageFlag()}
      </span>
      <span className="language-label">{getLanguageLabel()}</span>
    </button>
  );
}
