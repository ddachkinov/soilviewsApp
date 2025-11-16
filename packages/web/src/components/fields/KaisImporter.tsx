import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fieldsApi } from '../../services/fields';

interface KaisImporterProps {
  onImportComplete?: () => void;
}

/**
 * KAIS cadastre shapefile importer component.
 * Allows bulk import of field boundaries from Bulgarian cadastre data.
 * Referenced in KAIS integration documentation.
 */
export const KaisImporter: React.FC<KaisImporterProps> = ({ onImportComplete }) => {
  const [shpFile, setShpFile] = useState<File | null>(null);
  const [dbfFile, setDbfFile] = useState<File | null>(null);
  const [shxFile, setShxFile] = useState<File | null>(null);
  const [prjFile, setPrjFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: () => {
      if (!shpFile || !dbfFile || !shxFile || !prjFile) {
        throw new Error('All shapefile components required (.shp, .dbf, .shx, .prj)');
      }

      return fieldsApi.importKais(shpFile, dbfFile, shxFile, prjFile, setProgress);
    },
    onSuccess: (data) => {
      alert(`Successfully imported ${data.count} fields from KAIS cadastre data`);
      queryClient.invalidateQueries({ queryKey: ['fields'] });
      resetForm();
      onImportComplete?.();
    },
    onError: (error: any) => {
      alert(`Import failed: ${error.message || 'Unknown error'}`);
    },
  });

  const resetForm = () => {
    setShpFile(null);
    setDbfFile(null);
    setShxFile(null);
    setPrjFile(null);
    setProgress(0);
  };

  const handleFileChange = (fileType: 'shp' | 'dbf' | 'shx' | 'prj') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== fileType) {
      alert(`Invalid file type. Expected .${fileType} file`);
      return;
    }

    switch (fileType) {
      case 'shp':
        setShpFile(file);
        break;
      case 'dbf':
        setDbfFile(file);
        break;
      case 'shx':
        setShxFile(file);
        break;
      case 'prj':
        setPrjFile(file);
        break;
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);

    files.forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();

      switch (ext) {
        case 'shp':
          setShpFile(file);
          break;
        case 'dbf':
          setDbfFile(file);
          break;
        case 'shx':
          setShxFile(file);
          break;
        case 'prj':
          setPrjFile(file);
          break;
      }
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const allFilesSelected = shpFile && dbfFile && shxFile && prjFile;

  return (
    <div className="kais-importer">
      <div className="importer-header">
        <h3>Import from KAIS Cadastre</h3>
        <p className="help-text">
          Download cadastre shapefiles from{' '}
          <a href="https://kais.cadastre.bg/en/OpenData" target="_blank" rel="noopener noreferrer">
            KAIS Open Data
          </a>{' '}
          and upload all 4 required files.
        </p>
      </div>

      <div className="drop-zone" onDrop={handleDrop} onDragOver={handleDragOver}>
        <p>Drag and drop shapefile components here, or click to browse</p>

        <div className="file-inputs">
          <div className="file-input-group">
            <label htmlFor="shp-file">
              <strong>Geometry (.shp)</strong>
              {shpFile && <span className="file-selected">✓ {shpFile.name}</span>}
            </label>
            <input id="shp-file" type="file" accept=".shp" onChange={handleFileChange('shp')} />
          </div>

          <div className="file-input-group">
            <label htmlFor="dbf-file">
              <strong>Attributes (.dbf)</strong>
              {dbfFile && <span className="file-selected">✓ {dbfFile.name}</span>}
            </label>
            <input id="dbf-file" type="file" accept=".dbf" onChange={handleFileChange('dbf')} />
          </div>

          <div className="file-input-group">
            <label htmlFor="shx-file">
              <strong>Index (.shx)</strong>
              {shxFile && <span className="file-selected">✓ {shxFile.name}</span>}
            </label>
            <input id="shx-file" type="file" accept=".shx" onChange={handleFileChange('shx')} />
          </div>

          <div className="file-input-group">
            <label htmlFor="prj-file">
              <strong>Projection (.prj)</strong>
              {prjFile && <span className="file-selected">✓ {prjFile.name}</span>}
            </label>
            <input id="prj-file" type="file" accept=".prj" onChange={handleFileChange('prj')} />
          </div>
        </div>

        {importMutation.isPending && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
            <span>{progress}%</span>
          </div>
        )}
      </div>

      <div className="importer-actions">
        <button onClick={resetForm} className="btn-secondary" disabled={importMutation.isPending}>
          Reset
        </button>
        <button
          onClick={() => importMutation.mutate()}
          className="btn-primary"
          disabled={!allFilesSelected || importMutation.isPending}
        >
          {importMutation.isPending ? 'Importing...' : 'Import Fields'}
        </button>
      </div>
    </div>
  );
};
