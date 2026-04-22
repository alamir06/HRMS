import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

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

export default SearchableSelect;
