import { api } from './api';

export interface Prescription {
  id: string;
  organizationId: string;
  fieldId: string;
  cropType: 'wheat' | 'sunflower' | 'maize';
  season: string;
  strategy: 'VARIABLE' | 'UNIFORM' | 'ZONE_BASED';
  targetRates: {
    n: number;
    p: number;
    k: number;
  };
  shapefileUrl: string;
  reportUrl?: string;
  statistics: {
    totalN: number;
    totalP: number;
    totalK: number;
    averageRate: number;
    zoneCount?: number;
    minRate?: number;
    maxRate?: number;
  };
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  generatedAt: string;
}

export interface CreatePrescriptionDto {
  fieldId: string;
  cropType: 'wheat' | 'sunflower' | 'maize';
  season: string;
  strategy?: 'VARIABLE' | 'UNIFORM' | 'ZONE_BASED';
  targetRates: {
    n: number;
    p: number;
    k: number;
  };
  yieldGoal?: number;
  method?: 'nutrient_removal' | 'sufficiency' | 'recommendation';
  efficiency?: number;
}

/**
 * Prescriptions API service.
 */
export const prescriptionsApi = {
  /**
   * Get all prescriptions.
   */
  getAll: (fieldId?: string): Promise<Prescription[]> => {
    return api.get<Prescription[]>('/prescriptions', { fieldId });
  },

  /**
   * Get a single prescription by ID.
   */
  getById: (id: string): Promise<Prescription> => {
    return api.get<Prescription>(`/prescriptions/${id}`);
  },

  /**
   * Create a VRA prescription.
   */
  create: (data: CreatePrescriptionDto): Promise<Prescription> => {
    return api.post<Prescription>('/prescriptions', data);
  },

  /**
   * Delete a prescription.
   */
  delete: (id: string): Promise<void> => {
    return api.delete<void>(`/prescriptions/${id}`);
  },

  /**
   * Get shapefile download URL.
   */
  getDownloadUrl: (id: string): Promise<{ url: string }> => {
    return api.get<{ url: string }>(`/prescriptions/${id}/download`);
  },
};
