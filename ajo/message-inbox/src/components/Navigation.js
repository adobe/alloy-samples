"use client";

import { useState } from "react";
import { FaShoppingBag, FaPercent, FaBell } from "react-icons/fa";
import NotificationList from "./NotificationList";
import Dropdown from "./Dropdown";

// Menu options
const shopOptions = [
  "Clothing",
  "Electronics",
  "Home & Garden",
  "Books",
  "Toys",
];
const promotionOptions = ["Weekly Deals", "Clearance", "Holiday Specials"];

export default function Navigation({ setSelectedNotification, notifications }) {
  // Render menu trigger buttons
  const shopTrigger = (
    <button className="flex items-center space-x-2 hover:text-blue-200 transition-colors">
      <FaShoppingBag className="text-xl" />
      <span>Shop</span>
    </button>
  );

  const promotionsTrigger = (
    <button className="flex items-center space-x-2 hover:text-blue-200 transition-colors">
      <FaPercent className="text-xl" />
      <span>Promotions</span>
    </button>
  );

  const notificationsTrigger = (
    <button className="flex items-center space-x-2 hover:text-blue-200 transition-colors">
      <FaBell className="text-xl" />
    </button>
  );

  return (
    <nav className="relative bg-blue-600 p-4 text-white">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex space-x-8">
          {/* Shop Menu */}
          <Dropdown id="shop" trigger={shopTrigger} options={shopOptions} />

          {/* Promotions Menu */}
          <Dropdown
            id="promotions"
            trigger={promotionsTrigger}
            options={promotionOptions}
          />
        </div>

        {/* Notifications */}
        <Dropdown
          id="notifications"
          trigger={notificationsTrigger}
          customContent={(setIsOpen) => (
            <NotificationList
              setSelectedNotification={setSelectedNotification}
              notifications={notifications}
              setIsOpen={setIsOpen}
            />
          )}
        />
      </div>
    </nav>
  );
}
