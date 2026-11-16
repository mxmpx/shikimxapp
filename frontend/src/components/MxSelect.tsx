import React, { useState, useEffect, useRef, useId } from 'react'

export interface MxSelectOption {
  value: string | number
  label: string
  sublabel?: string
  badge?: string
  badgeColor?: 'green' | 'accent'
  dotColor?: string
}

export interface MxSelectGroup {
  label: string
  options: MxSelectOption[]
}

export interface MxSelectProps {
  label?: string
  icon?: string
  sublabel?: string
  value: string | number
  onChange: (val: any) => void
  options?: MxSelectOption[]
  groups?: MxSelectGroup[]
  placeholder?: string
  searchable?: boolean
  searchPlaceholder?: string
  style?: React.CSSProperties
  flex?: string
  minWidth?: number | string
}

export function MxSelect({
  label,
  icon,
  sublabel,
  value,
  onChange,
  options,
  groups,
  placeholder = 'Выберите...',
  searchable = false,
  searchPlaceholder = 'Поиск...',
  style,
  flex,
  minWidth,
}: MxSelectProps) {
  const selectId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const allOptions: MxSelectOption[] =
    options || (groups ? groups.flatMap((g) => g.options) : [])
  const selectedOption = allOptions.find((o) => o.value === value)

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 60)
    }
    if (!isOpen) {
      setSearchQuery('')
    }
  }, [isOpen, searchable])

  const q = searchQuery.toLowerCase().trim()
  const filterFn = (o: MxSelectOption) => {
    if (!q) return true
    return (
      o.label.toLowerCase().includes(q) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(q))
    )
  }

  const filteredOptions = options ? options.filter(filterFn) : undefined
  const filteredGroups = groups
    ? groups
        .map((g) => ({
          ...g,
          options: g.options.filter(filterFn),
        }))
        .filter((g) => g.options.length > 0)
    : undefined

  const totalFilteredCount =
    (filteredOptions ? filteredOptions.length : 0) +
    (filteredGroups
      ? filteredGroups.reduce((acc, g) => acc + g.options.length, 0)
      : 0)

  return (
    <div
      ref={dropdownRef}
      className="mx2-dropdown"
      style={{
        flex: flex || '1 1 180px',
        minWidth: minWidth || 160,
        ...style,
      }}
    >
      {label && (
        <label className="mx2-dropdown-label">
          {icon && <i className={icon} />}
          <span>{label}</span>
          {sublabel && <span className="count-hint">{sublabel}</span>}
        </label>
      )}

      <button
        type="button"
        id={`mx-select-btn-${selectId}`}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? `mx-select-list-${selectId}` : undefined}
        aria-label={label ? `${label}: ${selectedOption ? selectedOption.label : placeholder}` : undefined}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`mx2-dropdown-trigger ${isOpen ? 'open' : ''}`}
      >
        <div className="mx2-dropdown-trigger-content">
          {selectedOption?.dotColor && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: selectedOption.dotColor,
                flexShrink: 0,
              }}
            />
          )}
          <span className="mx2-dropdown-trigger-text">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span
              className={
                selectedOption.badgeColor === 'accent'
                  ? 'mx2-dropdown-badge-accent'
                  : 'mx2-dropdown-badge-green'
              }
            >
              {selectedOption.badge}
            </span>
          )}
        </div>
        <i
          className={`ti ti-chevron-down mx2-dropdown-chevron ${isOpen ? 'open' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="mx2-dropdown-menu">
          {searchable && (
            <div className="mx2-dropdown-search-wrap">
              <i className="ti ti-search mx2-dropdown-search-icon" />
              <input
                ref={searchInputRef}
                type="search"
                id={`mx-select-search-${selectId}`}
                name={`mx_select_search_${label ? label.toLowerCase().replace(/\s+/g, '_') : 'field'}`}
                aria-label={searchPlaceholder || `Поиск ${label || 'элементов'}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="mx2-dropdown-search-input"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>
          )}

          <div
            id={`mx-select-list-${selectId}`}
            role="listbox"
            aria-label={label || 'Список элементов'}
            className="mx2-dropdown-list"
          >
            {totalFilteredCount === 0 ? (
              <div className="mx2-dropdown-empty">Ничего не найдено</div>
            ) : filteredGroups ? (
              filteredGroups.map((group) => (
                <div key={group.label} style={{ marginBottom: 4 }}>
                  <div className="mx2-dropdown-group-title">
                    <span>{group.label}</span>
                    <span style={{ opacity: 0.6 }}>{group.options.length}</span>
                  </div>
                  {group.options.map((option) => {
                    const isSelected = option.value === value
                    return (
                      <button
                        key={String(option.value)}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          onChange(option.value)
                          setIsOpen(false)
                        }}
                        className={`mx2-dropdown-item ${isSelected ? 'selected' : ''}`}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            minWidth: 0,
                          }}
                        >
                          {option.dotColor && (
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: option.dotColor,
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <div className="mx2-dropdown-item-label">
                            <span className="mx2-dropdown-item-text">
                              {option.label}
                            </span>
                            {option.sublabel && (
                              <span className="mx2-dropdown-item-sub">
                                {option.sublabel}
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            flexShrink: 0,
                          }}
                        >
                          {option.badge && (
                            <span
                              className={
                                option.badgeColor === 'accent'
                                  ? 'mx2-dropdown-badge-accent'
                                  : 'mx2-dropdown-badge-green'
                              }
                            >
                              {option.badge}
                            </span>
                          )}
                          {isSelected && (
                            <i
                              className="ti ti-check"
                              style={{
                                color: 'var(--accent)',
                                fontSize: 13,
                                fontWeight: 700,
                              }}
                            />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))
            ) : (
              filteredOptions?.map((option) => {
                const isSelected = option.value === value
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    onClick={() => {
                      onChange(option.value)
                      setIsOpen(false)
                    }}
                    className={`mx2-dropdown-item ${isSelected ? 'selected' : ''}`}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        minWidth: 0,
                      }}
                    >
                      {option.dotColor && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: option.dotColor,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <div className="mx2-dropdown-item-label">
                        <span className="mx2-dropdown-item-text">
                          {option.label}
                        </span>
                        {option.sublabel && (
                          <span className="mx2-dropdown-item-sub">
                            {option.sublabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexShrink: 0,
                      }}
                    >
                      {option.badge && (
                        <span
                          className={
                            option.badgeColor === 'accent'
                              ? 'mx2-dropdown-badge-accent'
                              : 'mx2-dropdown-badge-green'
                          }
                        >
                          {option.badge}
                        </span>
                      )}
                      {isSelected && (
                        <i
                          className="ti ti-check"
                          style={{
                            color: 'var(--accent)',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        />
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
