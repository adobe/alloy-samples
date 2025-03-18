"use client";

export default function NotificationDetail({ notification, onDismiss }) {
  const handleDismiss = () => {
    onDismiss(notification);
  };

  if (!notification) {
    return null;
  }

  return (
    <div className="p-6 bg-gray-50 rounded-lg shadow-sm">
      <div className="flex justify-between items-center">
        <p className="text-gray-700 flex-grow my-0">
          {notification.description}
        </p>
        <button
          onClick={handleDismiss}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm transition-colors ml-4 whitespace-nowrap"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
