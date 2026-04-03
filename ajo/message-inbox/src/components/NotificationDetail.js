"use client";

export default function NotificationDetail({ notification, onDismiss, onDelete }) {
  const handleDismiss = () => {
    onDismiss(notification);
  };

  const handleDelete = () => {
    onDelete(notification);
  };

  if (!notification) {
    return null;
  }

  return (
    <div className="p-6 bg-gray-50 rounded-lg shadow-sm">
      <div className="text-gray-600 text-lg font-bold mb-2">
        {notification.title}
      </div>
      <p className="text-gray-700 my-0 mb-4">
        {notification.description}
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleDismiss}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm transition-colors whitespace-nowrap"
        >
          Dismiss
        </button>
        <button
          onClick={handleDelete}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm transition-colors whitespace-nowrap"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
