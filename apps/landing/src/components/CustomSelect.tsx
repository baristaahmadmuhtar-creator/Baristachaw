import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ChevronDown, Check, Globe } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  type?: 'language' | 'region';
  size?: 'compact' | 'normal';
  theme?: 'light' | 'dark';
}

const REGION_METADATA: Record<string, { flagCode?: string; currency: string; name: string }> = {
  id: { flagCode: 'id', currency: 'IDR', name: 'Indonesia' },
  bn: { flagCode: 'bn', currency: 'BND', name: 'Brunei' },
  my: { flagCode: 'my', currency: 'MYR', name: 'Malaysia' },
  sg: { flagCode: 'sg', currency: 'SGD', name: 'Singapore' },
  au: { flagCode: 'au', currency: 'AUD', name: 'Australia' },
  eu: { flagCode: 'eu', currency: 'EUR', name: 'Europe' },
  us: { flagCode: 'us', currency: 'USD', name: 'United States' },
  global: { currency: 'USD', name: 'Global' },
};

const LANG_METADATA: Record<string, { flagCode: string; nativeName: string; codeName: string }> = {
  id: { flagCode: 'id', nativeName: 'Bahasa Indonesia', codeName: 'ID' },
  en: { flagCode: 'gb', nativeName: 'English', codeName: 'EN' },
  bn: { flagCode: 'bn', nativeName: 'Melayu', codeName: 'BN' },
};

export function CustomSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  className = '',
  style,
  type,
  size = 'normal',
  theme = 'light',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedOption = options.find(o => o.value === value);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync focused index when opening
  useEffect(() => {
    if (isOpen) {
      const activeIdx = options.findIndex(o => o.value === value);
      setFocusedIndex(activeIdx >= 0 ? activeIdx : 0);
    } else {
      setFocusedIndex(-1);
    }
  }, [isOpen, options, value]);

  // Focus the item on key navigation
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex, isOpen]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      triggerRef.current?.focus();
      e.preventDefault();
      e.stopPropagation();
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleListKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev - 1 + options.length) % options.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < options.length) {
        handleSelect(options[focusedIndex].value);
      }
    }
  };

  // Helper to render flag/globe icon
  const renderFlag = (flagCode?: string, name?: string) => {
    if (!flagCode) {
      return <Globe size={14} className="custom-select-flag-icon text-secondary" style={{ flexShrink: 0 }} />;
    }
    return (
      <img
        src={`https://flagcdn.com/w40/${flagCode}.png`}
        srcSet={`https://flagcdn.com/w80/${flagCode}.png 2x`}
        alt={name || 'flag'}
        className="custom-select-flag-img"
        style={{
          height: '11px',
          width: '15px',
          objectFit: 'cover',
          borderRadius: '1.5px',
          display: 'block',
          flexShrink: 0,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.15)'
        }}
      />
    );
  };

  // Helper to render trigger details
  const renderTriggerContent = () => {
    if (type === 'language') {
      const meta = LANG_METADATA[value];
      if (meta) {
        return (
          <>
            {renderFlag(meta.flagCode, meta.nativeName)}
            <span className="custom-select-label-text">
              {size === 'compact' ? meta.codeName : meta.nativeName}
            </span>
          </>
        );
      }
    } else if (type === 'region') {
      const meta = REGION_METADATA[value];
      if (meta) {
        return (
          <>
            {renderFlag(meta.flagCode, meta.name)}
            <span className="custom-select-label-text">
              {size === 'compact' ? meta.currency : meta.name}
            </span>
          </>
        );
      }
    }
    return <span className="custom-select-label-text">{selectedOption ? selectedOption.label : placeholder}</span>;
  };

  // Helper to render option details
  const renderOptionContent = (opt: Option) => {
    if (type === 'language') {
      const meta = LANG_METADATA[opt.value];
      if (meta) {
        return (
          <div className="custom-select-option-content">
            {renderFlag(meta.flagCode, meta.nativeName)}
            <div className="custom-select-option-text">
              <span className="custom-select-option-title">{meta.nativeName}</span>
              <span className="custom-select-option-subtitle">{meta.codeName}</span>
            </div>
          </div>
        );
      }
    } else if (type === 'region') {
      const meta = REGION_METADATA[opt.value];
      if (meta) {
        return (
          <div className="custom-select-option-content">
            {renderFlag(meta.flagCode, meta.name)}
            <div className="custom-select-option-text">
              <span className="custom-select-option-title">{meta.name}</span>
              <span className="custom-select-option-subtitle">{meta.currency}</span>
            </div>
          </div>
        );
      }
    }
    return <span className="custom-select-option-title">{opt.label}</span>;
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select ${isOpen ? 'is-open' : ''} ${size === 'compact' ? 'is-compact' : ''} ${theme === 'dark' ? 'is-dark' : ''} ${className}`}
      style={style}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={type === 'language' ? 'Select Language' : type === 'region' ? 'Select Region' : undefined}
        onClick={toggleDropdown}
        onKeyDown={handleTriggerKeyDown}
        className="custom-select-trigger"
      >
        <div className="custom-select-trigger-content">
          {renderTriggerContent()}
        </div>
        <ChevronDown size={14} className="custom-select-arrow" />
      </button>

      {isOpen && (
        <div className="custom-select-dropdown">
          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            aria-activedescendant={focusedIndex >= 0 ? `${id}-opt-${focusedIndex}` : undefined}
            onKeyDown={handleListKeyDown}
            className="custom-select-list custom-scrollbar"
          >
            {options.map((opt, idx) => {
              const isActive = opt.value === value;
              const isFocused = idx === focusedIndex;
              return (
                <li key={opt.value} role="presentation">
                  <button
                    ref={el => { optionRefs.current[idx] = el; }}
                    id={`${id}-opt-${idx}`}
                    role="option"
                    aria-selected={isActive}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`custom-select-option ${isActive ? 'is-active' : ''} ${isFocused ? 'is-focused' : ''}`}
                  >
                    {renderOptionContent(opt)}
                    {isActive && <Check size={14} className="custom-select-check" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
