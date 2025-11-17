import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { fieldsApi, Field } from '../services/fields';
import { mapsApi } from '../services/maps';
import { prescriptionsApi } from '../services/prescriptions';
import { FieldDrawer } from '../components/fields/FieldDrawer';
import { KaisImporter } from '../components/fields/KaisImporter';
import { CadastreSearch } from '../components/cadastre/CadastreSearch';
import { QuickAnalysisArea } from '../components/analysis/QuickAnalysisArea';
import { AnalysisRequestForm } from '../components/analysis/AnalysisRequestForm';
import { SoilMapViewer } from '../components/maps/SoilMapViewer';
import { PrescriptionRequestForm } from '../components/prescriptions/PrescriptionRequestForm';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

/**
 * Main dashboard component for SoilViews platform.
 * Integrates all workflows: field management, analysis, visualization, prescriptions.
 */
export function Dashboard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'fields' | 'analysis' | 'maps' | 'prescriptions'>('fields');
  const [showFieldDrawer, setShowFieldDrawer] = useState(false);
  const [showKaisImporter, setShowKaisImporter] = useState(false);
  const [showCadastreSearch, setShowCadastreSearch] = useState(false);
  const [showQuickAnalysis, setShowQuickAnalysis] = useState(false);

  // Fetch fields
  const { data: fields = [], refetch: refetchFields } = useQuery({
    queryKey: ['fields'],
    queryFn: fieldsApi.getAll,
  });

  // Fetch maps for selected field
  const { data: mapsData } = useQuery({
    queryKey: ['maps', selectedFieldId],
    queryFn: () => (selectedFieldId ? mapsApi.getAll({ fieldId: selectedFieldId }) : Promise.resolve({ maps: [], total: 0 })),
    enabled: !!selectedFieldId,
  });

  // Fetch prescriptions for selected field
  const { data: prescriptions = [] } = useQuery({
    queryKey: ['prescriptions', selectedFieldId],
    queryFn: () => (selectedFieldId ? prescriptionsApi.getAll(selectedFieldId) : Promise.resolve([])),
    enabled: !!selectedFieldId,
  });

  const selectedField = fields.find((f) => f.id === selectedFieldId);
  const maps = mapsData?.maps || [];

  const handleFieldCreated = async (data: { geometry: any; areaHectares: number }) => {
    try {
      await fieldsApi.create({
        name: `Field ${fields.length + 1}`,
        geometry: data.geometry,
      });
      refetchFields();
      setShowFieldDrawer(false);
    } catch (error: any) {
      alert(t('alerts.fieldCreationError', { message: error.message }));
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
        <LanguageSwitcher />
      </header>

      <div className="dashboard-layout">
        {/* Sidebar - Field List */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>{t('sidebar.myFields')}</h2>
            <div className="field-actions">
              <button onClick={() => setShowQuickAnalysis(true)} className="btn-icon" title={t('tooltips.quickAnalysis')}>
                ⚡
              </button>
              <button onClick={() => setShowFieldDrawer(true)} className="btn-icon" title={t('tooltips.drawField')}>
                ✏️
              </button>
              <button onClick={() => setShowCadastreSearch(true)} className="btn-icon" title={t('tooltips.searchKais')}>
                🔍
              </button>
              <button onClick={() => setShowKaisImporter(true)} className="btn-icon" title={t('tooltips.importKais')}>
                📥
              </button>
            </div>
          </div>

          <ul className="field-list">
            {fields.map((field) => (
              <li
                key={field.id}
                className={selectedFieldId === field.id ? 'active' : ''}
                onClick={() => setSelectedFieldId(field.id)}
              >
                <strong>{field.name}</strong>
                <span>{field.areaHectares.toFixed(2)} {t('units.ha', { ns: 'common' })}</span>
                {field.temporary && <span className="temp-badge" title={t('fieldInfo.temporary')}>⚡</span>}
                {field.cropType && <span className="crop-badge">{field.cropType}</span>}
              </li>
            ))}
          </ul>

          {fields.length === 0 && (
            <div className="empty-state">
              <p>{t('sidebar.noFields')}</p>
              <button onClick={() => setShowQuickAnalysis(true)} className="btn-primary">
                ⚡ {t('sidebar.quickAnalysis')}
              </button>
              <button onClick={() => setShowFieldDrawer(true)} className="btn-secondary">
                {t('sidebar.addField')}
              </button>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {!selectedFieldId && (
            <div className="welcome-screen">
              <h2>{t('welcome.title')}</h2>
              <p>{t('welcome.message')}</p>
              <div className="help-section">
                <h3>{t('welcome.helpTitle')}</h3>
                <ul>
                  <li>{t('welcome.tips.quickAnalysis')}</li>
                  <li>{t('welcome.tips.kaisImport')}</li>
                  <li>{t('welcome.tips.drawField')}</li>
                  <li>{t('welcome.tips.soilAnalysis')}</li>
                </ul>
              </div>
            </div>
          )}

          {selectedFieldId && (
            <>
              <div className="field-header">
                <h2>{selectedField?.name}</h2>
                <div className="tabs">
                  <button
                    className={activeTab === 'fields' ? 'active' : ''}
                    onClick={() => setActiveTab('fields')}
                  >
                    {t('tabs.fieldInfo')}
                  </button>
                  <button
                    className={activeTab === 'analysis' ? 'active' : ''}
                    onClick={() => setActiveTab('analysis')}
                  >
                    {t('tabs.requestAnalysis')}
                  </button>
                  <button className={activeTab === 'maps' ? 'active' : ''} onClick={() => setActiveTab('maps')}>
                    {t('tabs.soilMaps')} ({maps.length})
                  </button>
                  <button
                    className={activeTab === 'prescriptions' ? 'active' : ''}
                    onClick={() => setActiveTab('prescriptions')}
                  >
                    {t('tabs.prescriptions')} ({prescriptions.length})
                  </button>
                </div>
              </div>

              <div className="tab-content">
                {activeTab === 'fields' && selectedField && (
                  <div className="field-info">
                    {selectedField.temporary && (
                      <div className="warning-banner">
                        <strong>{t('temporaryBanner.title')}</strong>
                        <p>
                          {t('temporaryBanner.message')}
                          {selectedField.expiresAt && (
                            <> {t('common.createdAt', { ns: 'common' })}: {new Date(selectedField.expiresAt).toLocaleDateString()}</>
                          )}
                        </p>
                        <button
                          onClick={async () => {
                            const name = prompt('Enter a name for this field:', selectedField.name);
                            if (name) {
                              await fieldsApi.convertToPermanent(selectedField.id, { name });
                              refetchFields();
                              alert('Field saved permanently!');
                            }
                          }}
                          className="btn-primary"
                        >
                          {t('temporaryBanner.saveButton')}
                        </button>
                      </div>
                    )}

                    <h3>{t('tabs.fieldInfo')}</h3>
                    <dl>
                      <dt>{t('fieldInfo.area')}</dt>
                      <dd>{selectedField.areaHectares.toFixed(2)} {t('units.hectares', { ns: 'common' })}</dd>

                      <dt>{t('fieldInfo.cropType')}</dt>
                      <dd>{selectedField.cropType || t('common.notSpecified', { ns: 'common' })}</dd>

                      {selectedField.lpisId && (
                        <>
                          <dt>{t('fieldInfo.kaisCadastreId')}</dt>
                          <dd>{selectedField.lpisId}</dd>
                        </>
                      )}

                      <dt>{t('fieldInfo.status')}</dt>
                      <dd>{selectedField.temporary ? t('fieldInfo.temporary') : t('fieldInfo.permanent')}</dd>

                      <dt>{t('fieldInfo.created')}</dt>
                      <dd>{new Date(selectedField.createdAt).toLocaleDateString()}</dd>
                    </dl>
                  </div>
                )}

                {activeTab === 'analysis' && <AnalysisRequestForm fieldId={selectedFieldId} />}

                {activeTab === 'maps' && (
                  <div className="maps-view">
                    {maps.length === 0 && (
                      <div className="empty-state">
                        <p>{t('soilMaps.noMaps')}</p>
                        <button onClick={() => setActiveTab('analysis')} className="btn-primary">
                          {t('soilMaps.requestButton')}
                        </button>
                      </div>
                    )}

                    <div className="maps-grid">
                      {maps.map((map) => (
                        <div key={map.id} className="map-card">
                          <SoilMapViewer map={map} fieldGeometry={selectedField?.geometry} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'prescriptions' && (
                  <div className="prescriptions-view">
                    <PrescriptionRequestForm fieldId={selectedFieldId} />

                    {prescriptions.length > 0 && (
                      <div className="prescriptions-list">
                        <h3>{t('prescriptions.title')}</h3>
                        <ul>
                          {prescriptions.map((rx) => (
                            <li key={rx.id} className="prescription-item">
                              <strong>
                                {rx.cropType} - {rx.season}
                              </strong>
                              <span>{t('prescriptions.status')} {rx.status}</span>
                              {rx.status === 'COMPLETED' && (
                                <button
                                  onClick={async () => {
                                    const { url } = await prescriptionsApi.getDownloadUrl(rx.id);
                                    window.open(url, '_blank');
                                  }}
                                  className="btn-link"
                                >
                                  {t('prescriptions.downloadButton')}
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      {showFieldDrawer && (
        <div className="modal">
          <div className="modal-content">
            <FieldDrawer onFieldDrawn={handleFieldCreated} onCancel={() => setShowFieldDrawer(false)} />
          </div>
        </div>
      )}

      {showKaisImporter && (
        <div className="modal">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setShowKaisImporter(false)}>
              ×
            </button>
            <KaisImporter
              onImportComplete={() => {
                setShowKaisImporter(false);
                refetchFields();
              }}
            />
          </div>
        </div>
      )}

      {showCadastreSearch && (
        <div className="modal">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setShowCadastreSearch(false)}>
              ×
            </button>
            <CadastreSearch
              onFieldFound={(field: Field) => {
                setSelectedFieldId(field.id);
                setShowCadastreSearch(false);
              }}
            />
          </div>
        </div>
      )}

      {showQuickAnalysis && (
        <div className="modal">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setShowQuickAnalysis(false)}>
              ×
            </button>
            <QuickAnalysisArea
              onAnalysisStarted={(field: Field) => {
                setSelectedFieldId(field.id);
                setShowQuickAnalysis(false);
                setActiveTab('maps');
                refetchFields();
                alert(t('alerts.quickAnalysisStarted'));
              }}
              onCancel={() => setShowQuickAnalysis(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
