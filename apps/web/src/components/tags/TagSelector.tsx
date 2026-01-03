import React, { useState, useEffect } from "react";
import { DataApi } from "@/providers/data-provider/api";
import type { Tag } from "@/providers/data-provider/types";

interface TagSelectorProps {
  selectedTags: Tag[];
  onChange: (tags: Tag[]) => void;
}

export function TagSelector({ selectedTags, onChange }: TagSelectorProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTags = async () => {
    setLoading(true);
    try {
      const data = await DataApi.listTags();
      setAvailableTags(data as Tag[]);
    } catch (error) {
      // Best-effort: log and continue with empty list
      // Consumers can pass availableTags directly if needed
      // eslint-disable-next-line no-console
      console.error("Failed to load tags:", error);
      setAvailableTags([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag: Tag) => {
    const isSelected = selectedTags.some((t) => t.id === tag.id);
    if (isSelected) {
      onChange(selectedTags.filter((t) => t.id !== tag.id));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  if (loading) return <div>Loading tags...</div>;

  return (
    <div className="tag-selector">
      <label className="block text-sm font-medium mb-2">Tags</label>
      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => {
          const isSelected = selectedTags.some((t) => t.id === tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-sm ${
                isSelected
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              title={tag.description || tag.name}
            >
              {tag.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TagSelector;
