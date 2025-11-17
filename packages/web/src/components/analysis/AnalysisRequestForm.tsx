import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mapsApi, CreateMapDto } from '../../services/maps';

interface AnalysisRequestFormProps {
  fieldId: string;
  onRequestComplete?: () => void;
}

/**
 * Soil analysis request form component.
 * Allows users to request soil property map generation.
 * Referenced in UI/UX workflow documentation.
 */
export const AnalysisRequestForm: React.FC<AnalysisRequestFormProps> = ({ fieldId, onRequestComplete }) => {
  const { t } = useTranslation('analysis');
  const queryClient = useQueryClient();

  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [cropYear, setCropYear] = useState<number>(new Date().getFullYear());
  const [maxCloudCover, setMaxCloudCover] = useState<number>(20);

  const properties = [
    { value: 'ph', label: t('soilProperties.ph.name'), description: t('soilProperties.ph.description') },
    { value: 'organic_matter', label: t('soilProperties.organicMatter.name'), description: t('soilProperties.organicMatter.description') },
    { value: 'nitrogen', label: t('soilProperties.nitrogen.name'), description: t('soilProperties.nitrogen.description') },
    { value: 'phosphorus', label: t('soilProperties.phosphorus.name'), description: t('soilProperties.phosphorus.description') },
    { value: 'potassium', label: t('soilProperties.potassium.name'), description: t('soilProperties.potassium.description') },
    { value: 'clay_percent', label: t('soilProperties.clay.name'), description: t('soilProperties.clay.description') },
    { value: 'sand_percent', label: t('soilProperties.sand.name'), description: t('soilProperties.sand.description') },
  ];

  const createMapsMutation = useMutation({
    mutationFn: async () => {
      const promises = selectedProperties.map((property) => {
        const dto: CreateMapDto = {
          fieldId,
          property,
          cropYear,
          maxCloudCover,
        };
        return mapsApi.create(dto);
      });

      return Promise.all(promises);
    },
    onSuccess: (data) => {
      alert(t('requestForm.success', { count: data.length }));
      queryClient.invalidateQueries({ queryKey: ['maps', fieldId] });
      setSelectedProperties([]);
      onRequestComplete?.();
    },
    onError: (error: any) => {
      alert(t('requestForm.errorRequest', { message: error.message || 'Unknown error' }));
    },
  });

  const handlePropertyToggle = (property: string) => {
    setSelectedProperties((prev) =>
      prev.includes(property) ? prev.filter((p) => p !== property) : [...prev, property]
    );
  };

  const handleSelectAll = () => {
    setSelectedProperties(properties.map((p) => p.value));
  };

  const handleDeselectAll = () => {
    setSelectedProperties([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedProperties.length === 0) {
      alert(t('requestForm.errorNoProperties'));
      return;
    }

    if (window.confirm(t('requestForm.confirmMessage', { count: selectedProperties.length }))) {
      createMapsMutation.mutate();
    }
  };

  return (
    <div className="analysis-request-form">
      <div className="form-header">
        <h3>{t('requestForm.title')}</h3>
        <p className="help-text">
          {t('requestForm.helpText')}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <label>
            <strong>{t('requestForm.cropYear')}</strong>
          </label>
          <input
            type="number"
            min="2020"
            max="2030"
            value={cropYear}
            onChange={(e) => setCropYear(parseInt(e.target.value))}
            required
          />
        </div>

        <div className="form-section">
          <label>
            <strong>{t('requestForm.maxCloudCover')}</strong>
          </label>
          <input
            type="range"
            min="0"
            max="50"
            value={maxCloudCover}
            onChange={(e) => setMaxCloudCover(parseInt(e.target.value))}
          />
          <span>{maxCloudCover}%</span>
          <p className="help-text">{t('requestForm.cloudCoverHelp')}</p>
        </div>

        <div className="form-section">
          <div className="section-header">
            <strong>{t('requestForm.propertiesToAnalyze')}</strong>
            <div className="select-actions">
              <button type="button" onClick={handleSelectAll} className="btn-link">
                {t('requestForm.selectAll')}
              </button>
              <button type="button" onClick={handleDeselectAll} className="btn-link">
                {t('requestForm.deselectAll')}
              </button>
            </div>
          </div>

          <div className="property-grid">
            {properties.map((property) => (
              <div key={property.value} className="property-card">
                <label>
                  <input
                    type="checkbox"
                    checked={selectedProperties.includes(property.value)}
                    onChange={() => handlePropertyToggle(property.value)}
                  />
                  <div className="property-info">
                    <strong>{property.label}</strong>
                    <span className="description">{property.description}</span>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="form-section">
          <div className="info-box">
            <h4>{t('requestForm.processingInfo.title')}</h4>
            <ul>
              <li>{t('requestForm.processingInfo.duration')}</li>
              <li>{t('requestForm.processingInfo.notifications')}</li>
              <li>{t('requestForm.processingInfo.technology')}</li>
              <li>{t('requestForm.processingInfo.resolution')}</li>
            </ul>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={createMapsMutation.isPending}>
            {createMapsMutation.isPending
              ? t('requestForm.requesting')
              : t('requestForm.requestButton', { count: selectedProperties.length })}
          </button>
        </div>
      </form>
    </div>
  );
};
