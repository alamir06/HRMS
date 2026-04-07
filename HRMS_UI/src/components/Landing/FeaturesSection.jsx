import React, { useState } from 'react';
import { Users, Banknote, BarChart3, X } from 'lucide-react';
import './FeaturesSection.css';

const FeaturesSection = () => {
  const features = [
    {
      icon: <Users size={28} color="var(--primary-color)" />,
      title: "Unified Directory",
      description: "Manage all university staff, tracking their academic roles, internal departments, administrative assignments, and third-party outsource records from a single centralized hub."
    },
    {
      icon: <Banknote size={28} color="var(--primary-color)" />,
      title: "Smart Payroll",
      description: "Automate salary constraints, tax deductions, bonuses, and penalties synced directly to the attendance hardware across all campus boundaries."
    },
    {
      icon: <BarChart3 size={28} color="var(--primary-color)" />,
      title: "Real-time Analytics",
      description: "Generate immediate organizational charts, structural summaries, and performance matrices allowing HR executives to easily evaluate university operations."
    }
  ];

  const [activeFeature, setActiveFeature] = useState(null);

  return (
    <section className="features-section">
      <div className="container features-container">
        {features.map((feature, index) => (
          <div key={index} className="feature-item" onClick={() => setActiveFeature(feature)} style={{ cursor: 'pointer' }}>
            <div className="feature-icon-wrapper">
              {feature.icon}
            </div>
            <h3 className="feature-title">{feature.title}</h3>
          </div>
        ))}
      </div>

      {activeFeature && (
        <div className="landing-feature-overlay" onClick={() => setActiveFeature(null)}>
          <div className="landing-feature-modal" onClick={e => e.stopPropagation()} style={{ width: '500px', height: 'auto', padding: '2rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {activeFeature.icon} {activeFeature.title}
                </h3>
                <button style={{ border:'none', background:'transparent', cursor:'pointer', color:'var(--text-secondary)' }} onClick={() => setActiveFeature(null)}>
                   <X size={20} />
                </button>
             </div>
             <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '1rem' }}>
               {activeFeature.description}
             </p>
          </div>
        </div>
      )}
    </section>
  );
};

export default FeaturesSection;
