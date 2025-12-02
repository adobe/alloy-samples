"use client";

import { useState, useCallback, useContext } from "react";

const saveToStorage = (readNotificationIds) => {
  localStorage.setItem(
    "readNotificationIds",
    JSON.stringify(Array.from(readNotificationIds)),
  );
};

export default function NotificationList({
  setSelectedNotification,
  notifications,
  setIsOpen,
}) {
  const [readNotificationIds, setReadNotificationIds] = useState(
    new Set(JSON.parse(localStorage.getItem("readNotificationIds") || "[]")),
  );

  const isNotificationRead = useCallback(
    (notificationId) => readNotificationIds.has(notificationId),
    [readNotificationIds],
  );

  const handleNotificationClick = (notification) => {
    if (!readNotificationIds.has(notification.id)) {
      setReadNotificationIds((prevState) => prevState.add(notification.id));
      saveToStorage(readNotificationIds);
    }
    setIsOpen(false);
    setSelectedNotification(notification);
  };

  return (
    <div className="absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
      <div className="py-1" role="menu" aria-orientation="vertical">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-center px-4 py-3 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleNotificationClick(notification)}
            >
              {!isNotificationRead(notification.id) && (
                <div
                  className="h-3 w-3 bg-blue-500 rounded-full mr-3"
                  aria-label="Unread notification"
                ></div>
              )}

              {isNotificationRead(notification.id) && (
                <div
                  className="h-3 w-3 mr-3"
                  aria-label="Read notification"
                ></div>
              )}

              <span className="text-sm text-gray-700">
                {notification.title}
              </span>
            </div>
          ))
        ) : (
          <div className="px-4 py-3 text-sm text-gray-500">
            No notifications
          </div>
        )}
      </div>
    </div>
  );
}
