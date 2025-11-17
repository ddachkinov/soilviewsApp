import { useTranslation } from 'react-i18next';

/**
 * Fields page - Manage agricultural parcels.
 */
export function Fields() {
  const { t } = useTranslation('fields');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
      <p className="text-gray-600">{t('description')}</p>
    </div>
  );
}
