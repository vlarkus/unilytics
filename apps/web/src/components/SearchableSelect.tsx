
import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, X } from "lucide-react";

export interface Option {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    id?: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    id,
    options,
    value,
    onChange,
    placeholder = "Select...",
    className = "",
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    // Filter options based on search term
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const lowerTerm = searchTerm.toLowerCase();
        return options.filter(
            (opt) =>
                opt.label.toLowerCase().includes(lowerTerm) ||
                opt.value.toLowerCase().includes(lowerTerm)
        );
    }, [options, searchTerm]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    // Focus search input when opening
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            // Small delay to ensure render
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        } else {
            setSearchTerm(""); // Reset search when closing
        }
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div className={`relative w-full ${className}`} ref={containerRef}>
            <button
                type="button"
                id={id}
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`ui-input flex w-full items-center justify-between text-left bg-popover text-popover-foreground ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className="truncate block">
                    {selectedOption ? selectedOption.label : value || placeholder}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full ui-menu animate-in fade-in-0 zoom-in-95">
                    <div className="flex items-center border-b border-border px-3 py-2">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                            ref={searchInputRef}
                            className="flex h-6 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSearchTerm(""); searchInputRef.current?.focus(); }}
                                className="ml-1 rounded-sm opacity-50 hover:opacity-100"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                    <div className="max-h-60 overflow-auto p-1 text-sm">
                        {filteredOptions.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                No options found.
                            </div>
                        ) : (
                            <ul>
                                {filteredOptions.map((option) => (
                                    <li
                                        key={option.value}
                                        className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 outline-none ${option.value === value
                                            ? "bg-accent text-accent-foreground font-medium"
                                            : "hover:bg-accent hover:text-accent-foreground"
                                            }`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelect(option.value);
                                        }}
                                        role="option"
                                        aria-selected={option.value === value}
                                    >
                                        {option.label}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
