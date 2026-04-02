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

export default function Navigation({
  setSelectedNotification,
  notifications,
  inboxConfig,
  readNotificationIds,
  setReadNotificationIds,
  deletedNotificationIds,
  setDeletedNotificationIds,
}) {
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

  const hasUnread = notifications.some(
    (n) => !deletedNotificationIds.has(n.id) && !readNotificationIds.has(n.id),
  );

  const inboxLabel = inboxConfig?.title ?? "Notifications";

  const notificationsTrigger = (
    <button
      className="relative flex items-center justify-center hover:text-blue-200 transition-colors"
      aria-label={hasUnread ? `${inboxLabel} (unread)` : inboxLabel}
    >
      <FaBell className="text-xl" />
      {hasUnread && (
        <span
          className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full ring-2 ring-blue-600"
          aria-hidden
        />
      )}
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
              inboxConfig={inboxConfig}
              setIsOpen={setIsOpen}
              readNotificationIds={readNotificationIds}
              setReadNotificationIds={setReadNotificationIds}
              deletedNotificationIds={deletedNotificationIds}
              setDeletedNotificationIds={setDeletedNotificationIds}
            />
          )}
        />
      </div>
    </nav>
  );
}
