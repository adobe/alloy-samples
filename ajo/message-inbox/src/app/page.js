"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Navigation from "../components/Navigation";
import NotificationDetail from "../components/NotificationDetail";

const TOAST_DURATION_MS = 4000;

let collectEvent = null;

function readStoredSet(key) {
  if (typeof window === "undefined") return new Set();
  return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
}

const SURFACE = process.env.NEXT_PUBLIC_SURFACE;
const INBOX_SCHEMA = "https://ns.adobe.com/personalization/message/inbox";
const MESSAGE_SCHEMA = "https://ns.adobe.com/personalization/message/content-card";

const DEFAULT_INBOX_CONFIG = {
  title: "Notifications",
  emptyInboxMessage: "No notifications",
  detailPlaceholder: "Click on a notification to view details here",
  isUnreadEnabled: true,
  layout: "vertical",
};

function parseInboxConfig(proposition) {
  const c = proposition.items[0].data?.content ?? {};
  return {
    ...DEFAULT_INBOX_CONFIG,
    ...(c.heading?.content && { title: c.heading.content }),
    ...(c.emptyStateSettings?.message?.content && {
      emptyInboxMessage: c.emptyStateSettings.message.content,
    }),
    ...(c.layout?.orientation && { layout: c.layout.orientation }),
    ...(c.isUnreadEnabled != null && { isUnreadEnabled: c.isUnreadEnabled }),
  };
}

function propositionToNotification(proposition) {
  const { scopeDetails: { activity: { id } }, items = [] } = proposition;
  const content = items[0]?.data?.content ?? {};
  const str = (f) => (typeof f === "string" ? f : f?.content ?? "");
  return {
    id,
    title: str(content.title),
    description: str(content.body),
    proposition,
  };
}

const TRIGGER_ACTIONS = {
  "Deposit funds": "deposit-funds",
  "Share on social media": "social-media",
};

export default function Home() {
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [inboxConfig, setInboxConfig] = useState(DEFAULT_INBOX_CONFIG);
  const [readNotificationIds, setReadNotificationIds] = useState(() =>
    readStoredSet("readNotificationIds"),
  );
  const [deletedNotificationIds, setDeletedNotificationIds] = useState(() =>
    readStoredSet("deletedNotificationIds"),
  );
  const [toasts, setToasts] = useState([]);
  const [buttonAcknowledgement, setButtonAcknowledgement] = useState(null);
  const seenNotificationIdsRef = useRef(new Set());
  const hasSeenInitialRef = useRef(false);
  const toastTimeoutsRef = useRef({});
  const setNotificationsRef = useRef(setNotifications);
  setNotificationsRef.current = setNotifications;

  const removeToast = useCallback((key) => {
    if (toastTimeoutsRef.current[key]) {
      clearTimeout(toastTimeoutsRef.current[key]);
      delete toastTimeoutsRef.current[key];
    }
    setToasts((prev) => prev.filter((t) => t.key !== key));
  }, []);

  useEffect(() => {
    if (notifications.length === 0) return;
    const newOnes = notifications.filter(
      (n) => !seenNotificationIdsRef.current.has(n.id),
    );
    if (!hasSeenInitialRef.current) {
      hasSeenInitialRef.current = true;
      notifications.forEach((n) => seenNotificationIdsRef.current.add(n.id));
      return;
    }
    if (newOnes.length === 0) return;
    const now = Date.now();
    newOnes.forEach((n) => seenNotificationIdsRef.current.add(n.id));
    const toAdd = newOnes.map((notification, i) => ({
      key: `${notification.id}-${now}-${i}`,
      notification,
    }));
    setToasts((prev) => [...prev, ...toAdd]);
    toAdd.forEach(({ key }) => {
      toastTimeoutsRef.current[key] = setTimeout(
        () => removeToast(key),
        TOAST_DURATION_MS,
      );
    });
  }, [notifications, removeToast]);

  useEffect(() => {
    localStorage.setItem(
      "readNotificationIds",
      JSON.stringify(Array.from(readNotificationIds)),
    );
  }, [readNotificationIds]);

  useEffect(() => {
    localStorage.setItem(
      "deletedNotificationIds",
      JSON.stringify(Array.from(deletedNotificationIds)),
    );
  }, [deletedNotificationIds]);

  useEffect(() => {
    window
      .alloy("configure", {
        defaultConsent: "in",
        datastreamId: process.env.NEXT_PUBLIC_DATASTREAM_ID,
        orgId: process.env.NEXT_PUBLIC_ORG_ID,
        edgeDomain: process.env.NEXT_PUBLIC_EDGE_DOMAIN,
        personalizationStorageEnabled: true,
        clickCollectionEnabled: true,
      })
      .then(() => {
        window.alloy("subscribeRulesetItems", {
          surfaces: [SURFACE],
          schemas: [MESSAGE_SCHEMA],
          callback: (result, c) => {
            collectEvent = c;
            setNotificationsRef.current(
              result.propositions.map(propositionToNotification),
            );
          },
        });

        return window.alloy("sendEvent", {
          renderDecisions: true,
          personalization: { surfaces: [SURFACE] },
        });
      })
      .then((sendResult) => {
        sendResult?.propositions?.filter(
          (proposition) => proposition.items?.[0]?.schema === INBOX_SCHEMA,
        ).forEach((proposition) => {
          setInboxConfig(parseInboxConfig(proposition));
        });
      })
      .catch(console.warn);
  }, []);

  const handleDismiss = useCallback((notification) => {
    collectEvent?.("interact", [notification.proposition]);
    collectEvent?.("dismiss", [notification.proposition]);
    setSelectedNotification(null);
  }, []);

  const handleDelete = useCallback((notification) => {
    collectEvent?.("interact", [notification.proposition]);
    collectEvent?.("delete", [notification.proposition]);
    setDeletedNotificationIds((prev) => {
      const next = new Set(prev);
      next.add(notification.id);
      return next;
    });
    setSelectedNotification(null);
  }, []);

  const handleAddNotification = useCallback((title) => {
    const action = TRIGGER_ACTIONS[title];
    if (!action) return;
    window
      .alloy("evaluateRulesets", {
        renderDecisions: true,
        personalization: { decisionContext: { action } },
      })
      .catch(console.warn);
    setButtonAcknowledgement(title);
    setTimeout(() => setButtonAcknowledgement(null), 2000);
  }, []);

  const handleToastClick = useCallback(
    (toastKey, notification) => {
      setReadNotificationIds((prev) => {
        const next = new Set(prev);
        next.add(notification.id);
        return next;
      });
      setSelectedNotification(notification);
      removeToast(toastKey);
    },
    [removeToast],
  );

  const handleToastDismiss = useCallback(
    (e, toastKey, notification) => {
      e.stopPropagation();
      setReadNotificationIds((prev) => {
        const next = new Set(prev);
        next.add(notification.id);
        return next;
      });
      removeToast(toastKey);
    },
    [removeToast],
  );

  return (
    <div className="min-h-screen flex flex-col">
      <div
        className="fixed top-24 right-4 z-50 flex flex-col gap-2 pointer-events-none"
        style={{ width: "22rem" }}
      >
        <div className="flex flex-col gap-2 pointer-events-auto">
          {toasts.map(({ key, notification }) => (
            <div
              key={key}
              role="button"
              tabIndex={0}
              onClick={() => handleToastClick(key, notification)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleToastClick(key, notification);
                }
              }}
              className="flex items-start gap-2 p-3 bg-white rounded-lg shadow-lg ring-1 ring-black/10 cursor-pointer hover:ring-blue-500/50 transition-shadow text-left"
            >
              <span className="text-sm font-medium text-gray-900 flex-1 min-w-0">
                {notification.title}
              </span>
              <button
                type="button"
                onClick={(e) => handleToastDismiss(e, key, notification)}
                className="flex-shrink-0 p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Dismiss and mark as read"
              >
                <span className="text-lg leading-none">&times;</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <Navigation
        setSelectedNotification={setSelectedNotification}
        notifications={notifications.slice().reverse()}
        inboxConfig={inboxConfig}
        readNotificationIds={readNotificationIds}
        setReadNotificationIds={setReadNotificationIds}
        deletedNotificationIds={deletedNotificationIds}
        setDeletedNotificationIds={setDeletedNotificationIds}
      />

      <main className="flex-grow p-6">
        {selectedNotification &&
          (selectedNotification.proposition &&
            typeof collectEvent === "function"
            ? (collectEvent("display", [selectedNotification.proposition]), true)
            : true) && (
            <div className="flex flex-col items-center justify-center h-full gap-8 mb-4">
              <NotificationDetail
                notification={selectedNotification}
                onDismiss={handleDismiss}
                onDelete={handleDelete}
              />
            </div>
          )}

        {!selectedNotification && (
          <div className="flex flex-col items-center justify-center h-full gap-8 mb-37">
            <p className="text-gray-500 text-lg">
              {inboxConfig.detailPlaceholder}
            </p>
          </div>
        )}

        <div className="flex flex-col items-center justify-center h-full gap-2">
          <span className="text-sm text-gray-500 w-full text-center">
            Add a sample notification:
          </span>
          <div className="flex flex-wrap justify-center gap-3">
            {Object.keys(TRIGGER_ACTIONS).map((label) => (
              <button
                key={label}
                onClick={() => handleAddNotification(label)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
          {buttonAcknowledgement && (
            <p className="text-sm text-green-600 animate-pulse" role="status">
              Sent — {buttonAcknowledgement}
            </p>
          )}
        </div>

        <button
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
          className="fixed bottom-5 right-5 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm transition-colors whitespace-nowrap"
        >
          Reset demo
        </button>
      </main>
    </div>
  );
}
