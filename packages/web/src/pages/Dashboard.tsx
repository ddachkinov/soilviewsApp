import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fieldsApi, Field } from '../services/fields';
import { mapsApi } from '../services/maps';
import { prescriptionsApi } from '../services/prescriptions';
import { FieldDrawer } from '../components/fields/FieldDrawer';
import { KaisImporter } from '../components/fields/KaisImporter';
import { CadastreSearch } from '../components/cadastre/CadastreSearch';
import { AnalysisRequestForm } from '../components/analysis/AnalysisRequestForm';
import { SoilMapViewer } from '../components/maps/SoilMapViewer';
import { PrescriptionRequestForm } from '../components/prescriptions/PrescriptionRequestForm';

/**
 * Main dashboard component for SoilViews platform.
 * Integrates all workflows: field management, analysis, visualization, prescriptions.
 */
export function Dashboard() {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'fields' | 'analysis' | 'maps' | 'prescriptions'>('fields');
  const [showFieldDrawer, setShowFieldDrawer] = useState(false);
  const [showKaisImporter, setShowKaisImporter] = useState(false);
  const [showCadastreSearch, setShowCadastreSearch] = useState(false);

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
      alert(`Failed to create field: ${error.message}`);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>SoilViews Dashboard</h1>
        <p>Agricultural Intelligence Platform for Bulgarian Farmers</p>
      </header>

      <div className="dashboard-layout">
        {/* Sidebar - Field List */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>My Fields</h2>
            <div className="field-actions">
              <button onClick={() => setShowFieldDrawer(true)} className="btn-icon" title="Draw field">
                ✏️
              </button>
              <button onClick={() => setShowCadastreSearch(true)} className="btn-icon" title="Search KAIS">
                🔍
              </button>
              <button onClick={() => setShowKaisImporter(true)} className="btn-icon" title="Import from KAIS">
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
                <span>{field.areaHectares.toFixed(2)} ha</span>
                {field.cropType && <span className="crop-badge">{field.cropType}</span>}
              </li>
            ))}
          </ul>

          {fields.length === 0 && (
            <div className="empty-state">
              <p>No fields yet</p>
              <button onClick={() => setShowFieldDrawer(true)} className="btn-primary">
                Add Your First Field
              </button>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {!selectedFieldId && (
            <div className="welcome-screen">
              <h2>Welcome to SoilViews</h2>
              <p>Select a field from the sidebar or create a new one to get started.</p>
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
                    Field Info
                  </button>
                  <button
                    className={activeTab === 'analysis' ? 'active' : ''}
                    onClick={() => setActiveTab('analysis')}
                  >
                    Request Analysis
                  </button>
                  <button className={activeTab === 'maps' ? 'active' : ''} onClick={() => setActiveTab('maps')}>
                    Soil Maps ({maps.length})
                  </button>
                  <button
                    className={activeTab === 'prescriptions' ? 'active' : ''}
                    onClick={() => setActiveTab('prescriptions')}
                  >
                    Prescriptions ({prescriptions.length})
                  </button>
                </div>
              </div>

              <div className="tab-content">
                {activeTab === 'fields' && selectedField && (
                  <div className="field-info">
                    <h3>Field Details</h3>
                    <dl>
                      <dt>Area:</dt>
                      <dd>{selectedField.areaHectares.toFixed(2)} hectares</dd>

                      <dt>Crop Type:</dt>
                      <dd>{selectedField.cropType || 'Not specified'}</dd>

                      {selectedField.lpisId && (
                        <>
                          <dt>KAIS Cadastre ID:</dt>
                          <dd>{selectedField.lpisId}</dd>
                        </>
                      )}

                      <dt>Created:</dt>
                      <dd>{new Date(selectedField.createdAt).toLocaleDateString()}</dd>
                    </dl>
                  </div>
                )}

                {activeTab === 'analysis' && <AnalysisRequestForm fieldId={selectedFieldId} />}

                {activeTab === 'maps' && (
                  <div className="maps-view">
                    {maps.length === 0 && (
                      <div className="empty-state">
                        <p>No soil maps yet. Request analysis to generate maps.</p>
                        <button onClick={() => setActiveTab('analysis')} className="btn-primary">
                          Request Analysis
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
                        <h3>Existing Prescriptions</h3>
                        <ul>
                          {prescriptions.map((rx) => (
                            <li key={rx.id} className="prescription-item">
                              <strong>
                                {rx.cropType} - {rx.season}
                              </strong>
                              <span>Status: {rx.status}</span>
                              {rx.status === 'COMPLETED' && (
                                <button
                                  onClick={async () => {
                                    const { url } = await prescriptionsApi.getDownloadUrl(rx.id);
                                    window.open(url, '_blank');
                                  }}
                                  className="btn-link"
                                >
                                  Download Shapefile
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
    </div>
  );
}
