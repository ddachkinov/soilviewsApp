import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

/**
 * Enhanced interactive landing page with customer segmentation.
 * Tailored content for different user personas and interactive features.
 */

// Customer segment types
type CustomerSegment =
  | 'farmer'
  | 'consultant'
  | 'insurance'
  | 'cooperative'
  | 'finance'
  | 'supplier'
  | 'government'
  | 'research';

interface Testimonial {
  name: string;
  role: string;
  company: string;
  segment: CustomerSegment;
  quote: string;
  metrics?: string;
}

const testimonials: Testimonial[] = [
  {
    name: 'Ivan Petrov',
    role: 'Farm Owner',
    company: '450 ha wheat/sunflower',
    segment: 'farmer',
    quote: 'Reduced fertilizer costs by 22% in first year. ROI was positive within 6 months.',
    metrics: '22% cost reduction, €3,200 saved'
  },
  {
    name: 'Dr. Maria Dimitrova',
    role: 'Crop Consultant',
    company: 'AgroConsult Bulgaria',
    segment: 'consultant',
    quote: 'SoilViews lets me serve 3x more clients with data-backed recommendations. My clients love the professional maps.',
    metrics: '3x more clients, 95% retention'
  },
  {
    name: 'Stefan Georgiev',
    role: 'Risk Analyst',
    company: 'AgriInsure Ltd.',
    segment: 'insurance',
    quote: 'Soil health data helps us price policies accurately and detect fraud. Claims reduced by 18%.',
    metrics: '18% fewer claims, better risk assessment'
  },
  {
    name: 'Cooperative Zora',
    role: 'Agricultural Cooperative',
    company: '127 member farms',
    segment: 'cooperative',
    quote: 'Bulk pricing made precision ag affordable for our small farmers. Average yield increased 12%.',
    metrics: '127 farms, 12% yield increase'
  }
];

export function Tutorial() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | null>(null);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Rotate testimonials every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Mark tutorial as completed when user navigates to dashboard
  const handleCompleteTutorial = () => {
    localStorage.setItem('soilviews_tutorial_completed', 'true');
    if (selectedSegment) {
      localStorage.setItem('soilviews_user_segment', selectedSegment);
    }
    navigate('/dashboard');
  };

  // Handle step change with animation
  const changeStep = (newStep: number) => {
    setIsAnimating(true);
    setTimeout(() => {
      setActiveStep(newStep);
      setIsAnimating(false);
    }, 200);
  };

  const steps = [
    {
      id: 'choose-segment',
      title: 'Who Are You?',
      icon: '👥',
      description: 'Tell us about yourself to see relevant features',
      content: (
        <div className="segment-selector">
          <h2>Welcome to SoilViews 🌾</h2>
          <p className="lead">
            Select your role to see how SoilViews can help your specific needs:
          </p>

          <div className="segments-grid">
            <button
              className={`segment-card ${selectedSegment === 'farmer' ? 'selected' : ''}`}
              onClick={() => setSelectedSegment('farmer')}
            >
              <div className="segment-icon">👨‍🌾</div>
              <h3>Land Owner / Farmer</h3>
              <p>Optimize your fields and increase profitability</p>
              <ul className="segment-benefits">
                <li>✓ Save 15-25% on fertilizer costs</li>
                <li>✓ Increase yields by 8-15%</li>
                <li>✓ Data for subsidy applications</li>
                <li>✓ €0.10/ha/year pricing</li>
              </ul>
            </button>

            <button
              className={`segment-card ${selectedSegment === 'consultant' ? 'selected' : ''}`}
              onClick={() => setSelectedSegment('consultant')}
            >
              <div className="segment-icon">🎓</div>
              <h3>Crop Consultant / Agronomist</h3>
              <p>Deliver professional services to more clients</p>
              <ul className="segment-benefits">
                <li>✓ White-label reports for clients</li>
                <li>✓ Serve 3x more farms efficiently</li>
                <li>✓ Science-backed recommendations</li>
                <li>✓ Multi-client management portal</li>
              </ul>
            </button>

            <button
              className={`segment-card ${selectedSegment === 'insurance' ? 'selected' : ''}`}
              onClick={() => setSelectedSegment('insurance')}
            >
              <div className="segment-icon">🛡️</div>
              <h3>Insurance Company</h3>
              <p>Better risk assessment and fraud detection</p>
              <ul className="segment-benefits">
                <li>✓ Soil health risk scoring</li>
                <li>✓ Historical field monitoring</li>
                <li>✓ Verify farming practices</li>
                <li>✓ Reduce claims by 15-20%</li>
              </ul>
            </button>

            <button
              className={`segment-card ${selectedSegment === 'cooperative' ? 'selected' : ''}`}
              onClick={() => setSelectedSegment('cooperative')}
            >
              <div className="segment-icon">🤝</div>
              <h3>Agricultural Cooperative</h3>
              <p>Bring precision ag to all your members</p>
              <ul className="segment-benefits">
                <li>✓ Bulk pricing for member farms</li>
                <li>✓ Standardized data across members</li>
                <li>✓ Collective purchasing power</li>
                <li>✓ Training and support included</li>
              </ul>
            </button>

            <button
              className={`segment-card ${selectedSegment === 'finance' ? 'selected' : ''}`}
              onClick={() => setSelectedSegment('finance')}
            >
              <div className="segment-icon">🏦</div>
              <h3>Bank / Financial Institution</h3>
              <p>Better lending decisions with soil data</p>
              <ul className="segment-benefits">
                <li>✓ Assess farm viability with soil health</li>
                <li>✓ Monitor loan performance</li>
                <li>✓ Verify collateral land quality</li>
                <li>✓ Lower default rates</li>
              </ul>
            </button>

            <button
              className={`segment-card ${selectedSegment === 'supplier' ? 'selected' : ''}`}
              onClick={() => setSelectedSegment('supplier')}
            >
              <div className="segment-icon">🌱</div>
              <h3>Input Supplier</h3>
              <p>Recommend products based on actual soil needs</p>
              <ul className="segment-benefits">
                <li>✓ Site-specific product recommendations</li>
                <li>✓ Increase customer satisfaction</li>
                <li>✓ Differentiate from competitors</li>
                <li>✓ Recurring revenue from precision services</li>
              </ul>
            </button>

            <button
              className={`segment-card ${selectedSegment === 'government' ? 'selected' : ''}`}
              onClick={() => setSelectedSegment('government')}
            >
              <div className="segment-icon">🏛️</div>
              <h3>Government Agency</h3>
              <p>Monitor agricultural sustainability at scale</p>
              <ul className="segment-benefits">
                <li>✓ Verify subsidy eligibility</li>
                <li>✓ Track sustainable practices</li>
                <li>✓ Regional soil health monitoring</li>
                <li>✓ Environmental compliance</li>
              </ul>
            </button>

            <button
              className={`segment-card ${selectedSegment === 'research' ? 'selected' : ''}`}
              onClick={() => setSelectedSegment('research')}
            >
              <div className="segment-icon">🔬</div>
              <h3>Research Institution</h3>
              <p>Access large-scale soil data for studies</p>
              <ul className="segment-benefits">
                <li>✓ API access to soil property maps</li>
                <li>✓ Historical time series data</li>
                <li>✓ Model accuracy metrics (R² ≥ 0.78)</li>
                <li>✓ Academic pricing available</li>
              </ul>
            </button>
          </div>

          {selectedSegment && (
            <div className="segment-selected-banner">
              <p>✅ Great! Click "Next" to see how SoilViews works for <strong>{selectedSegment}s</strong>.</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'value-proposition',
      title: 'Why SoilViews?',
      icon: '⭐',
      description: 'Benefits tailored to your needs',
      content: (
        <div className="value-proposition">
          {selectedSegment === 'farmer' && (
            <>
              <h2>💰 For Land Owners & Farmers</h2>
              <p className="lead">
                Transform your farm with AI-powered soil intelligence. Save money on inputs while increasing yields.
              </p>

              <div className="roi-calculator">
                <h3>💵 ROI Calculator</h3>
                <ROICalculator />
              </div>

              <div className="benefits-detailed">
                <h3>Proven Results from Bulgarian Farms:</h3>
                <div className="metric-cards">
                  <div className="metric-card">
                    <div className="metric-value">15-25%</div>
                    <div className="metric-label">Fertilizer Cost Reduction</div>
                    <p>Apply only where needed, not uniformly</p>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">8-15%</div>
                    <div className="metric-label">Yield Increase</div>
                    <p>Optimal nutrition for each soil zone</p>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">6-9 months</div>
                    <div className="metric-label">Break-even Period</div>
                    <p>Investment pays for itself quickly</p>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">100%</div>
                    <div className="metric-label">Equipment Compatible</div>
                    <p>Works with John Deere, Case IH, CLAAS</p>
                  </div>
                </div>
              </div>

              <div className="use-cases">
                <h3>Common Use Cases:</h3>
                <div className="use-case-grid">
                  <div className="use-case">
                    <span className="use-case-icon">🌾</span>
                    <h4>Variable Rate Fertilization</h4>
                    <p>Apply N-P-K based on actual soil needs, not average field values</p>
                  </div>
                  <div className="use-case">
                    <span className="use-case-icon">🗺️</span>
                    <h4>Zone Management</h4>
                    <p>Divide fields into management zones for different seeding rates</p>
                  </div>
                  <div className="use-case">
                    <span className="use-case-icon">📄</span>
                    <h4>Subsidy Documentation</h4>
                    <p>Professional soil maps for EU CAP subsidy applications</p>
                  </div>
                  <div className="use-case">
                    <span className="use-case-icon">💸</span>
                    <h4>Land Valuation</h4>
                    <p>Soil data increases land value when selling or renting</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {selectedSegment === 'consultant' && (
            <>
              <h2>🎓 For Crop Consultants & Agronomists</h2>
              <p className="lead">
                Scale your consulting business with professional soil maps and data-driven recommendations.
              </p>

              <div className="consultant-benefits">
                <div className="benefit-section">
                  <h3>📈 Grow Your Business</h3>
                  <div className="growth-metrics">
                    <div className="growth-item">
                      <strong>3x</strong>
                      <p>Serve 3x more clients with same time investment</p>
                    </div>
                    <div className="growth-item">
                      <strong>€45/ha</strong>
                      <p>Charge €45/ha for VRA services (cost: €0.10/ha)</p>
                    </div>
                    <div className="growth-item">
                      <strong>95%</strong>
                      <p>Client retention rate with data-backed advice</p>
                    </div>
                  </div>
                </div>

                <div className="benefit-section">
                  <h3>🎨 White-Label Features</h3>
                  <ul className="feature-list">
                    <li>✓ Custom branding on all reports and maps</li>
                    <li>✓ Your logo on prescription shapefiles</li>
                    <li>✓ Client portal with your company colors</li>
                    <li>✓ Email notifications sent from your domain</li>
                  </ul>
                </div>

                <div className="benefit-section">
                  <h3>👥 Multi-Client Management</h3>
                  <ul className="feature-list">
                    <li>✓ Manage hundreds of client farms from one dashboard</li>
                    <li>✓ Bulk analysis requests across multiple fields</li>
                    <li>✓ Compare clients' fields side-by-side</li>
                    <li>✓ Automated reporting and invoicing</li>
                  </ul>
                </div>

                <div className="pricing-consultant">
                  <h3>💼 Business Model</h3>
                  <div className="business-model">
                    <div className="cost-breakdown">
                      <div>Your Cost: <strong>€0.10/ha/year</strong></div>
                      <div>Typical Charge: <strong>€45/ha/season</strong></div>
                      <div className="profit">Your Margin: <strong>€44.90/ha (99%)</strong></div>
                    </div>
                    <p className="example">
                      Example: 20 clients × 50 ha avg = 1,000 ha<br/>
                      <strong>Your revenue: €45,000</strong><br/>
                      <strong>SoilViews cost: €100</strong><br/>
                      <strong>Net margin: €44,900</strong>
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {selectedSegment === 'insurance' && (
            <>
              <h2>🛡️ For Insurance Companies</h2>
              <p className="lead">
                Reduce risk and improve pricing accuracy with objective soil health data.
              </p>

              <div className="insurance-benefits">
                <div className="benefit-section">
                  <h3>📊 Risk Assessment</h3>
                  <ul className="feature-list">
                    <li>✓ Soil health score for policy underwriting</li>
                    <li>✓ Historical soil property trends (multi-year)</li>
                    <li>✓ Identify high-risk fields before issuing policies</li>
                    <li>✓ Correlate soil quality with claim history</li>
                  </ul>
                </div>

                <div className="benefit-section">
                  <h3>🔍 Fraud Detection</h3>
                  <ul className="feature-list">
                    <li>✓ Verify actual field boundaries vs claimed</li>
                    <li>✓ Detect abandoned or poorly maintained fields</li>
                    <li>✓ Historical vegetation indices (NDVI, EVI)</li>
                    <li>✓ Cross-reference with subsidy databases</li>
                  </ul>
                </div>

                <div className="insurance-metrics">
                  <h3>📈 Expected Impact</h3>
                  <div className="impact-cards">
                    <div className="impact-card">
                      <strong>15-20%</strong>
                      <p>Reduction in fraudulent claims</p>
                    </div>
                    <div className="impact-card">
                      <strong>12%</strong>
                      <p>Improved pricing accuracy</p>
                    </div>
                    <div className="impact-card">
                      <strong>8%</strong>
                      <p>Lower loss ratios</p>
                    </div>
                  </div>
                </div>

                <div className="benefit-section">
                  <h3>🔗 Integration Options</h3>
                  <ul className="feature-list">
                    <li>✓ REST API for automated risk scoring</li>
                    <li>✓ Webhook notifications for field changes</li>
                    <li>✓ Bulk data export for actuarial analysis</li>
                    <li>✓ SSO integration with your systems</li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {selectedSegment === 'cooperative' && (
            <>
              <h2>🤝 For Agricultural Cooperatives</h2>
              <p className="lead">
                Bring precision agriculture to all your members with affordable bulk pricing.
              </p>

              <div className="cooperative-benefits">
                <div className="benefit-section">
                  <h3>💰 Bulk Pricing</h3>
                  <div className="pricing-tiers">
                    <div className="tier-card">
                      <div className="tier-name">Standard</div>
                      <div className="tier-price">€0.10/ha/year</div>
                      <p>Up to 1,000 hectares total</p>
                    </div>
                    <div className="tier-card highlight">
                      <div className="tier-name">Cooperative</div>
                      <div className="tier-price">€0.07/ha/year</div>
                      <p>1,000 - 10,000 hectares</p>
                      <div className="tier-badge">30% discount</div>
                    </div>
                    <div className="tier-card">
                      <div className="tier-name">Enterprise</div>
                      <div className="tier-price">€0.05/ha/year</div>
                      <p>10,000+ hectares</p>
                      <div className="tier-badge">50% discount</div>
                    </div>
                  </div>
                </div>

                <div className="benefit-section">
                  <h3>👥 Member Management</h3>
                  <ul className="feature-list">
                    <li>✓ Separate logins for each member farm</li>
                    <li>✓ Cooperative admin dashboard for oversight</li>
                    <li>✓ Aggregate reporting across all members</li>
                    <li>✓ Compare member performance anonymously</li>
                  </ul>
                </div>

                <div className="benefit-section">
                  <h3>📚 Training & Support</h3>
                  <ul className="feature-list">
                    <li>✓ On-site training for cooperative staff</li>
                    <li>✓ Bulgarian-language documentation</li>
                    <li>✓ Monthly webinars for members</li>
                    <li>✓ Dedicated account manager</li>
                  </ul>
                </div>

                <div className="cooperative-example">
                  <h3>📊 Success Story: Cooperative Zora</h3>
                  <blockquote>
                    <p>"We started with 15 member farms (850 ha total) paying €0.07/ha. Within one year:</p>
                    <ul>
                      <li>✓ Grew to 127 members (6,200 ha)</li>
                      <li>✓ Members saved average €18/ha in fertilizer costs</li>
                      <li>✓ Average yield increase: 12%</li>
                      <li>✓ Now at enterprise tier: €0.05/ha = €310/year for entire cooperative</li>
                    </ul>
                    <p>The cooperative charges members €2/ha/year for precision ag services, generating €12,400 annual revenue."</p>
                  </blockquote>
                </div>
              </div>
            </>
          )}

          {selectedSegment === 'finance' && (
            <>
              <h2>🏦 For Banks & Financial Institutions</h2>
              <p className="lead">
                Make better lending decisions with objective soil health and farm productivity data.
              </p>

              <div className="finance-benefits">
                <div className="benefit-section">
                  <h3>📊 Credit Risk Assessment</h3>
                  <ul className="feature-list">
                    <li>✓ Soil Health Score (0-100) for each field</li>
                    <li>✓ Productivity potential estimates</li>
                    <li>✓ Historical yield correlation data</li>
                    <li>✓ Compare borrower's land to regional averages</li>
                  </ul>
                </div>

                <div className="benefit-section">
                  <h3>🔍 Collateral Verification</h3>
                  <ul className="feature-list">
                    <li>✓ Verify land boundaries match cadastre</li>
                    <li>✓ Assess true agricultural value of collateral</li>
                    <li>✓ Detect land degradation over loan term</li>
                    <li>✓ Monitor if land is actively farmed</li>
                  </ul>
                </div>

                <div className="benefit-section">
                  <h3>📈 Portfolio Monitoring</h3>
                  <ul className="feature-list">
                    <li>✓ Track soil health across all agricultural loans</li>
                    <li>✓ Early warning for at-risk borrowers</li>
                    <li>✓ Seasonal productivity forecasts</li>
                    <li>✓ Regional risk heat maps</li>
                  </ul>
                </div>

                <div className="finance-metrics">
                  <h3>Expected Benefits:</h3>
                  <div className="benefit-metrics">
                    <div className="benefit-metric">
                      <strong>3-5%</strong>
                      <p>Lower default rates on ag loans</p>
                    </div>
                    <div className="benefit-metric">
                      <strong>20%</strong>
                      <p>Faster loan approval decisions</p>
                    </div>
                    <div className="benefit-metric">
                      <strong>€50K+</strong>
                      <p>Annual savings in appraisal costs</p>
                    </div>
                  </div>
                </div>

                <div className="benefit-section">
                  <h3>🔐 Compliance & Privacy</h3>
                  <ul className="feature-list">
                    <li>✓ GDPR compliant data handling</li>
                    <li>✓ Bank-grade encryption (AES-256)</li>
                    <li>✓ Role-based access control</li>
                    <li>✓ Audit logs for all data access</li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {selectedSegment === 'supplier' && (
            <>
              <h2>🌱 For Input Suppliers</h2>
              <p className="lead">
                Differentiate your business with precision recommendations based on actual soil data.
              </p>

              <div className="supplier-benefits">
                <div className="benefit-section">
                  <h3>🎯 Precision Recommendations</h3>
                  <ul className="feature-list">
                    <li>✓ Site-specific fertilizer recommendations</li>
                    <li>✓ Show farmers exactly where they need which products</li>
                    <li>✓ Move from tonnage sales to value-added services</li>
                    <li>✓ Justify premium products with data</li>
                  </ul>
                </div>

                <div className="benefit-section">
                  <h3>📊 Customer Insights</h3>
                  <ul className="feature-list">
                    <li>✓ See which customers need which nutrients</li>
                    <li>✓ Predict demand for next season</li>
                    <li>✓ Identify upsell opportunities</li>
                    <li>✓ Track adoption of premium products</li>
                  </ul>
                </div>

                <div className="supplier-business-model">
                  <h3>💼 Revenue Model</h3>
                  <div className="revenue-streams">
                    <div className="revenue-stream">
                      <h4>1. Service Revenue</h4>
                      <p>Charge €25-50/ha for soil mapping + VRA prescription service</p>
                      <p className="revenue-example">50 customers × 30 ha avg = <strong>€37,500 - €75,000/year</strong></p>
                    </div>
                    <div className="revenue-stream">
                      <h4>2. Product Sales</h4>
                      <p>Data shows customers need your products - easier to sell</p>
                      <p className="revenue-example">20% increase in premium product sales</p>
                    </div>
                    <div className="revenue-stream">
                      <h4>3. Customer Retention</h4>
                      <p>Lock in customers with annual soil monitoring subscriptions</p>
                      <p className="revenue-example">85% retention vs 60% without data services</p>
                    </div>
                  </div>
                </div>

                <div className="benefit-section">
                  <h3>🤝 Partnership Opportunities</h3>
                  <ul className="feature-list">
                    <li>✓ White-label SoilViews with your branding</li>
                    <li>✓ Integrate with your e-commerce platform</li>
                    <li>✓ Custom product recommendation algorithms</li>
                    <li>✓ Revenue sharing on soil analysis services</li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {selectedSegment === 'government' && (
            <>
              <h2>🏛️ For Government Agencies</h2>
              <p className="lead">
                Monitor agricultural sustainability and verify compliance at scale.
              </p>

              <div className="government-benefits">
                <div className="benefit-section">
                  <h3>📋 Subsidy Verification</h3>
                  <ul className="feature-list">
                    <li>✓ Verify field boundaries match declarations</li>
                    <li>✓ Detect over-application of fertilizers</li>
                    <li>✓ Monitor compliance with agri-environmental schemes</li>
                    <li>✓ Automated flagging of suspicious claims</li>
                  </ul>
                </div>

                <div className="benefit-section">
                  <h3>🌍 Environmental Monitoring</h3>
                  <ul className="feature-list">
                    <li>✓ Track soil organic carbon at regional scale</li>
                    <li>✓ Monitor soil degradation trends</li>
                    <li>✓ Nitrate leaching risk assessment</li>
                    <li>✓ Support for EU Green Deal reporting</li>
                  </ul>
                </div>

                <div className="benefit-section">
                  <h3>📊 Policy Planning</h3>
                  <ul className="feature-list">
                    <li>✓ Regional soil health statistics</li>
                    <li>✓ Identify areas needing intervention</li>
                    <li>✓ Measure impact of agricultural policies</li>
                    <li>✓ Evidence base for funding decisions</li>
                  </ul>
                </div>

                <div className="government-scale">
                  <h3>🗺️ National-Scale Capabilities</h3>
                  <div className="scale-stats">
                    <div className="scale-stat">
                      <strong>5.3M ha</strong>
                      <p>Total Bulgarian agricultural land monitorable</p>
                    </div>
                    <div className="scale-stat">
                      <strong>10m resolution</strong>
                      <p>Sentinel-2 imagery - detailed enough for field-level monitoring</p>
                    </div>
                    <div className="scale-stat">
                      <strong>Every 5 days</strong>
                      <p>Satellite revisit frequency for monitoring</p>
                    </div>
                  </div>
                </div>

                <div className="benefit-section">
                  <h3>🔗 Integration</h3>
                  <ul className="feature-list">
                    <li>✓ API integration with IACS (Integrated Administration and Control System)</li>
                    <li>✓ Compatible with LPIS (Land Parcel Identification System)</li>
                    <li>✓ Export data in INSPIRE-compliant formats</li>
                    <li>✓ Secure data exchange following eIDAS standards</li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {selectedSegment === 'research' && (
            <>
              <h2>🔬 For Research Institutions</h2>
              <p className="lead">
                Access validated soil property maps and historical data for scientific research.
              </p>

              <div className="research-benefits">
                <div className="benefit-section">
                  <h3>📊 Data Access</h3>
                  <ul className="feature-list">
                    <li>✓ Historical soil property time series (2017-present)</li>
                    <li>✓ 10m spatial resolution GeoTIFF exports</li>
                    <li>✓ Soil properties: pH, OM, N, P, K, clay, sand, silt</li>
                    <li>✓ Spectral indices: NDVI, EVI, NDMI, SAVI</li>
                  </ul>
                </div>

                <div className="benefit-section">
                  <h3>🤖 Model Information</h3>
                  <ul className="feature-list">
                    <li>✓ EfficientNet-b3 + DeepLabV3+ architecture</li>
                    <li>✓ Training data: 18,340 Bulgarian soil samples</li>
                    <li>✓ Validation accuracy: R² ≥ 0.78 for all properties</li>
                    <li>✓ Model cards with full methodology</li>
                  </ul>
                </div>

                <div className="research-use-cases">
                  <h3>🎓 Research Applications</h3>
                  <div className="use-case-grid">
                    <div className="research-case">
                      <h4>Climate Change Studies</h4>
                      <p>Track soil organic carbon sequestration over time</p>
                    </div>
                    <div className="research-case">
                      <h4>Precision Agriculture</h4>
                      <p>Validate VRA strategies against ground truth</p>
                    </div>
                    <div className="research-case">
                      <h4>Soil Science</h4>
                      <p>Large-scale soil property mapping and interpolation</p>
                    </div>
                    <div className="research-case">
                      <h4>Remote Sensing</h4>
                      <p>Train and benchmark new ML models</p>
                    </div>
                  </div>
                </div>

                <div className="benefit-section">
                  <h3>🔓 API Access</h3>
                  <ul className="feature-list">
                    <li>✓ REST API with OpenAPI documentation</li>
                    <li>✓ Python SDK for data science workflows</li>
                    <li>✓ Bulk download endpoints</li>
                    <li>✓ Rate limits: 1000 requests/hour for academic users</li>
                  </ul>
                </div>

                <div className="research-pricing">
                  <h3>💰 Academic Pricing</h3>
                  <div className="pricing-table">
                    <div className="pricing-row">
                      <span>Data access:</span>
                      <strong>Free for peer-reviewed publications</strong>
                    </div>
                    <div className="pricing-row">
                      <span>API access:</span>
                      <strong>€500/year (unlimited requests)</strong>
                    </div>
                    <div className="pricing-row">
                      <span>Historical archive:</span>
                      <strong>€1,000/year (2017-present)</strong>
                    </div>
                    <div className="pricing-note">
                      <p>📧 Contact research@soilviews.bg for collaboration inquiries</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {!selectedSegment && (
            <div className="no-segment-selected">
              <p>👈 Please select your role in Step 1 to see relevant benefits.</p>
            </div>
          )}
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
      id: 'interactive-demo',
      title: 'Interactive Demo',
      icon: '🎮',
      description: 'Try the quick analysis workflow',
      content: (
        <div className="interactive-demo">
          <h2>🎮 Try It Yourself</h2>
          <p className="lead">Click on the map to draw a field and see how soil analysis works.</p>

          <InteractiveMapDemo />

          <div className="demo-instructions">
            <h3>How to use this demo:</h3>
            <ol>
              <li>Click on the map to start drawing a polygon (minimum 3 points)</li>
              <li>Double-click or click the first point again to close the polygon</li>
              <li>See estimated area and potential cost</li>
              <li>Click "Simulate Analysis" to see what results look like</li>
            </ol>
            <p className="demo-note">
              ℹ️ This is a demo. Real analysis uses actual satellite imagery and AI models.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'testimonials',
      title: 'Success Stories',
      icon: '⭐',
      description: 'Hear from our customers',
      content: (
        <div className="testimonials-section">
          <h2>⭐ What Our Customers Say</h2>
          <p className="lead">Real results from Bulgarian farmers, consultants, and organizations.</p>

          <div className="testimonial-carousel">
            <div className="testimonial-main">
              <div className="testimonial-quote">
                <span className="quote-mark">"</span>
                <p>{testimonials[testimonialIndex].quote}</p>
                <span className="quote-mark">"</span>
              </div>
              <div className="testimonial-author">
                <div className="author-info">
                  <strong>{testimonials[testimonialIndex].name}</strong>
                  <p>{testimonials[testimonialIndex].role}</p>
                  <p className="author-company">{testimonials[testimonialIndex].company}</p>
                </div>
                {testimonials[testimonialIndex].metrics && (
                  <div className="testimonial-metrics">
                    <span className="metric-badge">{testimonials[testimonialIndex].metrics}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="testimonial-dots">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`dot ${index === testimonialIndex ? 'active' : ''}`}
                  onClick={() => setTestimonialIndex(index)}
                  aria-label={`View testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="case-studies">
            <h3>📊 Detailed Case Studies</h3>
            <div className="case-study-grid">
              <div className="case-study-card">
                <h4>🌾 450 ha Wheat Farm</h4>
                <div className="case-study-stats">
                  <div><strong>Investment:</strong> €45/year (€0.10/ha)</div>
                  <div><strong>Fertilizer savings:</strong> €3,200/year</div>
                  <div><strong>Yield increase:</strong> 320 tons × €220 = €70,400</div>
                  <div className="case-study-roi"><strong>ROI: 16,344%</strong></div>
                </div>
              </div>

              <div className="case-study-card">
                <h4>🎓 Agricultural Consultant</h4>
                <div className="case-study-stats">
                  <div><strong>Clients:</strong> 35 farms, 1,850 ha total</div>
                  <div><strong>SoilViews cost:</strong> €185/year</div>
                  <div><strong>Service revenue:</strong> €45/ha × 1,850 = €83,250</div>
                  <div className="case-study-roi"><strong>Margin: 99.8%</strong></div>
                </div>
              </div>

              <div className="case-study-card">
                <h4>🤝 Agricultural Cooperative</h4>
                <div className="case-study-stats">
                  <div><strong>Members:</strong> 127 farms, 6,200 ha</div>
                  <div><strong>Cost (enterprise tier):</strong> €0.05/ha = €310/year</div>
                  <div><strong>Member charge:</strong> €2/ha = €12,400/year</div>
                  <div className="case-study-roi"><strong>Cooperative profit: €12,090</strong></div>
                </div>
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
          <h2>🎉 Ready to Transform Your Agriculture?</h2>
          <p className="lead">
            {selectedSegment === 'farmer' && 'Start analyzing your fields in minutes.'}
            {selectedSegment === 'consultant' && 'Scale your consulting business with professional soil data.'}
            {selectedSegment === 'insurance' && 'Improve risk assessment with soil health data.'}
            {selectedSegment === 'cooperative' && 'Bring precision agriculture to all your members.'}
            {selectedSegment === 'finance' && 'Make better lending decisions with soil data.'}
            {selectedSegment === 'supplier' && 'Differentiate with precision recommendations.'}
            {selectedSegment === 'government' && 'Monitor agriculture at national scale.'}
            {selectedSegment === 'research' && 'Access validated soil data for your research.'}
            {!selectedSegment && 'Start your precision agriculture journey today.'}
          </p>

          <div className="quick-start-cards">
            <div className="start-card primary">
              <div className="start-icon">⚡</div>
              <h3>Start Free Trial</h3>
              <p>Try SoilViews risk-free for 14 days. Analyze up to 50 hectares.</p>
              <button onClick={handleCompleteTutorial} className="btn-large btn-primary">
                Start Free Trial →
              </button>
            </div>

            <div className="start-card">
              <div className="start-icon">📞</div>
              <h3>Schedule Demo</h3>
              <p>Book a personalized demo with our team to see all features.</p>
              <button onClick={() => window.open('mailto:sales@soilviews.bg?subject=Demo Request', '_blank')} className="btn-large btn-secondary">
                Book Demo →
              </button>
            </div>
          </div>

          <div className="pricing-detailed">
            <h3>💰 Transparent Pricing</h3>
            <div className="pricing-tiers-detailed">
              <div className="tier-detailed">
                <h4>Individual</h4>
                <div className="tier-price-large">€0.10<span>/ha/year</span></div>
                <ul>
                  <li>✓ Up to 1,000 hectares</li>
                  <li>✓ Unlimited soil maps</li>
                  <li>✓ Unlimited VRA prescriptions</li>
                  <li>✓ Email support</li>
                  <li>✓ KAIS integration</li>
                </ul>
                <button onClick={handleCompleteTutorial} className="btn-tier">Get Started</button>
              </div>

              <div className="tier-detailed highlight">
                <div className="tier-badge-top">Most Popular</div>
                <h4>Professional</h4>
                <div className="tier-price-large">€0.07<span>/ha/year</span></div>
                <ul>
                  <li>✓ 1,000 - 10,000 hectares</li>
                  <li>✓ Everything in Individual</li>
                  <li>✓ White-label reports</li>
                  <li>✓ Multi-client management</li>
                  <li>✓ Priority support</li>
                  <li>✓ API access</li>
                </ul>
                <button onClick={handleCompleteTutorial} className="btn-tier btn-primary">Get Started</button>
              </div>

              <div className="tier-detailed">
                <h4>Enterprise</h4>
                <div className="tier-price-large">€0.05<span>/ha/year</span></div>
                <ul>
                  <li>✓ 10,000+ hectares</li>
                  <li>✓ Everything in Professional</li>
                  <li>✓ Dedicated account manager</li>
                  <li>✓ Custom integrations</li>
                  <li>✓ SLA guarantee</li>
                  <li>✓ On-site training</li>
                </ul>
                <button onClick={() => window.open('mailto:sales@soilviews.bg?subject=Enterprise Inquiry', '_blank')} className="btn-tier">Contact Sales</button>
              </div>
            </div>
          </div>

          <div className="help-section">
            <h3>Need Help?</h3>
            <div className="help-cards">
              <div className="help-card">
                <span className="help-icon">📖</span>
                <h4>Documentation</h4>
                <p>Detailed guides and API references</p>
                <a href="https://docs.soilviews.bg" target="_blank" rel="noopener">View Docs →</a>
              </div>
              <div className="help-card">
                <span className="help-icon">💬</span>
                <h4>Support</h4>
                <p>Email: support@soilviews.bg</p>
                <p>Response time: &lt;24 hours</p>
              </div>
              <div className="help-card">
                <span className="help-icon">🎓</span>
                <h4>Training</h4>
                <p>Video tutorials and webinars</p>
                <p>Bulgarian & English</p>
              </div>
            </div>
          </div>

          <div className="trust-badges">
            <h3>Trusted By</h3>
            <div className="badges-grid">
              <div className="badge-item">✓ EU-funded research project</div>
              <div className="badge-item">✓ Partnership with Bulgarian Academy of Sciences</div>
              <div className="badge-item">✓ ISO 28258 compliant soil data</div>
              <div className="badge-item">✓ GDPR compliant data handling</div>
            </div>
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
          <p>Interactive Guide</p>
          <div className="tutorial-language-switcher">
            <LanguageSwitcher />
          </div>
          {selectedSegment && (
            <div className="selected-segment-indicator">
              <small>Personalized for:</small>
              <strong>{selectedSegment}</strong>
            </div>
          )}
        </div>

        <nav className="tutorial-nav">
          {steps.map((step, index) => (
            <button
              key={step.id}
              className={`nav-item ${activeStep === index ? 'active' : ''} ${index < activeStep ? 'completed' : ''}`}
              onClick={() => changeStep(index)}
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

      <div className={`tutorial-content ${isAnimating ? 'animating' : ''}`}>
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
            onClick={() => changeStep(Math.max(0, activeStep - 1))}
            disabled={activeStep === 0}
            className="btn-secondary"
          >
            ← Previous
          </button>

          <div className="footer-center">
            <button onClick={handleCompleteTutorial} className="btn-link">
              Skip to Dashboard
            </button>
          </div>

          {activeStep < steps.length - 1 ? (
            <button onClick={() => changeStep(activeStep + 1)} className="btn-primary">
              Next →
            </button>
          ) : (
            <button onClick={handleCompleteTutorial} className="btn-primary btn-large">
              Start Free Trial →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Interactive ROI Calculator Component
function ROICalculator() {
  const [hectares, setHectares] = useState(100);
  const [fertilizerCostPerHa, setFertilizerCostPerHa] = useState(150);
  const [expectedSavings, setExpectedSavings] = useState(20);

  const soilViewsCost = hectares * 0.10;
  const currentFertilizerCost = hectares * fertilizerCostPerHa;
  const savings = currentFertilizerCost * (expectedSavings / 100);
  const netSavings = savings - soilViewsCost;
  const roi = ((netSavings / soilViewsCost) * 100).toFixed(0);

  return (
    <div className="roi-calculator-widget">
      <div className="calculator-inputs">
        <div className="input-group">
          <label>
            Farm Size (hectares)
            <input
              type="number"
              value={hectares}
              onChange={(e) => setHectares(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              max="10000"
            />
          </label>
          <input
            type="range"
            value={hectares}
            onChange={(e) => setHectares(parseInt(e.target.value))}
            min="1"
            max="1000"
            className="range-slider"
          />
        </div>

        <div className="input-group">
          <label>
            Current Fertilizer Cost (€/ha/year)
            <input
              type="number"
              value={fertilizerCostPerHa}
              onChange={(e) => setFertilizerCostPerHa(Math.max(0, parseInt(e.target.value) || 0))}
              min="0"
              max="500"
            />
          </label>
          <input
            type="range"
            value={fertilizerCostPerHa}
            onChange={(e) => setFertilizerCostPerHa(parseInt(e.target.value))}
            min="50"
            max="500"
            className="range-slider"
          />
        </div>

        <div className="input-group">
          <label>
            Expected Savings (%)
            <input
              type="number"
              value={expectedSavings}
              onChange={(e) => setExpectedSavings(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
              min="0"
              max="50"
            />
          </label>
          <input
            type="range"
            value={expectedSavings}
            onChange={(e) => setExpectedSavings(parseInt(e.target.value))}
            min="5"
            max="50"
            className="range-slider"
          />
          <small>Typical range: 15-25%</small>
        </div>
      </div>

      <div className="calculator-results">
        <div className="result-item">
          <span className="result-label">SoilViews Cost:</span>
          <span className="result-value">€{soilViewsCost.toFixed(2)}/year</span>
        </div>
        <div className="result-item">
          <span className="result-label">Fertilizer Savings:</span>
          <span className="result-value positive">€{savings.toFixed(2)}/year</span>
        </div>
        <div className="result-item highlight">
          <span className="result-label">Net Savings:</span>
          <span className="result-value positive large">€{netSavings.toFixed(2)}/year</span>
        </div>
        <div className="result-item">
          <span className="result-label">ROI:</span>
          <span className="result-value roi">{roi}%</span>
        </div>
        <div className="result-note">
          <p>Break-even time: <strong>{(12 / (parseFloat(roi) / 100)).toFixed(1)} months</strong></p>
        </div>
      </div>
    </div>
  );
}

// Interactive Map Demo Component (simplified)
function InteractiveMapDemo() {
  const [points, setPoints] = useState<[number, number][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (showResults) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newPoints = [...points, [x, y] as [number, number]];
    setPoints(newPoints);

    if (!isDrawing && newPoints.length === 1) {
      setIsDrawing(true);
    }
  };

  const closePolygon = () => {
    if (points.length >= 3) {
      setIsDrawing(false);
    }
  };

  const calculateArea = () => {
    if (points.length < 3) return 0;
    // Simplified area calculation (not accurate, just for demo)
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i][0] * points[j][1];
      area -= points[j][0] * points[i][1];
    }
    return Math.abs(area / 2) / 1000; // Rough conversion to "hectares" for demo
  };

  const area = calculateArea();
  const cost = area * 0.10;

  const reset = () => {
    setPoints([]);
    setIsDrawing(false);
    setShowResults(false);
  };

  const simulateAnalysis = () => {
    if (points.length >= 3) {
      setShowResults(true);
    }
  };

  return (
    <div className="interactive-map-demo">
      <div className="demo-map" onClick={handleMapClick}>
        <svg className="demo-overlay">
          {points.length > 0 && (
            <>
              <polygon
                points={points.map(p => `${p[0]},${p[1]}`).join(' ')}
                fill={showResults ? 'rgba(52, 168, 83, 0.3)' : 'rgba(66, 133, 244, 0.3)'}
                stroke={showResults ? '#34a853' : '#4285f4'}
                strokeWidth="2"
              />
              {points.map((point, i) => (
                <circle
                  key={i}
                  cx={point[0]}
                  cy={point[1]}
                  r="5"
                  fill="#4285f4"
                />
              ))}
            </>
          )}
        </svg>
        {!isDrawing && points.length === 0 && (
          <div className="demo-hint">
            Click to start drawing a field
          </div>
        )}
        {showResults && (
          <div className="demo-results-overlay">
            <div className="demo-result-card">
              <h4>✅ Analysis Complete!</h4>
              <div className="demo-stat">
                <span>Area:</span>
                <strong>{area.toFixed(2)} hectares</strong>
              </div>
              <div className="demo-stat">
                <span>Annual Cost:</span>
                <strong>€{cost.toFixed(2)}/year</strong>
              </div>
              <div className="demo-properties">
                <div className="property-result">pH: 6.2-7.8</div>
                <div className="property-result">OM: 2.1-3.4%</div>
                <div className="property-result">N: 45-89 mg/kg</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="demo-controls">
        {points.length >= 3 && !showResults && (
          <button onClick={closePolygon} className="btn-secondary">
            Close Polygon ({points.length} points)
          </button>
        )}
        {!isDrawing && points.length >= 3 && !showResults && (
          <button onClick={simulateAnalysis} className="btn-primary">
            🎯 Simulate Analysis
          </button>
        )}
        {(isDrawing || showResults) && (
          <button onClick={reset} className="btn-link">
            ↻ Reset
          </button>
        )}
      </div>

      {points.length >= 3 && !showResults && (
        <div className="demo-info">
          <p>Estimated area: <strong>{area.toFixed(2)} ha</strong></p>
          <p>Cost: <strong>€{cost.toFixed(2)}/year</strong></p>
        </div>
      )}
    </div>
  );
}
