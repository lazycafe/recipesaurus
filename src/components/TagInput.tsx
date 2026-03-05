import { useState, useRef, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestedTags?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function TagInput({
  tags,
  onChange,
  suggestedTags = [],
  placeholder = 'Add a tag...',
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const normalized = tag.trim().toLowerCase();
    if (normalized && !tags.includes(normalized)) {
      onChange([...tags, normalized]);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleInputChange = (value: string) => {
    // If user types a comma, add the tag
    if (value.includes(',')) {
      const parts = value.split(',');
      parts.forEach((part, index) => {
        if (index < parts.length - 1) {
          addTag(part);
        } else {
          setInputValue(part);
        }
      });
    } else {
      setInputValue(value);
    }
  };

  // Filter out already-selected tags from suggestions
  const availableSuggestions = suggestedTags.filter(
    tag => !tags.includes(tag.toLowerCase())
  );

  return (
    <div className="tag-input-container">
      <div
        className="tag-input-field"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map(tag => (
          <span key={tag} className="tag-chip">
            <span>{tag}</span>
            {!disabled && (
              <button
                type="button"
                className="tag-chip-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                aria-label={`Remove ${tag}`}
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="tag-input"
          disabled={disabled}
        />
      </div>

      {availableSuggestions.length > 0 && !disabled && (
        <div className="tag-suggestions">
          {availableSuggestions.map(tag => (
            <button
              key={tag}
              type="button"
              className="tag-suggestion"
              onClick={() => addTag(tag)}
            >
              <Plus size={12} strokeWidth={2.5} />
              <span>{tag}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
