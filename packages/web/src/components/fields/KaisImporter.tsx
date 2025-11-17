import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['cadastre', 'common']);
  const [shpFile, setShpFile] = useState<File | null>(null);
  const [dbfFile, setDbfFile] = useState<File | null>(null);
  const [shxFile, setShxFile] = useState<File | null>(null);
  const [prjFile, setPrjFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: () => {
      if (!shpFile || !dbfFile || !shxFile || !prjFile) {
        throw new Error(t('import.errors.allRequired'));
      }

      return fieldsApi.importKais(shpFile, dbfFile, shxFile, prjFile, setProgress);
    },
    onSuccess: (data) => {
      alert(t('import.success', { count: data.count }));
      queryClient.invalidateQueries({ queryKey: ['fields'] });
      resetForm();
      onImportComplete?.();
    },
    onError: (error: any) => {
      alert(t('import.errors.importFailed', { message: error.message || 'Unknown error' }));
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
      alert(t('import.errors.invalidFileType', { type: fileType }));
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
        <h3>{t('import.title')}</h3>
        <p className="help-text">
          {t('import.helpText')}{' '}
          <a href="https://kais.cadastre.bg/en/OpenData" target="_blank" rel="noopener noreferrer">
            {t('import.kaisLink')}
          </a>.
        </p>
      </div>

      <div className="drop-zone" onDrop={handleDrop} onDragOver={handleDragOver}>
        <p>{t('import.dropZone')}</p>

        <div className="file-inputs">
          <div className="file-input-group">
            <label htmlFor="shp-file">
              <strong>{t('import.fileTypes.shp')}</strong>
              {shpFile && <span className="file-selected">{t('import.fileSelected', { filename: shpFile.name })}</span>}
            </label>
            <input id="shp-file" type="file" accept=".shp" onChange={handleFileChange('shp')} />
          </div>

          <div className="file-input-group">
            <label htmlFor="dbf-file">
              <strong>{t('import.fileTypes.dbf')}</strong>
              {dbfFile && <span className="file-selected">{t('import.fileSelected', { filename: dbfFile.name })}</span>}
            </label>
            <input id="dbf-file" type="file" accept=".dbf" onChange={handleFileChange('dbf')} />
          </div>

          <div className="file-input-group">
            <label htmlFor="shx-file">
              <strong>{t('import.fileTypes.shx')}</strong>
              {shxFile && <span className="file-selected">{t('import.fileSelected', { filename: shxFile.name })}</span>}
            </label>
            <input id="shx-file" type="file" accept=".shx" onChange={handleFileChange('shx')} />
          </div>

          <div className="file-input-group">
            <label htmlFor="prj-file">
              <strong>{t('import.fileTypes.prj')}</strong>
              {prjFile && <span className="file-selected">{t('import.fileSelected', { filename: prjFile.name })}</span>}
            </label>
            <input id="prj-file" type="file" accept=".prj" onChange={handleFileChange('prj')} />
          </div>
        </div>

        {importMutation.isPending && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
            <span>{t('import.progress', { progress })}</span>
          </div>
        )}
      </div>

      <div className="importer-actions">
        <button onClick={resetForm} className="btn-secondary" disabled={importMutation.isPending}>
          {t('buttons.reset', { ns: 'common' })}
        </button>
        <button
          onClick={() => importMutation.mutate()}
          className="btn-primary"
          disabled={!allFilesSelected || importMutation.isPending}
        >
          {importMutation.isPending ? t('import.importing') : t('import.importButton')}
        </button>
      </div>
    </div>
  );
};
