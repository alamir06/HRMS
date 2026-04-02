import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Video } from 'lucide-react';
import './CommonForm.css';

/**
 * Reusable dynamic form generator
 * @param {Array} fields - Array of field objects { name, label, type, required, options }
 * @param {Function} onSubmit - Payload callback
 * @param {Function} onCancel - Optional cancel callback to render a Cancel button on the left
 * @param {Object} initialData - Optional
 * @param {String} submitText - Optional
 * @param {String} cancelText - Optional
 * @param {Boolean} isLoading - Optional
 * @param {Boolean} twoColumns - Display form in 2 columns on desktop
 */
const CommonForm = ({ 
  fields = [], 
  onSubmit, 
  onCancel,
  onChange,
  initialData = {}, 
  submitText = "Submit", 
  cancelText = "Cancel",
  isLoading = false,
  twoColumns = false
}) => {
  const [formData, setFormData] = useState(initialData);

  // Sync initialData if it changes externally
  useEffect(() => {
    if (Object.keys(initialData).length > 0) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    let newValue;
    if (type === 'file') {
      newValue = files[0];
    } else {
      newValue = value;
    }
    const newFormData = { ...formData, [name]: newValue };
    setFormData(newFormData);
    if (onChange) onChange(newFormData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  const renderField = (field) => {
    switch (field.type) {
      case 'select':
        return (
          <select
            className="form-select"
            name={field.name}
            value={formData[field.name] || ''}
            onChange={handleChange}
            required={field.required}
          >
            <option value="" disabled>Select {field.label}</option>
            {field.options?.map((opt, i) => (
              <option key={i} value={opt.value || opt}>{opt.label || opt}</option>
            ))}
          </select>
        );
      case 'file':
        const isVideo = field.accept?.includes('video');
        const IconComponent = isVideo ? Video : (field.accept?.includes('image') ? ImageIcon : Upload);
        const defaultText = isVideo ? 'Upload a Video' : (field.accept?.includes('image') ? 'Upload an Image' : 'Upload a File');

        return (
          <div className="file-upload-wrapper">
            <div className="file-upload-zone">
              <input
                type="file"
                className="file-upload-input"
                name={field.name}
                id={field.name}
                onChange={handleChange}
                required={field.required && !formData[field.name]}
                accept={field.accept || "*/*"}
              />
              <div className="file-upload-content">
                <IconComponent size={32} color="var(--text-primary)" />
                <span className="file-upload-text">{field.label || defaultText}</span>
                <span className="file-upload-subtext">Max size: {field.maxSize || (isVideo ? '10MB' : '5MB')}</span>
              </div>
            </div>
            {formData[field.name] && formData[field.name].name && (
              <div className="file-name-preview">{formData[field.name].name}</div>
            )}
          </div>
        );
      case 'textarea':
        return (
          <textarea
            className="form-input"
            name={field.name}
            value={formData[field.name] || ''}
            onChange={handleChange}
            required={field.required}
            placeholder={`Enter ${field.label}`}
            rows={field.rows || 4}
          />
        );
      default:
        // text, email, password, date, number, tel
        return (
          <input
            className="form-input"
            type={field.type || 'text'}
            name={field.name}
            value={formData[field.name] || ''}
            onChange={handleChange}
            required={field.required}
            placeholder={`Enter ${field.label}`}
            min={field.min}
            max={field.max}
          />
        );
    }
  };

  return (
    <form className="common-form" onSubmit={handleSubmit}>
      <div className={`form-grid ${twoColumns ? 'two-cols' : ''}`}>
        {fields.map((field) => (
          <div key={field.name} className={`form-group ${field.type === 'file' || field.fullWidth ? 'full-width' : ''}`}>
            {field.type !== 'file' && (
              <label className="form-label" htmlFor={field.name}>
                {field.label} {field.required && <span className="required-star">*</span>}
              </label>
            )}
            {renderField(field)}
          </div>
        ))}
      </div>
      
      <div className={`form-actions ${onCancel ? 'has-cancel' : ''}`}>
        {onCancel && (
          <button type="button" className="btn-cancel-form" onClick={onCancel} disabled={isLoading}>
            {cancelText}
          </button>
        )}
        <button type="submit" className="btn-submit" disabled={isLoading}>
          {isLoading ? "Processing..." : submitText}
        </button>
      </div>
    </form>
  );
};

export default CommonForm;
