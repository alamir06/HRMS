import React from 'react';
import { Users, Banknote, BarChart3 } from 'lucide-react';
import './FeaturesSection.css';

const FeaturesSection = () => {
  const features = [
    {
      icon: <Users size={28} color="var(--primary-color)" />,
      title: "Unified Directory",
    },
    {
      icon: <Banknote size={28} color="var(--primary-color)" />,
      title: "Smart Payroll",
    },
    {
      icon: <BarChart3 size={28} color="var(--primary-color)" />,
      title: "Real-time Analytics",
    }
  ];

  return (
    <section className="features-section">
      <div className="container features-container">
        {features.map((feature, index) => (
          <div key={index} className="feature-item">
            <div className="feature-icon-wrapper">
              {feature.icon}
            </div>
            <h3 className="feature-title">{feature.title}</h3>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;
