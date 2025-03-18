"use client";

import { useState, useEffect, useCallback } from "react";
import Navigation from "../components/Navigation";
import NotificationDetail from "../components/NotificationDetail";

let collectEvent = null;

export default function Home() {
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    window.alloy("configure", {
      datastreamId: "4c03827b-1ff7-4b44-8814-c2e0c4e37f0e",
      orgId: "97D1F3F459CE0AD80A495CBE@AdobeOrg",
      debugEnabled: true,
      personalizationStorageEnabled: true,
      clickCollectionEnabled: false,
    });

    const surfaces = ["web://inbox-message-demo.local/#notifications"];

    alloy("subscribeRulesetItems", {
      surfaces,
      schemas: ["https://ns.adobe.com/personalization/message/content-card"],
      callback: (result, c) => {
        collectEvent = c;

        const notifications = (result?.propositions || []).map(
          (proposition) => {
            const {
              scopeDetails: {
                activity: { id },
              },
              items,
            } = proposition;

            return {
              id,
              title: items[0].data.content.title.content,
              description: items[0].data.content.body.content,
              proposition,
            };
          },
        );

        setNotifications(notifications);
      },
    });

    window.alloy("sendEvent", {
      renderDecisions: true,
      personalization: {
        surfaces,
      },
    });
  }, []);

  const handleDismiss = useCallback((notification) => {
    collectEvent("interact", [notification.proposition]);
    collectEvent("dismiss", [notification.proposition]);
    setSelectedNotification(null);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation
        setSelectedNotification={setSelectedNotification}
        notifications={notifications}
      />

      <main className="flex-grow p-6">
        {selectedNotification &&
          collectEvent("display", [selectedNotification.proposition]) && (
            <NotificationDetail
              notification={selectedNotification}
              onDismiss={handleDismiss}
            />
          )}

        {!selectedNotification && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-lg">
              Click on a notification to view details
            </p>
          </div>
        )}

        <button
          onClick={() => localStorage.clear()}
          className="bg-blue-500 hover:bg-blue-800 text-white px-4 py-2 rounded-md text-sm transition-colors whitespace-nowrap"
          style={{ position: "fixed", bottom: 20, right: 20 }}
        >
          Reset Storage Notifications
        </button>
      </main>
    </div>
  );
}
