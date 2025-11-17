import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import maplibregl from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from '@turf/turf';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fieldsApi, Field } from '../../services/fields';
import { mapsApi, CreateMapDto } from '../../services/maps';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

interface QuickAnalysisAreaProps {
  onAnalysisStarted?: (field: Field) => void;
  onCancel?: () => void;
}

/**
 * Quick analysis area selector component.
 * Allows users to draw an area and immediately request soil analysis
 * without creating a permanent field.
 */
export const QuickAnalysisArea: React.FC<QuickAnalysisAreaProps> = ({
  onAnalysisStarted,
  onCancel,
}) => {
  const { t } = useTranslation(['analysis', 'common']);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [areaHa, setAreaHa] = useState<number | null>(null);
  const [drawnGeometry, setDrawnGeometry] = useState<any>(null);
  const [selectedProperties, setSelectedProperties] = useState<string[]>(['ph', 'organic_matter', 'nitrogen']);
  const [cropYear] = useState<number>(new Date().getFullYear());

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map centered on Bulgaria
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      center: [25.4858, 42.7339],
      zoom: 7,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
    });

    // Initialize drawing tools
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: 'draw_polygon',
    });

    map.current.addControl(draw.current, 'top-left');
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Handle polygon creation
    map.current.on('draw.create', handleDrawCreate);
    map.current.on('draw.update', handleDrawCreate);

    return () => {
      map.current?.remove();
    };
  }, []);

  const handleDrawCreate = (e: any) => {
    const feature = e.features[0];
    const polygon = turf.polygon(feature.geometry.coordinates);
    const area = turf.area(polygon) / 10000; // Convert m² to hectares

    setAreaHa(area);
    setDrawnGeometry(feature.geometry);

    // Validate minimum area
    if (area < 0.1) {
      alert(t('quickAnalysis.errorMinArea'));
      if (draw.current) {
        draw.current.delete(feature.id);
      }
      setAreaHa(null);
      setDrawnGeometry(null);
      return;
    }
  };

  const createTemporaryFieldMutation = useMutation({
    mutationFn: async () => {
      if (!drawnGeometry) {
        throw new Error(t('quickAnalysis.errorNoArea'));
      }

      // Create temporary field
      const field = await fieldsApi.createTemporary(drawnGeometry);

      // Request soil analysis for selected properties
      const promises = selectedProperties.map((property) => {
        const dto: CreateMapDto = {
          fieldId: field.id,
          property,
          cropYear,
          maxCloudCover: 20,
        };
        return mapsApi.create(dto);
      });

      await Promise.all(promises);

      return field;
    },
    onSuccess: (field) => {
      queryClient.invalidateQueries({ queryKey: ['fields'] });
      onAnalysisStarted?.(field);
    },
    onError: (error: any) => {
      alert(t('quickAnalysis.errorRequest', { message: error.message || 'Unknown error' }));
    },
  });

  const properties = [
    { value: 'ph', label: t('soilProperties.ph.name') },
    { value: 'organic_matter', label: t('soilProperties.organicMatter.name') },
    { value: 'nitrogen', label: t('soilProperties.nitrogen.name') },
    { value: 'phosphorus', label: t('soilProperties.phosphorus.name') },
    { value: 'potassium', label: t('soilProperties.potassium.name') },
    { value: 'clay_percent', label: t('soilProperties.clay.name') },
    { value: 'sand_percent', label: t('soilProperties.sand.name') },
  ];

  const handlePropertyToggle = (property: string) => {
    setSelectedProperties((prev) =>
      prev.includes(property) ? prev.filter((p) => p !== property) : [...prev, property]
    );
  };

  return (
    <div className="quick-analysis-area">
      <div className="analysis-header">
        <h3>{t('quickAnalysis.title')}</h3>
        <p className="help-text">{t('quickAnalysis.helpText')}</p>
      </div>

      <div ref={mapContainer} className="map-container" style={{ width: '100%', height: '400px' }} />

      {areaHa !== null && (
        <div className="area-info">
          <strong>{t('quickAnalysis.areaDrawn')}</strong> {areaHa.toFixed(2)} {t('common:units.hectares', { ns: 'common' })}
          <p className="help-text">{t('quickAnalysis.selectProperties')}</p>
        </div>
      )}

      <div className="property-selection">
        {properties.map((property) => (
          <label key={property.value} className="property-checkbox">
            <input
              type="checkbox"
              checked={selectedProperties.includes(property.value)}
              onChange={() => handlePropertyToggle(property.value)}
            />
            {property.label}
          </label>
        ))}
      </div>

      <div className="info-box">
        <h4>{t('quickAnalysis.whatHappens')}</h4>
        <ul>
          <li>{t('quickAnalysis.steps.tempField')}</li>
          <li>{t('quickAnalysis.steps.analysisStarts')}</li>
          <li>{t('quickAnalysis.steps.notifications')}</li>
          <li>{t('quickAnalysis.steps.saveOption')}</li>
        </ul>
      </div>

      <div className="analysis-actions">
        <button onClick={onCancel} className="btn-secondary" disabled={createTemporaryFieldMutation.isPending}>
          {t('common:buttons.cancel', { ns: 'common' })}
        </button>
        <button
          onClick={() => createTemporaryFieldMutation.mutate()}
          className="btn-primary"
          disabled={!drawnGeometry || selectedProperties.length === 0 || createTemporaryFieldMutation.isPending}
        >
          {createTemporaryFieldMutation.isPending
            ? t('quickAnalysis.analyzing')
            : t('quickAnalysis.analyzeButton', { count: selectedProperties.length })}
        </button>
      </div>
    </div>
  );
};
