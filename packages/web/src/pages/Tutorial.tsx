import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Interactive tutorial landing page.
 * Demonstrates the complete user journey through all 4 field input methods.
 */
export function Tutorial() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  // Mark tutorial as completed when user navigates to dashboard
  const handleCompleteTutorial = () => {
    localStorage.setItem('soilviews_tutorial_completed', 'true');
    navigate('/dashboard');
  };

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to SoilViews',
      icon: '🌾',
      description: 'AI-powered precision agriculture for Bulgarian farmers',
      content: (
        <div className="tutorial-welcome">
          <h2>Transform Your Farm with Soil Intelligence</h2>
          <p className="lead">
            SoilViews uses satellite imagery and AI to create detailed soil property maps for your fields.
            Generate variable rate application (VRA) prescriptions optimized for wheat, sunflower, and maize.
          </p>

          <div className="benefits-grid">
            <div className="benefit-card">
              <span className="benefit-icon">🎯</span>
              <h3>Precision Agriculture</h3>
              <p>Apply fertilizer exactly where needed</p>
            </div>
            <div className="benefit-card">
              <span className="benefit-icon">💰</span>
              <h3>Save Money</h3>
              <p>Reduce input costs by up to 20%</p>
            </div>
            <div className="benefit-card">
              <span className="benefit-icon">🌱</span>
              <h3>Increase Yield</h3>
              <p>Optimize soil health and crop productivity</p>
            </div>
            <div className="benefit-card">
              <span className="benefit-icon">📊</span>
              <h3>Data-Driven</h3>
              <p>Make decisions based on real soil data</p>
            </div>
          </div>

          <div className="tech-specs">
            <h3>Powered by Research</h3>
            <ul>
              <li>✅ 10m resolution satellite imagery (Sentinel-2)</li>
              <li>✅ EfficientNet-b3 + DeepLabV3+ AI models</li>
              <li>✅ R² ≥ 0.78 accuracy on Bulgarian soils</li>
              <li>✅ ISO 28258 compliant soil data</li>
              <li>✅ Compatible with John Deere, Case IH, CLAAS</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'four-methods',
      title: 'Four Ways to Start',
      icon: '🚀',
      description: 'Choose the method that works best for you',
      content: (
        <div className="methods-overview">
          <h2>Four Ways to Add Your Fields</h2>
          <p className="lead">We support multiple workflows to fit how you work:</p>

          <div className="methods-grid">
            <div className="method-card highlight">
              <div className="method-icon">⚡</div>
              <h3>1. Quick Analysis</h3>
              <p className="method-tag">Recommended for new users</p>
              <p>Draw an area and analyze immediately. No commitment - expires in 30 days unless you save it.</p>
              <ul className="method-features">
                <li>✓ Test before you commit</li>
                <li>✓ Results in 3-5 minutes</li>
                <li>✓ No field naming required</li>
                <li>✓ Auto-cleanup after 30 days</li>
              </ul>
              <span className="method-time">⏱️ 2 minutes</span>
            </div>

            <div className="method-card">
              <div className="method-icon">🔍</div>
              <h3>2. KAIS Search</h3>
              <p className="method-tag">For existing parcels</p>
              <p>Search Bulgarian cadastre by ID or municipality to find and select your registered fields.</p>
              <ul className="method-features">
                <li>✓ Official cadastre data</li>
                <li>✓ Accurate boundaries</li>
                <li>✓ By ID or municipality</li>
                <li>✓ Free open data</li>
              </ul>
              <span className="method-time">⏱️ 1 minute</span>
            </div>

            <div className="method-card">
              <div className="method-icon">📥</div>
              <h3>3. KAIS Import</h3>
              <p className="method-tag">For multiple fields</p>
              <p>Upload shapefiles from KAIS open data portal to import hundreds of parcels at once.</p>
              <ul className="method-features">
                <li>✓ Bulk import</li>
                <li>✓ Coordinate transformation</li>
                <li>✓ Duplicate detection</li>
                <li>✓ Validation checks</li>
              </ul>
              <span className="method-time">⏱️ 5 minutes</span>
            </div>

            <div className="method-card">
              <div className="method-icon">✏️</div>
              <h3>4. Draw Manually</h3>
              <p className="method-tag">For custom boundaries</p>
              <p>Draw field boundaries directly on the map for non-cadastre areas or custom shapes.</p>
              <ul className="method-features">
                <li>✓ Full control</li>
                <li>✓ Any boundary</li>
                <li>✓ Custom metadata</li>
                <li>✓ Permanent from start</li>
              </ul>
              <span className="method-time">⏱️ 3 minutes</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'quick-analysis',
      title: 'Quick Analysis Walkthrough',
      icon: '⚡',
      description: 'The fastest way to get started',
      content: (
        <div className="walkthrough">
          <h2>⚡ Quick Analysis - Step by Step</h2>
          <p className="lead">Perfect for testing SoilViews or analyzing potential land purchases.</p>

          <div className="steps-list">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Click the ⚡ Button</h3>
                <p>Find it in the top-left toolbar, next to field actions.</p>
                <div className="screenshot-placeholder">
                  <code>Dashboard → ⚡ Quick Analysis button</code>
                </div>
              </div>
            </div>

            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Draw Your Area</h3>
                <p>Click on the map to draw a polygon. Minimum 0.1 hectares (1000 m²).</p>
                <div className="screenshot-placeholder">
                  <code>Click → Click → Click → Double-click to finish</code>
                </div>
              </div>
            </div>

            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Select Properties</h3>
                <p>Choose which soil properties to analyze:</p>
                <ul>
                  <li>📊 <strong>pH</strong> - Acidity/alkalinity (4.0-9.0)</li>
                  <li>🌱 <strong>Organic Matter</strong> - Carbon content (0-15%)</li>
                  <li>🔬 <strong>Nitrogen</strong> - Total N (mg/kg)</li>
                  <li>💧 <strong>Phosphorus</strong> - Available P (mg/kg)</li>
                  <li>⚡ <strong>Potassium</strong> - Exchangeable K (mg/kg)</li>
                  <li>🏺 <strong>Clay/Sand</strong> - Texture percentages</li>
                </ul>
              </div>
            </div>

            <div className="step-item">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Click "Analyze Now"</h3>
                <p>Analysis begins immediately. You'll see:</p>
                <ul>
                  <li>✓ Temporary field created (expires in 30 days)</li>
                  <li>✓ Maps generated (3-5 minutes per property)</li>
                  <li>✓ Email + in-app notifications when ready</li>
                </ul>
              </div>
            </div>

            <div className="step-item">
              <div className="step-number">5</div>
              <div className="step-content">
                <h3>View Results</h3>
                <p>Check the "Soil Maps" tab to see:</p>
                <ul>
                  <li>📍 Interactive maps with your field boundary</li>
                  <li>📈 Statistics (min, max, mean, std dev, percentiles)</li>
                  <li>🎨 Color-coded visualization</li>
                  <li>🤖 AI model metadata and accuracy</li>
                </ul>
              </div>
            </div>

            <div className="step-item">
              <div className="step-number">6</div>
              <div className="step-content">
                <h3>Save or Discard</h3>
                <p>Two options:</p>
                <div className="option-cards">
                  <div className="option-card success">
                    <strong>✅ Save as Permanent</strong>
                    <p>Click "Save as Permanent Field" button</p>
                    <p>Enter field name and crop type</p>
                    <p>Use for prescriptions and ongoing monitoring</p>
                  </div>
                  <div className="option-card info">
                    <strong>⏳ Let It Expire</strong>
                    <p>Do nothing - auto-deletes in 30 days</p>
                    <p>Perfect for one-time tests</p>
                    <p>No database clutter</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'kais-methods',
      title: 'KAIS Integration',
      icon: '🇧🇬',
      description: 'Use official Bulgarian cadastre data',
      content: (
        <div className="kais-tutorial">
          <h2>🇧🇬 Using KAIS Cadastre Data</h2>
          <p className="lead">
            Integrate with Bulgaria's official cadastre system for accurate, government-verified field boundaries.
          </p>

          <div className="kais-info">
            <h3>What is KAIS?</h3>
            <p>
              The Cadastre and Property Register Information System (KAIS) is Bulgaria's official land registry.
              All parcels have unique IDs in the format: <code>XXXXX.YY.ZZZ</code>
            </p>
            <ul>
              <li><strong>XXXXX</strong> - EKATTE code (municipality)</li>
              <li><strong>YY</strong> - Property number</li>
              <li><strong>ZZZ</strong> - Parcel number</li>
            </ul>
            <p className="example">Example: <code>58761.34.12</code> = Sofia municipality, property 34, parcel 12</p>
          </div>

          <div className="method-comparison">
            <h3>Two KAIS Methods:</h3>

            <div className="comparison-grid">
              <div className="comparison-card">
                <h4>🔍 KAIS Search (Single Fields)</h4>
                <p><strong>Best for:</strong> Finding specific parcels</p>

                <h5>By Cadastre ID:</h5>
                <ol>
                  <li>Click 🔍 Search button</li>
                  <li>Enter cadastre ID (e.g., "58761.34.12")</li>
                  <li>Click Search</li>
                  <li>Field auto-selected if found</li>
                </ol>

                <h5>By Municipality (EKATTE):</h5>
                <ol>
                  <li>Click 🔍 Search button</li>
                  <li>Select "EKATTE Code" radio button</li>
                  <li>Enter 5-digit code (e.g., "58761" for Sofia)</li>
                  <li>Browse all parcels in that municipality</li>
                  <li>Click any parcel to select</li>
                </ol>
              </div>

              <div className="comparison-card">
                <h4>📥 KAIS Import (Bulk)</h4>
                <p><strong>Best for:</strong> Importing many fields at once</p>

                <h5>Steps:</h5>
                <ol>
                  <li>Visit <a href="https://kais.cadastre.bg/en/OpenData" target="_blank" rel="noopener">KAIS Open Data</a></li>
                  <li>Download cadastre shapefiles (FREE)</li>
                  <li>Extract ZIP file (.shp, .dbf, .shx, .prj)</li>
                  <li>Click 📥 Import button in SoilViews</li>
                  <li>Drag & drop all 4 files</li>
                  <li>Click "Import Fields"</li>
                  <li>All parcels imported automatically</li>
                </ol>

                <div className="import-features">
                  <strong>Automatic Processing:</strong>
                  <ul>
                    <li>✓ Coordinate transformation (BGS2005→WGS84)</li>
                    <li>✓ Duplicate detection</li>
                    <li>✓ Area validation (min 0.01 ha)</li>
                    <li>✓ Bulgaria boundary checks</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="kais-tips">
            <h3>💡 Pro Tips</h3>
            <ul>
              <li>Search by EKATTE to see all your municipality's parcels</li>
              <li>Import shapefiles once, then search by ID for quick access</li>
              <li>Cadastre IDs are permanent - safe to reference in reports</li>
              <li>KAIS data updates monthly - re-import for latest boundaries</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'analysis-workflow',
      title: 'Analysis & Prescriptions',
      icon: '📊',
      description: 'From soil maps to VRA prescriptions',
      content: (
        <div className="workflow-tutorial">
          <h2>📊 Complete Workflow</h2>
          <p className="lead">From adding a field to downloading prescription shapefiles.</p>

          <div className="workflow-diagram">
            <div className="workflow-step">
              <div className="workflow-icon">🗺️</div>
              <h3>Step 1: Add Field</h3>
              <p>Choose any of the 4 methods</p>
              <ul>
                <li>⚡ Quick Analysis (fastest)</li>
                <li>🔍 KAIS Search</li>
                <li>📥 KAIS Import</li>
                <li>✏️ Draw Manually</li>
              </ul>
            </div>

            <div className="workflow-arrow">→</div>

            <div className="workflow-step">
              <div className="workflow-icon">🛰️</div>
              <h3>Step 2: Request Analysis</h3>
              <p>Select soil properties to map</p>
              <ul>
                <li>Choose pH, OM, N, P, K, texture</li>
                <li>Set crop year</li>
                <li>Configure cloud cover tolerance</li>
                <li>Analysis starts immediately</li>
              </ul>
            </div>

            <div className="workflow-arrow">→</div>

            <div className="workflow-step">
              <div className="workflow-icon">⏱️</div>
              <h3>Step 3: Wait for Results</h3>
              <p>3-5 minutes per property</p>
              <ul>
                <li>Sentinel-2 imagery fetched</li>
                <li>AI model processes data</li>
                <li>Maps generated as COGs</li>
                <li>Email notification sent</li>
              </ul>
            </div>

            <div className="workflow-arrow">→</div>

            <div className="workflow-step">
              <div className="workflow-icon">🗺️</div>
              <h3>Step 4: View Maps</h3>
              <p>Interactive visualization</p>
              <ul>
                <li>Color-coded property maps</li>
                <li>Statistics & percentiles</li>
                <li>Model accuracy (R² score)</li>
                <li>Layer opacity control</li>
              </ul>
            </div>

            <div className="workflow-arrow">→</div>

            <div className="workflow-step">
              <div className="workflow-icon">📋</div>
              <h3>Step 5: Generate Prescription</h3>
              <p>Variable rate application</p>
              <ul>
                <li>Select crop type (wheat/sunflower/maize)</li>
                <li>Set target rates (N, P, K)</li>
                <li>Choose strategy (variable/zone/uniform)</li>
                <li>Shapefile generated</li>
              </ul>
            </div>

            <div className="workflow-arrow">→</div>

            <div className="workflow-step">
              <div className="workflow-icon">🚜</div>
              <h3>Step 6: Apply in Field</h3>
              <p>Use with precision equipment</p>
              <ul>
                <li>Download shapefile</li>
                <li>Load to John Deere/Case IH/CLAAS</li>
                <li>Apply fertilizer variably</li>
                <li>Save costs, increase yield</li>
              </ul>
            </div>
          </div>

          <div className="timeline-estimate">
            <h3>⏱️ Total Time Estimate</h3>
            <div className="timeline-items">
              <div className="timeline-item">
                <strong>Add Field:</strong> 1-5 minutes
              </div>
              <div className="timeline-item">
                <strong>Request Analysis:</strong> 1 minute
              </div>
              <div className="timeline-item">
                <strong>Processing:</strong> 15-35 minutes (automated)
              </div>
              <div className="timeline-item">
                <strong>Review Maps:</strong> 5 minutes
              </div>
              <div className="timeline-item">
                <strong>Generate Prescription:</strong> 2 minutes
              </div>
              <div className="timeline-item total">
                <strong>Total Active Time:</strong> ~10 minutes
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'get-started',
      title: 'Ready to Start?',
      icon: '🎉',
      description: 'Begin your precision agriculture journey',
      content: (
        <div className="get-started">
          <h2>🎉 You're Ready!</h2>
          <p className="lead">Start analyzing your fields in minutes.</p>

          <div className="quick-start-cards">
            <div className="start-card primary">
              <div className="start-icon">⚡</div>
              <h3>Recommended: Quick Analysis</h3>
              <p>Perfect for first-time users. No commitment, immediate results.</p>
              <button onClick={() => navigate('/dashboard')} className="btn-large btn-primary">
                Start Quick Analysis →
              </button>
            </div>

            <div className="start-card">
              <div className="start-icon">🇧🇬</div>
              <h3>I Have KAIS Data</h3>
              <p>Import from Bulgarian cadastre for accurate boundaries.</p>
              <button onClick={() => navigate('/dashboard')} className="btn-large btn-secondary">
                Go to Dashboard →
              </button>
            </div>
          </div>

          <div className="help-section">
            <h3>Need Help?</h3>
            <div className="help-cards">
              <div className="help-card">
                <span className="help-icon">📖</span>
                <h4>Documentation</h4>
                <p>Detailed guides and API references</p>
              </div>
              <div className="help-card">
                <span className="help-icon">💬</span>
                <h4>Support</h4>
                <p>Email: support@soilviews.bg</p>
              </div>
              <div className="help-card">
                <span className="help-icon">🎓</span>
                <h4>Training</h4>
                <p>Video tutorials and webinars</p>
              </div>
            </div>
          </div>

          <div className="pricing-note">
            <h3>💰 Pricing</h3>
            <p className="price-highlight">
              <strong>€0.10 per hectare per year</strong>
            </p>
            <ul className="price-features">
              <li>✓ Unlimited soil property maps</li>
              <li>✓ Unlimited VRA prescriptions</li>
              <li>✓ 10m resolution satellite imagery</li>
              <li>✓ Email & in-app notifications</li>
              <li>✓ KAIS integration included</li>
              <li>✓ Equipment compatibility (John Deere, Case IH, CLAAS)</li>
            </ul>
            <p className="price-example">
              Example: 100 hectares = <strong>€10/year</strong>
            </p>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[activeStep];

  return (
    <div className="tutorial-page">
      <div className="tutorial-sidebar">
        <div className="tutorial-logo">
          <h1>🌾 SoilViews</h1>
          <p>Tutorial</p>
        </div>

        <nav className="tutorial-nav">
          {steps.map((step, index) => (
            <button
              key={step.id}
              className={`nav-item ${activeStep === index ? 'active' : ''} ${index < activeStep ? 'completed' : ''}`}
              onClick={() => setActiveStep(index)}
            >
              <span className="nav-icon">{step.icon}</span>
              <div className="nav-content">
                <strong>{step.title}</strong>
                <small>{step.description}</small>
              </div>
              {index < activeStep && <span className="check-mark">✓</span>}
            </button>
          ))}
        </nav>

        <div className="tutorial-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <p>
            Step {activeStep + 1} of {steps.length}
          </p>
        </div>
      </div>

      <div className="tutorial-content">
        <div className="content-header">
          <span className="step-icon">{currentStep.icon}</span>
          <div>
            <h1>{currentStep.title}</h1>
            <p>{currentStep.description}</p>
          </div>
        </div>

        <div className="content-body">{currentStep.content}</div>

        <div className="content-footer">
          <button
            onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
            disabled={activeStep === 0}
            className="btn-secondary"
          >
            ← Previous
          </button>

          <div className="footer-center">
            <button onClick={() => navigate('/dashboard')} className="btn-link">
              Skip to Dashboard
            </button>
          </div>

          {activeStep < steps.length - 1 ? (
            <button onClick={() => setActiveStep(activeStep + 1)} className="btn-primary">
              Next →
            </button>
          ) : (
            <button onClick={() => navigate('/dashboard')} className="btn-primary btn-large">
              Go to Dashboard →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
