import { api } from './api';

export interface Field {
  id: string;
  organizationId: string;
  name: string;
  geometry: any; // GeoJSON Polygon
  areaHectares: number;
  cropType?: string;
  lpisId?: string; // KAIS cadastre ID
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFieldDto {
  name: string;
  geometry: any;
  cropType?: string;
  lpisId?: string;
  notes?: string;
}

/**
 * Fields API service.
 */
export const fieldsApi = {
  /**
   * Get all fields for the authenticated user's organization.
   */
  getAll: (): Promise<Field[]> => {
    return api.get<Field[]>('/fields');
  },

  /**
   * Get a single field by ID.
   */
  getById: (id: string): Promise<Field> => {
    return api.get<Field>(`/fields/${id}`);
  },

  /**
   * Create a new field.
   */
  create: (data: CreateFieldDto): Promise<Field> => {
    return api.post<Field>('/fields', data);
  },

  /**
   * Update a field.
   */
  update: (id: string, data: Partial<CreateFieldDto>): Promise<Field> => {
    return api.put<Field>(`/fields/${id}`, data);
  },

  /**
   * Delete a field.
   */
  delete: (id: string): Promise<void> => {
    return api.delete<void>(`/fields/${id}`);
  },

  /**
   * Import fields from KAIS cadastre shapefile.
   */
  importKais: (
    shpFile: File,
    dbfFile: File,
    shxFile: File,
    prjFile: File,
    onProgress?: (progress: number) => void
  ): Promise<{ count: number; fields: Field[] }> => {
    const formData = new FormData();
    formData.append('shp', shpFile);
    formData.append('dbf', dbfFile);
    formData.append('shx', shxFile);
    formData.append('prj', prjFile);

    return api.post<{ count: number; fields: Field[] }>('/fields/import/kais', formData);
  },
};
