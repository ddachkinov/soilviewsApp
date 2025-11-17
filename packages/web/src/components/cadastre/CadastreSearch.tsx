import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { fieldsApi, Field } from '../../services/fields';

interface CadastreSearchProps {
  onFieldFound?: (field: Field) => void;
}

/**
 * KAIS cadastre ID search component.
 * Allows users to search for fields by cadastre ID or EKATTE code.
 */
export const CadastreSearch: React.FC<CadastreSearchProps> = ({ onFieldFound }) => {
  const { t } = useTranslation(['cadastre', 'common']);
  const [searchType, setSearchType] = useState<'cadastreId' | 'ekatte'>('cadastreId');
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<Field[] | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const searchMutation = useMutation({
    mutationFn: async () => {
      if (searchType === 'cadastreId') {
        // Validate format first
        const { valid } = await fieldsApi.validateCadastreId(searchValue);
        if (!valid) {
          throw new Error(t('search.errors.invalidCadastreId'));
        }

        const field = await fieldsApi.searchByCadastreId(searchValue);
        return field ? [field] : [];
      } else {
        // EKATTE search
        if (!/^\d{5}$/.test(searchValue)) {
          throw new Error(t('search.errors.invalidEkatte'));
        }

        return await fieldsApi.searchByEkatte(searchValue);
      }
    },
    onSuccess: (fields) => {
      setSearchResults(fields);
      setValidationError(null);

      if (fields.length === 1) {
        onFieldFound?.(fields[0]);
      }
    },
    onError: (error: any) => {
      setValidationError(error.message || t('search.errors.searchFailed'));
      setSearchResults(null);
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchValue.trim()) {
      setValidationError(t('search.errors.noValue'));
      return;
    }

    searchMutation.mutate();
  };

  const handleInputChange = (value: string) => {
    setSearchValue(value);
    setValidationError(null);
    setSearchResults(null);
  };

  return (
    <div className="cadastre-search">
      <div className="search-header">
        <h3>{t('search.title')}</h3>
        <p className="help-text">{t('search.helpText')}</p>
      </div>

      <form onSubmit={handleSearch} className="search-form">
        <div className="search-type-selector">
          <label>
            <input
              type="radio"
              value="cadastreId"
              checked={searchType === 'cadastreId'}
              onChange={(e) => setSearchType(e.target.value as 'cadastreId')}
            />
            {t('search.searchType.cadastreId')}
          </label>
          <label>
            <input
              type="radio"
              value="ekatte"
              checked={searchType === 'ekatte'}
              onChange={(e) => setSearchType(e.target.value as 'ekatte')}
            />
            {t('search.searchType.ekatteCode')}
          </label>
        </div>

        <div className="search-input-group">
          <input
            type="text"
            placeholder={
              searchType === 'cadastreId'
                ? t('search.placeholder.cadastreId')
                : t('search.placeholder.ekatte')
            }
            value={searchValue}
            onChange={(e) => handleInputChange(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn-primary" disabled={searchMutation.isPending}>
            {searchMutation.isPending ? t('common:buttons.searching') : t('common:buttons.search')}
          </button>
        </div>

        {searchType === 'cadastreId' && (
          <div className="help-text">
            {t('search.formatHelp.title')}
            <br />
            {t('search.formatHelp.ekatte')}
            <br />
            {t('search.formatHelp.property')}
            <br />
            {t('search.formatHelp.parcel')}
          </div>
        )}

        {searchType === 'ekatte' && (
          <div className="help-text">
            {t('search.formatHelp.ekatteDescription')}
            <br />
            {t('search.formatHelp.examples')}
          </div>
        )}

        {validationError && <div className="error-message">{validationError}</div>}
      </form>

      {searchResults !== null && (
        <div className="search-results">
          <h4>{t('search.results.title')}</h4>

          {searchResults.length === 0 && (
            <p className="no-results">
              {t('search.results.noResults', {
                type: searchType === 'cadastreId' ? t('search.searchType.cadastreId') : t('search.searchType.ekatteCode'),
                value: searchValue
              })}
            </p>
          )}

          {searchResults.length > 0 && (
            <ul className="results-list">
              {searchResults.map((field) => (
                <li key={field.id} className="result-item">
                  <div className="field-info">
                    <strong>{field.name}</strong>
                    {field.lpisId && <span className="cadastre-id">{t('search.results.id')} {field.lpisId}</span>}
                    <span className="area">{field.areaHectares.toFixed(2)} {t('common:units.ha')}</span>
                  </div>
                  <button
                    onClick={() => onFieldFound?.(field)}
                    className="btn-link"
                  >
                    {t('search.results.viewField')}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {searchResults.length > 1 && (
            <div className="results-summary">
              {t('search.results.foundInMunicipality', { count: searchResults.length })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
