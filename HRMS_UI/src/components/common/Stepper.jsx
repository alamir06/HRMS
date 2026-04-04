import React from 'react';
import { Check } from 'lucide-react';
import './Stepper.css';

const Stepper = ({ steps, currentStep }) => {
  return (
    <div className="stepper-container">
      <div className="stepper-wrapper">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;

          return (
            <div key={index} className={`stepper-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
              <div className="step-counter">
                {isCompleted ? <Check size={16} strokeWidth={3} /> : index + 1}
              </div>
              <div className="step-name">
                {step.title}
                {/* {step.subtitle && <span className="step-subtitle">{step.subtitle}</span>} */}
              </div>
              {/* Connector line - don't show after last item */}
              {index < steps.length - 1 && <div className="step-connector"></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Stepper;
