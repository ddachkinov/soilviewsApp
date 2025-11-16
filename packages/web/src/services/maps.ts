import { api } from './api';

export interface Map {
  id: string;
  organizationId: string;
  fieldId: string;
  property: 'ph' | 'organic_matter' | 'nitrogen' | 'phosphorus' | 'potassium' | 'clay_percent' | 'sand_percent';
  cogUrl: string;
  tileUrl?: string;
  statistics: {
    min: number;
    max: number;
    mean: number;
    stdDev: number;
    percentiles?: {
      p10: number;
      p25: number;
      p50: number;
      p75: number;
      p90: number;
    };
  };
  modelMetadata: {
    encoder: string;
    decoder: string;
    version: string;
    r2Score?: number;
    rmse?: number;
  };
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  cropYear: number;
  generatedAt: string;
  processingTimeSeconds?: number;
}

export interface CreateMapDto {
  fieldId: string;
  property: string;
  cropYear: number;
  startDate?: string;
  endDate?: string;
  maxCloudCover?: number;
  resolutionMeters?: number;
}

/**
 * Maps API service.
 */
export const mapsApi = {
  /**
   * Get all maps with optional filters.
   */
  getAll: (params?: {
    fieldId?: string;
    property?: string;
    cropYear?: number;
    status?: string;
  }): Promise<{ maps: Map[]; total: number }> => {
    return api.get<{ maps: Map[]; total: number }>('/maps', params);
  },

  /**
   * Get a single map by ID.
   */
  getById: (id: string): Promise<Map> => {
    return api.get<Map>(`/maps/${id}`);
  },

  /**
   * Request soil property map generation.
   */
  create: (data: CreateMapDto): Promise<Map> => {
    return api.post<Map>('/maps', data);
  },

  /**
   * Delete a map.
   */
  delete: (id: string): Promise<void> => {
    return api.delete<void>(`/maps/${id}`);
  },

  /**
   * Get field statistics (all soil properties).
   */
  getFieldStatistics: (fieldId: string): Promise<Record<string, any>> => {
    return api.get<Record<string, any>>(`/maps/field/${fieldId}/statistics`);
  },
};
