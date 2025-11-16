import React, { useState } from 'react';
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
  const queryClient = useQueryClient();

  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [cropYear, setCropYear] = useState<number>(new Date().getFullYear());
  const [maxCloudCover, setMaxCloudCover] = useState<number>(20);

  const properties = [
    { value: 'ph', label: 'Soil pH', description: 'Acidity/alkalinity (4.0-9.0)' },
    { value: 'organic_matter', label: 'Organic Matter', description: 'Percentage (0-15%)' },
    { value: 'nitrogen', label: 'Nitrogen', description: 'Total N (mg/kg)' },
    { value: 'phosphorus', label: 'Phosphorus', description: 'Available P (mg/kg)' },
    { value: 'potassium', label: 'Potassium', description: 'Exchangeable K (mg/kg)' },
    { value: 'clay_percent', label: 'Clay Content', description: 'Percentage (0-100%)' },
    { value: 'sand_percent', label: 'Sand Content', description: 'Percentage (0-100%)' },
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
      alert(`Successfully requested ${data.length} soil property maps. Processing will begin shortly.`);
      queryClient.invalidateQueries({ queryKey: ['maps', fieldId] });
      setSelectedProperties([]);
      onRequestComplete?.();
    },
    onError: (error: any) => {
      alert(`Failed to request analysis: ${error.message || 'Unknown error'}`);
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
      alert('Please select at least one soil property to analyze');
      return;
    }

    if (window.confirm(`Request analysis for ${selectedProperties.length} soil properties?`)) {
      createMapsMutation.mutate();
    }
  };

  return (
    <div className="analysis-request-form">
      <div className="form-header">
        <h3>Request Soil Analysis</h3>
        <p className="help-text">
          Select soil properties to analyze. Analysis uses satellite imagery and AI to generate property maps.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <label>
            <strong>Crop Year</strong>
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
            <strong>Maximum Cloud Cover (%)</strong>
          </label>
          <input
            type="range"
            min="0"
            max="50"
            value={maxCloudCover}
            onChange={(e) => setMaxCloudCover(parseInt(e.target.value))}
          />
          <span>{maxCloudCover}%</span>
          <p className="help-text">Lower values provide clearer imagery but may reduce data availability</p>
        </div>

        <div className="form-section">
          <div className="section-header">
            <strong>Soil Properties to Analyze</strong>
            <div className="select-actions">
              <button type="button" onClick={handleSelectAll} className="btn-link">
                Select All
              </button>
              <button type="button" onClick={handleDeselectAll} className="btn-link">
                Deselect All
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
            <h4>Processing Information</h4>
            <ul>
              <li>Analysis typically takes 3-5 minutes per property</li>
              <li>You will receive email and in-app notifications when complete</li>
              <li>Maps are generated using Sentinel-2 satellite imagery and AI</li>
              <li>Resolution: 10 meters per pixel</li>
            </ul>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={createMapsMutation.isPending}>
            {createMapsMutation.isPending
              ? 'Requesting...'
              : `Request Analysis (${selectedProperties.length} properties)`}
          </button>
        </div>
      </form>
    </div>
  );
};
