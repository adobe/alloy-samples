"use client";

import { useState, useRef, useEffect, useContext, createContext } from "react";

export default function Dropdown({
  id, // Unique identifier for this dropdown
  trigger,
  options = null,
  customContent = null,
  onItemClick = null,
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Reference to the dropdown container
  const dropdownRef = useRef(null);

  // Handle outside clicks
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Clean up
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleItemClick = (option, e) => {
    e.preventDefault();
    setIsOpen(false);

    if (onItemClick) {
      onItemClick(option);
    }
  };

  // Render the dropdown content
  const renderContent = () => {
    if (customContent) {
      return customContent(setIsOpen);
    }

    return (
      <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
        <div className="py-1" role="menu" aria-orientation="vertical">
          {options &&
            options.map((option, index) => (
              <a
                key={index}
                href="#"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
                onClick={(e) => handleItemClick(option, e)}
              >
                {option}
              </a>
            ))}
        </div>
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Render the trigger with click handler */}
      <div onClick={handleToggle}>{trigger}</div>

      {/* Render the dropdown content when open */}
      {isOpen && renderContent()}
    </div>
  );
}
