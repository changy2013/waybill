'use client';

import { Check } from 'lucide-react';

export default function StepWizard({ steps, currentStep }) {
  return (
    <div className="step-wizard">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        
        return (
          <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
            <div className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
              <div className="step-number">
                {isCompleted ? <Check size={16} strokeWidth={3} /> : index + 1}
              </div>
              <div className="step-label">{step}</div>
            </div>
            
            {index < steps.length - 1 && (
              <div className={`step-connector ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
