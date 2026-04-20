import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Video, Search, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EthiopianDateInput from './EthiopianDateInput';
import './CommonForm.css';

// Quick inline SearchableSelect to provide native search abilities to dropdowns seamlessly.
const SearchableSelect = ({ field, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = React.useRef(null);
  
  const options = field.options || [];

  // Sync internal search field with selected label when closed
  useEffect(() => {
    if (!isOpen) {
      if (value) {
         const selectedOpt = options.find(o => (o.value || o) === value);
         if (selectedOpt) setSearch(selectedOpt.label || selectedOpt);
      } else {
         setSearch('');
      }
    }
  }, [isOpen, value, options]);

  const filtered = options.filter(opt => {
    if (!isOpen) return true; // show all when not currently searching
    const label = opt.label || opt;
    return String(label).toLowerCase().includes(search.toLowerCase());
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="searchable-select-wrapper" ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <label className="common-form-select" htmlFor={`select-${field.name}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'text', padding: '0.65rem 1rem' }}>
        <Search size={16} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
        <input 
          id={`select-${field.name}`}
          type="text" 
          placeholder={`Search ${field.label}...`}
          value={search} 
          onChange={e => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
            if (e.target.value === '') onChange({ target: { name: field.name, value: '', type: 'select' } });
          }}
          onFocus={() => {
             setIsOpen(true);
             setSearch('');
          }}
          style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: '0.95rem' }}
        />
        <ChevronDown size={16} color="var(--text-secondary)" style={{ flexShrink: 0, cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); setIsOpen(!isOpen); }} />
      </label>
      
      {isOpen && (
        <div className="searchable-dropdown-menu" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', zIndex: 100, marginTop: '4px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: '0.25rem 0', maxHeight: '200px', overflowY: 'auto' }}>
            {filtered.length > 0 ? filtered.map((opt, i) => {
              const val = opt.value || opt;
              const isSelected = val === value;
              return (
                <li 
                  key={i} 
                  onMouseDown={(e) => { 
                    e.preventDefault(); 
                    onChange({ target: { name: field.name, value: val, type: 'select' } }); 
                    setSearch(opt.label || opt);
                    setIsOpen(false); 
                  }}
                  style={{ padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isSelected ? 'rgba(11,130,85,0.1)' : 'transparent', color: isSelected ? 'var(--primary-color)' : 'var(--text-primary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = isSelected ? 'rgba(11,130,85,0.1)' : '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = isSelected ? 'rgba(11,130,85,0.1)' : 'transparent'}
                >
                  {opt.label || opt}
                  {isSelected && <Check size={14} color="var(--primary-color)" />}
                </li>
              );
            }) : (
              <li style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>No results</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
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
  const { i18n } = useTranslation();
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
          <SearchableSelect 
             field={field} 
             value={formData[field.name]} 
             onChange={handleChange} 
          />
        );
      case 'file':
        const isVideo = field.accept?.includes('video');
        const IconComponent = isVideo ? Video : (field.accept?.includes('image') ? ImageIcon : Upload);
        const defaultText = isVideo ? 'Upload a Video' : (field.accept?.includes('image') ? 'Upload an Image' : 'Upload a File');

        return (
          <div className="common-file-upload-wrapper">
            <div className="common-file-upload-zone">
              <input
                type="file"
                className="common-file-upload-input"
                name={field.name}
                id={field.name}
                onChange={handleChange}
                required={field.required && !formData[field.name]}
                accept={field.accept || "*/*"}
              />
              <div className="common-file-upload-content">
                <IconComponent size={32} color="var(--text-primary)" />
                <span className="common-file-upload-text">{field.label || defaultText}</span>
                <span className="common-file-upload-subtext">Max size: {field.maxSize || (isVideo ? '10MB' : '5MB')}</span>
              </div>
            </div>
            {formData[field.name] && formData[field.name].name && (
              <div className="common-file-name-preview">{formData[field.name].name}</div>
            )}
          </div>
        );
      case 'custom':
        if (field.render) {
          return field.render({
            value: formData[field.name],
            onChange: (val) => handleChange({ target: { name: field.name, value: val } }),
            formData
          });
        }
        return null;
      case 'textarea':
        return (
          <textarea
            className="common-form-input"
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
        if (field.type === 'date') {
          return (
            <EthiopianDateInput
              value={formData[field.name]}
              onChange={(val) => handleChange({ target: { name: field.name, value: val } })}
              required={field.required}
              disabled={field.disabled || false}
              language={i18n.language}
            />
          );
        }
        
        return (
          <input
            className="common-form-input"
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
      <div className={`common-form-grid ${twoColumns ? 'common-two-cols' : ''}`}>
        {fields.map((field) => (
          <div key={field.name} className={`common-form-group ${field.type === 'file' || field.fullWidth ? 'common-full-width' : ''}`}>
            {field.type !== 'file' && (
              <label className="common-form-label" htmlFor={field.name}>
                {field.label} {field.required && <span className="common-required-star">*</span>}
              </label>
            )}
            {renderField(field)}
          </div>
        ))}
      </div>
      
      <div className={`common-form-actions ${onCancel ? 'common-has-cancel' : ''}`}>
        {onCancel && (
          <button type="button" className="common-btn-cancel-form" onClick={onCancel} disabled={isLoading}>
            {cancelText}
          </button>
        )}
        <button type="submit" className="common-btn-submit" disabled={isLoading}>
          {isLoading ? "Processing..." : submitText}
        </button>
      </div>
    </form>
  );
};

export default CommonForm;
