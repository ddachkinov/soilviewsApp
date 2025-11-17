import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('prescriptions');

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
      alert(t('requestForm.success'));
      queryClient.invalidateQueries({ queryKey: ['prescriptions', fieldId] });
      onRequestComplete?.();
    },
    onError: (error: any) => {
      alert(t('requestForm.error', { message: error.message || 'Unknown error' }));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Map crop type and strategy to translation keys
    const cropTypeMap: Record<string, string> = {
      wheat: 'winterWheat',
      sunflower: 'sunflower',
      maize: 'maize',
    };
    const strategyMap: Record<string, string> = {
      VARIABLE: 'variableRate',
      ZONE_BASED: 'zoneBased',
      UNIFORM: 'uniform',
    };

    const cropTypeLabel = t(`requestForm.cropTypes.${cropTypeMap[cropType]}`);
    const strategyLabel = t(`requestForm.strategies.${strategyMap[strategy]}`);

    if (window.confirm(t('requestForm.confirmMessage', { strategy: strategyLabel, cropType: cropTypeLabel }))) {
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
        <h3>{t('requestForm.title')}</h3>
        <p className="help-text">
          {t('requestForm.helpText')}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <label>
            <strong>{t('requestForm.cropType')}</strong>
          </label>
          <select value={cropType} onChange={(e) => handleCropChange(e.target.value as any)} required>
            <option value="wheat">{t('requestForm.cropTypes.winterWheat')}</option>
            <option value="sunflower">{t('requestForm.cropTypes.sunflower')}</option>
            <option value="maize">{t('requestForm.cropTypes.maize')}</option>
          </select>
        </div>

        <div className="form-section">
          <label>
            <strong>{t('requestForm.season')}</strong>
          </label>
          <input type="text" value={season} onChange={(e) => setSeason(e.target.value)} required />
          <p className="help-text">{t('requestForm.seasonPlaceholder')}</p>
        </div>

        <div className="form-section">
          <label>
            <strong>{t('requestForm.applicationStrategy')}</strong>
          </label>
          <select value={strategy} onChange={(e) => setStrategy(e.target.value as any)} required>
            <option value="VARIABLE">{t('requestForm.strategies.variableRate')}</option>
            <option value="ZONE_BASED">{t('requestForm.strategies.zoneBased')}</option>
            <option value="UNIFORM">{t('requestForm.strategies.uniform')}</option>
          </select>
        </div>

        <div className="form-section">
          <label>
            <strong>{t('requestForm.yieldGoal')}</strong>
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
            <strong>{t('requestForm.calculationMethod')}</strong>
          </label>
          <select value={method} onChange={(e) => setMethod(e.target.value as any)} required>
            <option value="nutrient_removal">{t('requestForm.calculationMethods.nutrientRemoval')}</option>
            <option value="sufficiency">{t('requestForm.calculationMethods.sufficiencyLevel')}</option>
            <option value="recommendation">{t('requestForm.calculationMethods.standardRecommendation')}</option>
          </select>
        </div>

        <div className="form-section">
          <h4>{t('requestForm.targetRates')}</h4>
          <p className="help-text">
            {t('requestForm.recommendedRates', {
              cropType: t(`requestForm.cropTypes.${cropType === 'wheat' ? 'winterWheat' : cropType}`)
            })}
          </p>

          <div className="rate-inputs">
            <div className="rate-input">
              <label>{t('requestForm.nitrogen')}</label>
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
              <label>{t('requestForm.phosphorus')}</label>
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
              <label>{t('requestForm.potassium')}</label>
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
            <h4>{t('requestForm.outputFiles.title')}</h4>
            <ul>
              <li>{t('requestForm.outputFiles.shapefile')}</li>
              <li>{t('requestForm.outputFiles.pdfReport')}</li>
              <li>{t('requestForm.outputFiles.isoxml')}</li>
            </ul>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={createPrescriptionMutation.isPending}>
            {createPrescriptionMutation.isPending ? t('requestForm.creating') : t('requestForm.createButton')}
          </button>
        </div>
      </form>
    </div>
  );
};
