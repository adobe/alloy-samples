"use client";

import { FaTrash } from "react-icons/fa";

export default function NotificationList({
  setSelectedNotification,
  notifications,
  inboxConfig = {},
  setIsOpen,
  readNotificationIds,
  setReadNotificationIds,
  deletedNotificationIds,
  setDeletedNotificationIds,
}) {
  const {
    title: inboxTitle = "Notifications",
    emptyInboxMessage = "No notifications",
    isUnreadEnabled = true,
  } = inboxConfig;
  const handleNotificationClick = (notification) => {
    if (!readNotificationIds.has(notification.id)) {
      setReadNotificationIds((prev) => {
        const next = new Set(prev);
        next.add(notification.id);
        return next;
      });
    }
    setIsOpen(false);
    setSelectedNotification(notification);
  };

  const handleNotificationDelete = (notification) => {
    setDeletedNotificationIds((prev) => {
      const next = new Set(prev);
      next.add(notification.id);
      return next;
    });
  };

  const visibleNotifications = notifications.filter(
    (n) => !deletedNotificationIds.has(n.id),
  );

  return (
    <div className="absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
      <div
        className="px-4 py-2 border-b border-gray-100"
        role="presentation"
      >
        <p className="text-sm font-semibold text-gray-900">{inboxTitle}</p>
      </div>
      <div className="py-1" role="menu" aria-orientation="vertical">
        {visibleNotifications.length > 0 ? (
          visibleNotifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-center px-4 py-3 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleNotificationClick(notification)}
            >
              {isUnreadEnabled && !readNotificationIds.has(notification.id) && (
                <div
                  className="h-3 w-3 bg-blue-500 rounded-full mr-3 flex-shrink-0"
                  aria-label="Unread notification"
                ></div>
              )}

              {isUnreadEnabled && readNotificationIds.has(notification.id) && (
                <div
                  className="h-3 w-3 mr-3 flex-shrink-0"
                  aria-label="Read notification"
                ></div>
              )}

              <span className="text-sm text-gray-700">
                {notification.title}
              </span>

              <button
                className="ml-auto text-gray-300 hover:text-gray-400 text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNotificationDelete(notification);
                }}
              >
                <FaTrash className="text-sm" />
              </button>
            </div>
          ))
        ) : (
          <div className="px-4 py-4 text-center">
            <p className="text-sm font-medium text-gray-700">
              {emptyInboxMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
