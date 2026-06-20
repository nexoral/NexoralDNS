'use client';

import { useState, useEffect } from 'react';

export default function TagInput({ value = [], onChange, placeholder = "Enter values..." }) {
  const [inputValue, setInputValue] = useState('');
  const [tags, setTags] = useState(value);

  useEffect(() => {
    setTags(value);
  }, [value]);

  const addTag = (tagValue) => {
    const trimmedValue = tagValue.trim();
    if (trimmedValue && !tags.includes(trimmedValue)) {
      const newTags = [...tags, trimmedValue];
      setTags(newTags);
      onChange(newTags);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    onChange(newTags);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    // Check if the value contains comma and auto-add tag
    if (value.includes(',')) {
      const newTags = value.split(',').filter(tag => tag.trim());
      newTags.forEach(tag => addTag(tag));
    } else {
      setInputValue(value);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  return (
    <div className="w-full">
      <div className="min-h-[42px] px-3 py-2 border border-[rgba(130,165,220,0.2)] rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-[#0d111a]">
        <div className="flex flex-wrap gap-2 items-center">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 bg-[rgba(91,140,255,0.12)] text-[#5b8cff] text-sm font-medium rounded-md border border-blue-200"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-2 text-[#5b8cff] hover:text-[#5b8cff] focus:outline-none"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={tags.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] outline-none bg-transparent text-[#e7eef6] placeholder-[#5f6b7d]"
          />
        </div>
      </div>
      <p className="text-xs text-[#7c8aa0] mt-1">
        Press Enter, Tab, or comma to add IP. Example: 192.168.1.100
      </p>
    </div>
  );
}
