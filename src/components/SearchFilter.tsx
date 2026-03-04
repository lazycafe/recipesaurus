import { Search, X, Check } from 'lucide-react';

interface SearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  allTags: string[];
  onClearFilters: () => void;
}

export function SearchFilter({
  searchQuery,
  onSearchChange,
  selectedTags,
  onTagToggle,
  allTags,
  onClearFilters,
}: SearchFilterProps) {
  const hasFilters = searchQuery || selectedTags.length > 0;

  return (
    <div className="search-filter">
      <div className="search-bar">
        <Search size={18} strokeWidth={2} className="search-icon" />
        <input
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="search-input"
        />
        {hasFilters && (
          <button className="btn-clear" onClick={onClearFilters}>
            <X size={16} strokeWidth={2} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="filter-tags">
          {allTags.map(tag => (
            <button
              key={tag}
              className={`filter-tag ${selectedTags.includes(tag) ? 'active' : ''}`}
              onClick={() => onTagToggle(tag)}
            >
              {selectedTags.includes(tag) && <Check size={12} strokeWidth={3} />}
              <span>{tag}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
