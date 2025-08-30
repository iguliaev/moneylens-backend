"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function TagsMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select tags",
  disabled,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (name: string) => {
    if (value.includes(name)) onChange(value.filter((v) => v !== name));
    else onChange([...value, name]);
  };

  const clear = () => onChange([]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full border rounded px-2 py-1 text-left min-h-[2.25rem] ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        {value.length === 0 ? (
          <span className="text-gray-500">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {value.map((v) => (
              <span key={v} className="inline-flex items-center gap-1 text-xs bg-gray-100 border rounded px-2 py-0.5">
                {v}
                <span
                  role="button"
                  aria-label={`Remove ${v}`}
                  className="cursor-pointer text-gray-500 hover:text-gray-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(v);
                  }}
                >
                  ×
                </span>
              </span>
            ))}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full border rounded bg-white shadow">
          <div className="p-2 border-b flex items-center gap-2">
            <input
              autoFocus
              className="border rounded px-2 py-1 w-full"
              placeholder="Search tags..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {value.length > 0 && (
              <button type="button" className="text-xs px-2 py-1 border rounded" onClick={clear}>
                Clear
              </button>
            )}
          </div>
          <div className="max-h-56 overflow-auto">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">No tags</div>
            ) : (
              filtered.map((name) => {
                const checked = value.includes(name);
                return (
                  <label key={name} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(name)}
                    />
                    <span>{name}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
