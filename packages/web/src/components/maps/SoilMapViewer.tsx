import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import maplibregl from 'maplibre-gl';
import { Map } from '../../services/maps';
import 'maplibre-gl/dist/maplibre-gl.css';

interface SoilMapViewerProps {
  map: Map;
  fieldGeometry?: any;
}

/**
 * Soil property map visualization component.
 * Displays TiTiler-served soil property maps with interactive legend.
 * Referenced in ADR-007 (TiTiler integration).
 */
export const SoilMapViewer: React.FC<SoilMapViewerProps> = ({ map, fieldGeometry }) => {
  const { t } = useTranslation('soilMaps');
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [opacity, setOpacity] = useState<number>(0.7);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize MapLibre map
    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      center: [25.4858, 42.7339],
      zoom: 12,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
          },
        ],
      },
    });

    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    mapRef.current.on('load', () => {
      // Add field boundary if provided
      if (fieldGeometry && mapRef.current) {
        mapRef.current.addSource('field', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: fieldGeometry,
          },
        });

        mapRef.current.addLayer({
          id: 'field-outline',
          type: 'line',
          source: 'field',
          paint: {
            'line-color': '#000000',
            'line-width': 2,
          },
        });

        // Fit map to field bounds
        const bounds = new maplibregl.LngLatBounds();
        fieldGeometry.coordinates[0].forEach((coord: number[]) => {
          bounds.extend(coord as [number, number]);
        });
        mapRef.current.fitBounds(bounds, { padding: 50 });
      }

      // Add soil property tile layer
      if (map.tileUrl && mapRef.current) {
        mapRef.current.addSource('soil-tiles', {
          type: 'raster',
          tiles: [map.tileUrl],
          tileSize: 256,
        });

        mapRef.current.addLayer({
          id: 'soil-layer',
          type: 'raster',
          source: 'soil-tiles',
          paint: {
            'raster-opacity': opacity,
          },
        });
      }
    });

    return () => {
      mapRef.current?.remove();
    };
  }, [map, fieldGeometry]);

  // Update opacity when slider changes
  useEffect(() => {
    if (mapRef.current && mapRef.current.getLayer('soil-layer')) {
      mapRef.current.setPaintProperty('soil-layer', 'raster-opacity', opacity);
    }
  }, [opacity]);

  const getPropertyLabel = (property: string): string => {
    const propertyMap: Record<string, string> = {
      ph: 'ph',
      organic_matter: 'organicMatter',
      nitrogen: 'nitrogen',
      phosphorus: 'phosphorus',
      potassium: 'potassium',
      clay_percent: 'clay',
      sand_percent: 'sand',
    };
    const translationKey = propertyMap[property] || property;
    return t(`viewer.properties.${translationKey}`, { defaultValue: property });
  };

  return (
    <div className="soil-map-viewer">
      <div className="map-header">
        <h3>{getPropertyLabel(map.property)}</h3>
        <div className="map-info">
          <span>{t('viewer.year')} {map.cropYear}</span>
          <span>{t('viewer.resolution')} {map.statistics.mean.toFixed(2)}</span>
          <span>{t('viewer.status')} {map.status}</span>
        </div>
      </div>

      <div ref={mapContainer} style={{ width: '100%', height: '600px' }} />

      <div className="map-controls">
        <div className="opacity-control">
          <label>{t('viewer.opacity')}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
          />
          <span>{(opacity * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="map-legend">
        <h4>{t('viewer.legend.title')}</h4>
        <div className="stats-grid">
          <div className="stat">
            <strong>{t('viewer.legend.min')}</strong> {map.statistics.min.toFixed(2)}
          </div>
          <div className="stat">
            <strong>{t('viewer.legend.max')}</strong> {map.statistics.max.toFixed(2)}
          </div>
          <div className="stat">
            <strong>{t('viewer.legend.mean')}</strong> {map.statistics.mean.toFixed(2)}
          </div>
          <div className="stat">
            <strong>{t('viewer.legend.stdDev')}</strong> {map.statistics.stdDev.toFixed(2)}
          </div>
        </div>

        {map.statistics.percentiles && (
          <div className="percentiles">
            <h5>Percentiles</h5>
            <div className="percentile-bar">
              <span>{t('viewer.legend.p10')} {map.statistics.percentiles.p10.toFixed(2)}</span>
              <span>{t('viewer.legend.p25')} {map.statistics.percentiles.p25.toFixed(2)}</span>
              <span>{t('viewer.legend.p50')} {map.statistics.percentiles.p50.toFixed(2)}</span>
              <span>{t('viewer.legend.p75')} {map.statistics.percentiles.p75.toFixed(2)}</span>
              <span>{t('viewer.legend.p90')} {map.statistics.percentiles.p90.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="model-info">
          <h5>{t('viewer.modelInfo.title')}</h5>
          <p>
            <strong>{t('viewer.modelInfo.encoder')}</strong> {map.modelMetadata.encoder}
          </p>
          <p>
            <strong>{t('viewer.modelInfo.decoder')}</strong> {map.modelMetadata.decoder}
          </p>
          <p>
            <strong>{t('viewer.modelInfo.version')}</strong> {map.modelMetadata.version}
          </p>
          {map.modelMetadata.r2Score && (
            <p>
              <strong>{t('viewer.modelInfo.r2Score')}</strong> {map.modelMetadata.r2Score.toFixed(3)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
