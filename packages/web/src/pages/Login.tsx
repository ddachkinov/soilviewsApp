import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

/**
 * Login page - JWT authentication + eIDAS SSO.
 */
export function Login() {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">🌾 {t('appName')} {t('buttons.login')}</h1>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('common.email')}</label>
            <input type="email" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('common.password')}</label>
            <input type="password" className="w-full border rounded px-3 py-2" />
          </div>
          <button className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
            {t('buttons.login')}
          </button>
        </form>
      </div>
    </div>
  );
}
