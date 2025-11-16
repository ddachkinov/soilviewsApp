import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { prescriptionsApi, CreatePrescriptionDto } from '../../services/prescriptions';

interface PrescriptionRequestFormProps {
  fieldId: string;
  onRequestComplete?: () => void;
}

/**
 * VRA prescription request form component.
 * Generates variable rate fertilizer application prescriptions.
 */
export const PrescriptionRequestForm: React.FC<PrescriptionRequestFormProps> = ({
  fieldId,
  onRequestComplete,
}) => {
  const queryClient = useQueryClient();

  const [cropType, setCropType] = useState<'wheat' | 'sunflower' | 'maize'>('wheat');
  const [season, setSeason] = useState<string>(`autumn-${new Date().getFullYear()}`);
  const [strategy, setStrategy] = useState<'VARIABLE' | 'UNIFORM' | 'ZONE_BASED'>('VARIABLE');
  const [targetN, setTargetN] = useState<number>(120);
  const [targetP, setTargetP] = useState<number>(60);
  const [targetK, setTargetK] = useState<number>(80);
  const [yieldGoal, setYieldGoal] = useState<number>(5.5);
  const [method, setMethod] = useState<'nutrient_removal' | 'sufficiency' | 'recommendation'>('nutrient_removal');

  const createPrescriptionMutation = useMutation({
    mutationFn: () => {
      const dto: CreatePrescriptionDto = {
        fieldId,
        cropType,
        season,
        strategy,
        targetRates: {
          n: targetN,
          p: targetP,
          k: targetK,
        },
        yieldGoal,
        method,
        efficiency: 0.7,
      };

      return prescriptionsApi.create(dto);
    },
    onSuccess: () => {
      alert('VRA prescription requested successfully. Processing will begin shortly.');
      queryClient.invalidateQueries({ queryKey: ['prescriptions', fieldId] });
      onRequestComplete?.();
    },
    onError: (error: any) => {
      alert(`Failed to create prescription: ${error.message || 'Unknown error'}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (window.confirm(`Create ${strategy} prescription for ${cropType}?`)) {
      createPrescriptionMutation.mutate();
    }
  };

  const cropRecommendations = {
    wheat: { n: 120, p: 60, k: 80, yield: 5.5 },
    sunflower: { n: 100, p: 80, k: 180, yield: 3.0 },
    maize: { n: 150, p: 70, k: 100, yield: 8.0 },
  };

  const handleCropChange = (crop: 'wheat' | 'sunflower' | 'maize') => {
    setCropType(crop);
    const rec = cropRecommendations[crop];
    setTargetN(rec.n);
    setTargetP(rec.p);
    setTargetK(rec.k);
    setYieldGoal(rec.yield);
  };

  return (
    <div className="prescription-request-form">
      <div className="form-header">
        <h3>Create VRA Prescription</h3>
        <p className="help-text">
          Generate variable rate fertilizer application maps for precision agriculture equipment.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <label>
            <strong>Crop Type</strong>
          </label>
          <select value={cropType} onChange={(e) => handleCropChange(e.target.value as any)} required>
            <option value="wheat">Winter Wheat</option>
            <option value="sunflower">Sunflower</option>
            <option value="maize">Maize</option>
          </select>
        </div>

        <div className="form-section">
          <label>
            <strong>Season</strong>
          </label>
          <input type="text" value={season} onChange={(e) => setSeason(e.target.value)} required />
          <p className="help-text">e.g., autumn-2024, spring-2025</p>
        </div>

        <div className="form-section">
          <label>
            <strong>Application Strategy</strong>
          </label>
          <select value={strategy} onChange={(e) => setStrategy(e.target.value as any)} required>
            <option value="VARIABLE">Variable Rate (pixel-level)</option>
            <option value="ZONE_BASED">Zone-Based (3-5 management zones)</option>
            <option value="UNIFORM">Uniform (single rate)</option>
          </select>
        </div>

        <div className="form-section">
          <label>
            <strong>Yield Goal (t/ha)</strong>
          </label>
          <input
            type="number"
            min="0"
            max="15"
            step="0.1"
            value={yieldGoal}
            onChange={(e) => setYieldGoal(parseFloat(e.target.value))}
            required
          />
        </div>

        <div className="form-section">
          <label>
            <strong>Calculation Method</strong>
          </label>
          <select value={method} onChange={(e) => setMethod(e.target.value as any)} required>
            <option value="nutrient_removal">Nutrient Removal (based on yield goal)</option>
            <option value="sufficiency">Sufficiency Level</option>
            <option value="recommendation">Standard Recommendation</option>
          </select>
        </div>

        <div className="form-section">
          <h4>Target Application Rates (kg/ha)</h4>
          <p className="help-text">Recommended rates for {cropType} (you can adjust)</p>

          <div className="rate-inputs">
            <div className="rate-input">
              <label>Nitrogen (N)</label>
              <input
                type="number"
                min="0"
                max="300"
                value={targetN}
                onChange={(e) => setTargetN(parseInt(e.target.value))}
                required
              />
            </div>

            <div className="rate-input">
              <label>Phosphorus (P₂O₅)</label>
              <input
                type="number"
                min="0"
                max="200"
                value={targetP}
                onChange={(e) => setTargetP(parseInt(e.target.value))}
                required
              />
            </div>

            <div className="rate-input">
              <label>Potassium (K₂O)</label>
              <input
                type="number"
                min="0"
                max="300"
                value={targetK}
                onChange={(e) => setTargetK(parseInt(e.target.value))}
                required
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="info-box">
            <h4>Output Files</h4>
            <ul>
              <li>Shapefile compatible with John Deere, Case IH, CLAAS equipment</li>
              <li>PDF report with application summary</li>
              <li>ISO 11783 XML format for ISOBUS controllers</li>
            </ul>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={createPrescriptionMutation.isPending}>
            {createPrescriptionMutation.isPending ? 'Creating...' : 'Create Prescription'}
          </button>
        </div>
      </form>
    </div>
  );
};
