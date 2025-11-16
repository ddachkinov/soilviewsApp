import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import * as turf from '@turf/turf';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

interface FieldDrawerProps {
  onFieldDrawn: (field: { geometry: any; areaHectares: number }) => void;
  onCancel?: () => void;
}

/**
 * Field drawing component using MapLibre GL Draw.
 * Allows users to manually draw field boundaries on the map.
 * Referenced in UI/UX workflow documentation.
 */
export const FieldDrawer: React.FC<FieldDrawerProps> = ({ onFieldDrawn, onCancel }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [areaHa, setAreaHa] = useState<number | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map centered on Bulgaria
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      center: [25.4858, 42.7339], // Bulgaria center
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

    // Validate minimum area
    if (area < 0.1) {
      alert('Field must be at least 0.1 hectares (1000 m²)');
      if (draw.current) {
        draw.current.delete(feature.id);
      }
      setAreaHa(null);
      return;
    }

    // Validate within Bulgaria bounds
    const bbox = turf.bbox(polygon);
    const [minLon, minLat, maxLon, maxLat] = bbox;

    const BULGARIA_BBOX = {
      minLat: 41.23,
      maxLat: 44.22,
      minLon: 22.36,
      maxLon: 28.61,
    };

    if (
      minLat < BULGARIA_BBOX.minLat ||
      maxLat > BULGARIA_BBOX.maxLat ||
      minLon < BULGARIA_BBOX.minLon ||
      maxLon > BULGARIA_BBOX.maxLon
    ) {
      alert('Field must be within Bulgaria');
      if (draw.current) {
        draw.current.delete(feature.id);
      }
      setAreaHa(null);
      return;
    }
  };

  const handleConfirm = () => {
    if (!draw.current) return;

    const data = draw.current.getAll();
    if (data.features.length === 0) {
      alert('Please draw a field boundary first');
      return;
    }

    const feature = data.features[0];
    onFieldDrawn({
      geometry: feature.geometry,
      areaHectares: areaHa || 0,
    });
  };

  return (
    <div className="field-drawer">
      <div className="drawer-header">
        <h3>Draw Field Boundary</h3>
        <div className="instructions">
          <p>1. Click on the map to start drawing</p>
          <p>2. Click to add each corner point</p>
          <p>3. Double-click to finish the polygon</p>
          <p>4. Use the trash icon to delete and start over</p>
        </div>
        {areaHa !== null && (
          <div className="area-display">
            <strong>Area:</strong> {areaHa.toFixed(2)} hectares
          </div>
        )}
      </div>

      <div ref={mapContainer} className="map-container" style={{ width: '100%', height: '500px' }} />

      <div className="drawer-actions">
        <button onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button onClick={handleConfirm} className="btn-primary" disabled={areaHa === null}>
          Confirm Field
        </button>
      </div>
    </div>
  );
};
