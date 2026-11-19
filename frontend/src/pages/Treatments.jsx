import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, X, MessageSquare, Calendar, Sparkles, 
  Info, ArrowRight, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { 
  TREATMENTS_DATA, 
  TREATMENT_CATEGORIES, 
  getWhatsAppEnquiryUrl, 
  getGeneralWhatsAppUrl,
  CLINIC_PHONE_DISPLAY 
} from '../data/treatmentsData';
import '../styles/treatments.css';

const Treatments = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Update SEO Document Title & Meta Description
  useEffect(() => {
    document.title = "Skin, Hair & Aesthetic Treatments | Derma Aline Aesthetics";
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = "Explore advanced skin, hair, laser, pigmentation and aesthetic treatments at Derma Aline Aesthetics Skin Clinic. Discover treatments and enquire about consultations.";
  }, []);

  // Filter treatments based on active category & search query
  const filteredTreatments = useMemo(() => {
    return TREATMENTS_DATA.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
      const matchesSearch = searchQuery.trim() === '' || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subcategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.displayName && item.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Group filtered treatments by Category -> Subcategory for structured hierarchy
  const groupedTreatments = useMemo(() => {
    const groups = {};
    
    // Maintain category ordering
    TREATMENT_CATEGORIES.forEach((cat) => {
      if (cat.id !== 'all') {
        groups[cat.id] = {
          categoryInfo: cat,
          subcategories: {}
        };
      }
    });

    filteredTreatments.forEach((item) => {
      if (groups[item.categoryId]) {
        if (!groups[item.categoryId].subcategories[item.subcategory]) {
          groups[item.categoryId].subcategories[item.subcategory] = [];
        }
        groups[item.categoryId].subcategories[item.subcategory].push(item);
      }
    });

    // Remove empty categories from display
    return Object.entries(groups).filter(([_, data]) => {
      return Object.keys(data.subcategories).length > 0;
    });
  }, [filteredTreatments]);

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    const catalogueEl = document.getElementById('treatment-catalogue');
    if (catalogueEl) {
      catalogueEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleClearFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
  };

  const scrollToCatalogue = () => {
    const catalogueEl = document.getElementById('treatment-catalogue');
    if (catalogueEl) {
      catalogueEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="treatments-page">
      {/* --------------------------------------------------------------------
          A. HERO SECTION
          -------------------------------------------------------------------- */}
      <section className="treatment-hero" aria-label="Treatments Introduction">
        <div className="treatment-hero-content">
          <div className="treatment-hero-badge">
            <Sparkles size={14} color="#D4AF37" />
            <span>Clinical Aesthetics &bull; Official Treatment Menu</span>
          </div>

          <h1 className="treatment-hero-title">
            Discover Your Beauty, <span>Redefined.</span>
          </h1>

          <p className="treatment-hero-subtitle">
            Explore our range of advanced skin, hair and aesthetic treatments, thoughtfully designed around your beauty goals.
          </p>

          <div className="treatment-hero-actions">
            <button 
              onClick={scrollToCatalogue}
              className="btn-clinic-primary"
              aria-label="Explore all clinic treatments"
            >
              <span>Explore Treatments</span>
              <ArrowRight size={17} />
            </button>

            <Link 
              to="/contact" 
              className="btn-clinic-outline"
              aria-label="Book a consultation at Derma Aline Aesthetics"
            >
              <Calendar size={17} />
              <span>Book a Consultation</span>
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          B. CONTROLS BAR: SEARCH & CATEGORY PILLS (STICKY)
          -------------------------------------------------------------------- */}
      <nav id="treatment-catalogue" className="treatment-controls-bar" aria-label="Treatment Category Filters">
        <div className="treatment-search-row">
          <div className="treatment-search-box">
            <Search size={18} className="treatment-search-icon" aria-hidden="true" />
            <input 
              type="text" 
              placeholder="Search treatments by name, procedure or area (e.g. PRP, Hydrafacial, Botox)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search treatments"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="treatment-search-clear"
                title="Clear search"
                aria-label="Clear search input"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="treatment-results-meta">
            <span className="treatment-count-pill">
              {filteredTreatments.length} of {TREATMENTS_DATA.length} Treatments
            </span>
            {(selectedCategory !== 'all' || searchQuery.trim() !== '') && (
              <button 
                onClick={handleClearFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#C5A880',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Category Navigation Tabs */}
        <div className="treatment-categories-scroll" role="tablist">
          {TREATMENT_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleCategorySelect(cat.id)}
                className={`category-tab-btn ${isActive ? 'active' : ''}`}
              >
                <span>{cat.shortName}</span>
                {cat.count && <span className="category-tab-badge">{cat.count}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      {/* --------------------------------------------------------------------
          C. MAIN TREATMENTS CATALOGUE
          -------------------------------------------------------------------- */}
      <main className="treatments-content-container">
        {filteredTreatments.length === 0 ? (
          <div className="treatments-empty-state">
            <Info size={40} color="#C5A880" style={{ margin: '0 auto 12px' }} />
            <h3>No treatments match your search</h3>
            <p>
              We could not find any clinical procedures matching "{searchQuery}". Try searching by another keyword or reset the filters.
            </p>
            <button 
              onClick={handleClearFilters}
              className="btn-clinic-primary"
              style={{ padding: '10px 22px', fontSize: '0.85rem' }}
            >
              View All Treatments
            </button>
          </div>
        ) : (
          groupedTreatments.map(([catId, { categoryInfo, subcategories }]) => (
            <section 
              key={catId} 
              id={`cat-${catId}`}
              className="category-section-block"
              aria-labelledby={`heading-${catId}`}
            >
              <div className="category-section-header">
                <div className="category-section-title-wrap">
                  <span className="category-section-subtitle">Clinical Specialty</span>
                  <h2 id={`heading-${catId}`}>{categoryInfo.name}</h2>
                </div>
                <span style={{ color: '#A6968B', fontSize: '0.82rem', fontWeight: '500' }}>
                  {Object.values(subcategories).reduce((acc, list) => acc + list.length, 0)} Procedures
                </span>
              </div>

              {Object.entries(subcategories).map(([subcatName, items]) => (
                <div key={subcatName} className="subcategory-group-block">
                  <h3 className="subcategory-title">{subcatName}</h3>

                  <div className="treatments-cards-grid">
                    {items.map((treatment) => (
                      <article 
                        key={treatment.id} 
                        className="treatment-card-item"
                        aria-label={`${treatment.name} - ${treatment.price}`}
                      >
                        {/* Image Header with Price Badge */}
                        <div className="treatment-card-top">
                          <img 
                            src={treatment.image || '/clinic-interior.webp'} 
                            alt={`Derma Aline ${treatment.name}`} 
                            loading="lazy"
                          />
                          <div className="treatment-card-top-overlay" />
                          <div className="treatment-card-price-badge">
                            {treatment.price}
                          </div>
                          <span className="treatment-card-subcat-badge">
                            {treatment.pricingNote || treatment.subcategory}
                          </span>
                        </div>

                        {/* Card Content Body */}
                        <div className="treatment-card-body">
                          <div>
                            <h4 className="treatment-card-name">
                              {treatment.displayName || treatment.name}
                            </h4>
                            <span className="treatment-card-note">
                              {treatment.pricingNote}
                            </span>
                            <p className="treatment-card-desc">
                              {treatment.description}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="treatment-card-actions">
                            <a 
                              href={getWhatsAppEnquiryUrl(treatment.name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-whatsapp-enquire"
                              title={`Enquire about ${treatment.name} via WhatsApp`}
                              aria-label={`Enquire about ${treatment.name} on WhatsApp`}
                            >
                              <MessageSquare size={16} />
                              <span>Enquire on WhatsApp</span>
                            </a>

                            <Link 
                              to={`/contact?treatment=${encodeURIComponent(treatment.name)}`}
                              className="btn-card-consult"
                              title={`Request an in-clinic consultation for ${treatment.name}`}
                            >
                              <Calendar size={14} />
                              <span>Book In-Clinic Consultation</span>
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))
        )}

        {/* ------------------------------------------------------------------
            E. PRICING INFORMATION DISCLAIMER
            ------------------------------------------------------------------ */}
        <aside className="treatment-pricing-disclaimer-box" aria-label="Clinical Pricing Notice">
          <div className="disclaimer-icon-wrap" aria-hidden="true">
            <Info size={22} />
          </div>
          <div className="disclaimer-text-wrap">
            <h4>Clinical Pricing & Assessment Policy</h4>
            <p>
              Treatment prices are indicative and may vary depending on individual consultation, treatment requirements and clinical assessment. Please contact our clinic for confirmation.
            </p>
          </div>
        </aside>
      </main>

      {/* --------------------------------------------------------------------
          F. CONSULTATION CTA SECTION
          -------------------------------------------------------------------- */}
      <footer className="treatment-consultation-cta" aria-label="Schedule a Consultation">
        <div className="treatment-cta-inner">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #D9CBBE',
            borderRadius: '20px',
            color: '#5A4638',
            fontSize: '0.78rem',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '18px'
          }}>
            <CheckCircle2 size={14} color="#806657" />
            <span>Personalised Aesthetic Consultation</span>
          </div>

          <h2>Your Skin Deserves Expert Care.</h2>

          <p>
            Begin your journey towards healthier-looking skin with a personalised consultation at Derma Aline Aesthetics Skin Clinic.
          </p>

          <div className="treatment-cta-buttons">
            <Link 
              to="/contact" 
              className="btn-cta-consult"
              aria-label="Book your clinical consultation online"
            >
              <Calendar size={17} />
              <span>Book Your Consultation</span>
            </Link>

            <a 
              href={getGeneralWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cta-whatsapp"
              aria-label="Chat directly with Derma Aline clinical team on WhatsApp"
            >
              <MessageSquare size={17} />
              <span>Chat on WhatsApp ({CLINIC_PHONE_DISPLAY})</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Treatments;
