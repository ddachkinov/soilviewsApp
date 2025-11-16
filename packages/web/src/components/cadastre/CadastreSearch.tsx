import React, { useState } from 'react';
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
          throw new Error('Invalid cadastre ID format. Expected: XXXXX.YY.ZZZ (e.g., 58761.34.12)');
        }

        const field = await fieldsApi.searchByCadastreId(searchValue);
        return field ? [field] : [];
      } else {
        // EKATTE search
        if (!/^\d{5}$/.test(searchValue)) {
          throw new Error('Invalid EKATTE code. Expected 5 digits.');
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
      setValidationError(error.message || 'Search failed');
      setSearchResults(null);
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchValue.trim()) {
      setValidationError('Please enter a search value');
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
        <h3>Search KAIS Cadastre</h3>
        <p className="help-text">Find fields by cadastre ID or municipality (EKATTE) code</p>
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
            Cadastre ID
          </label>
          <label>
            <input
              type="radio"
              value="ekatte"
              checked={searchType === 'ekatte'}
              onChange={(e) => setSearchType(e.target.value as 'ekatte')}
            />
            EKATTE Code
          </label>
        </div>

        <div className="search-input-group">
          <input
            type="text"
            placeholder={
              searchType === 'cadastreId'
                ? 'e.g., 58761.34.12'
                : 'e.g., 58761 (Sofia municipality)'
            }
            value={searchValue}
            onChange={(e) => handleInputChange(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn-primary" disabled={searchMutation.isPending}>
            {searchMutation.isPending ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searchType === 'cadastreId' && (
          <div className="help-text">
            Format: XXXXX.YY.ZZZ
            <br />
            XXXXX = EKATTE code (municipality)
            <br />
            YY = Property number
            <br />
            ZZZ = Parcel number
          </div>
        )}

        {searchType === 'ekatte' && (
          <div className="help-text">
            EKATTE is a 5-digit code identifying Bulgarian municipalities.
            <br />
            Examples: 58761 (Sofia), 56784 (Plovdiv), 63453 (Varna)
          </div>
        )}

        {validationError && <div className="error-message">{validationError}</div>}
      </form>

      {searchResults !== null && (
        <div className="search-results">
          <h4>Search Results</h4>

          {searchResults.length === 0 && (
            <p className="no-results">
              No fields found for {searchType === 'cadastreId' ? 'cadastre ID' : 'EKATTE code'}{' '}
              "{searchValue}".
            </p>
          )}

          {searchResults.length > 0 && (
            <ul className="results-list">
              {searchResults.map((field) => (
                <li key={field.id} className="result-item">
                  <div className="field-info">
                    <strong>{field.name}</strong>
                    {field.lpisId && <span className="cadastre-id">ID: {field.lpisId}</span>}
                    <span className="area">{field.areaHectares.toFixed(2)} ha</span>
                  </div>
                  <button
                    onClick={() => onFieldFound?.(field)}
                    className="btn-link"
                  >
                    View Field →
                  </button>
                </li>
              ))}
            </ul>
          )}

          {searchResults.length > 1 && (
            <div className="results-summary">
              Found {searchResults.length} fields in municipality
            </div>
          )}
        </div>
      )}
    </div>
  );
};
