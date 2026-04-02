# Message Inbox

A demo of a persistent notification inbox driven by Adobe Journey Optimizer (AJO). The inbox is powered by two AJO campaigns which should both target the same surface:

- A **Content Cards campaign** which delivers individual notification items to the inbox.
- An **Inbox campaign** which delivers configuration such as the title, empty-state copy, and layout.

---

## Prerequisites

- Access to Adobe Journey Optimizer in your Adobe org.
- A **datastream** configured with **Adobe Experience Platform** as a service, with:
  - **Journey Optimizer** enabled.
  - An **event dataset** selected.
- Determine the surface that your message inbox propositions will be bound to. Something like:
   ```
   web://your-site.example#message-inbox
   ```

---

## Part 1 — AJO Setup

### Step 1: Create channels for Content Cards and Inbox

You will need to create two channels, one for the content card and one for the inbox proposition itself.

1. In AJO, navigate to **Administration** → **Channels** → **Create channel configuration**
2. Set a name and description that you will reference later
3. Set the channel to **Content Cards**
4. Under **Platform**, click the checkbox to enable **Web**
5. Set the **Page URL** to the URL (or use rules that match the URL) of your inbox surface. In the example surface above, this would be `https://your-site.example`
6. Set the **Location on page** to the identifier of from your inbox surface. In the example surface above, this would be `message-inbox`
7. Save and confirm the configuration is **Active**
8. Repeat the steps above to create a second channel, but set the channel to **Inbox**

> **Important:** The URL location on page must match the surface queried for in your Web SDK code.

---

### Step 2: Create the Content Card campaign

Create a campaign that deliver cards (messages)

1. In AJO, navigate to **Campaigns** → **Create campaign**
2. Select a **Scheduled** type campaign
3. Set the campaign name and description
4. Within the **Actions** tab, click **Add action** → **Content Card**
5. Set the **Content card configuration** to the Content Card channel created in step 1
6. Set the **Inbox configuration** to the Inbox channel created in step 1
7. For cards (messages) that should be delivered based on user actions on the web page, switch on **Enable additional delivery rules** and edit the rule(s) to match what events and values need to be sent for the message to appear
8. Click **Edit content** to adjust content
9. Repeat steps 4-7 for each type of message/notification that the inbox will receive
10. Set desired audience settings within the **Audience** tab
11. Set desired schedule settings within the **Schedule** tab
12. **Review to activate** and then **Activate** the campaign

---

### Step 3: Create the Inbox campaign

The inbox campaign delivers metadata that configures the inbox itself

1. In AJO, navigate to **Campaigns** → **Create campaign**.
2. Select a **Scheduled** type campaign
3. Set the campaign name and description
4. Within the **Actions** tab, click **Add action** → **Inbox**
5. Set the **Inbox configuration** to the Inbox channel created in step 1
6. Click **Edit content** to adjust content
7. Set desired audience settings within the **Audience** tab (should match campaign from step 2)
8. Set desired schedule settings within the **Schedule** tab (should match campaign from step 2)
9. **Review to activate** and then **Activate** the campaign

---

## Part 2 — Web SDK Implementation

The inbox uses two Web SDK commands: `subscribeRulesetItems` to provide a callback function that is called when the propositions that are valid to display have changed, and `sendEvent` to fetch them (further events may change display rules which determine which messages to display).

### Schemas

```javascript
const CONTENT_CARD_SCHEMA = "https://ns.adobe.com/personalization/message/content-card";
const INBOX_SCHEMA        = "https://ns.adobe.com/personalization/message/inbox";
```

### Surface

Must exactly match the surface in your AJO channel configuration:

```javascript
const SURFACE = "web://your-site.example/#message-inbox";
```

### Configure and fetch

First, `configure` alloy using the datastream described above in the **Prerequisites** section:

```javascript
alloy("configure", {
  datastreamId: "YOUR_DATASTREAM_ID",
  orgId: "YOUR_ORG_ID@AdobeOrg",
  defaultConsent: "in", // May not be usable in your implementation, but should be used for testing
  personalizationStorageEnabled: true,
})
```

Then, use the `subscribeRulesetItems` using your defined surface and the schemas for content cards and inbox. Provide a callback that handles when content card propositions change:

```javascript
alloy("subscribeRulesetItems", {
  surfaces: [SURFACE],
  schemas: [CONTENT_CARD_SCHEMA, INBOX_SCHEMA],
  callback: (result, collectEvent) => {
    const { propositions = [] } = result;
    const notifications = propositions
      .filter((p) => p.items?.[0]?.schema === CONTENT_CARD_SCHEMA)
      .map((proposition) => {
        const content = proposition.items[0]?.data?.content ?? {};
        return {
          id: proposition.scopeDetails.activity.id,
          title: content.title?.content ?? content.title ?? "",
          description: content.body?.content ?? content.body ?? "",
          proposition,
        };
      });
    renderNotifications(notifications, collectEvent);
  },
});
```

As the user interacts with your application, you can send events that update which content card propositions should be displayed: 

```javascript
alloy("sendEvent", {
  renderDecisions: true,
  personalization: { surfaces: [SURFACE] },
});
```

### Tracking interactions

Use the `collectEvent` function provided by the `subscribeRulesetItems` callback to report events back to AJO. This keeps campaign reporting accurate.

```javascript
// When a notification is displayed in the detail view:
collectEvent("display", [notification.proposition]);

// When a user clicks / interacts with a notification:
collectEvent("interact", [notification.proposition]);

// When a user dismisses a notification without reading it:
collectEvent("dismiss", [notification.proposition]);

// When a user deletes a notification:
collectEvent("interact", [notification.proposition]);
collectEvent("delete",   [notification.proposition]);
```

### Triggering cards with client-side rules

Cards with **additional delivery rules** (e.g. `action = deposit-funds`) do not appear on `sendEvent` alone. Trigger them by calling `evaluateRulesets` with the matching `decisionContext`:

```javascript
alloy("evaluateRulesets", {
  renderDecisions: true,
  personalization: {
    decisionContext: { action: "deposit-funds" },
  },
});
```

The `subscribeRulesetItems` callback fires again with any newly qualified cards included alongside the existing ones.

---

## Running the sample

Install dependencies:

```bash
npm install
```

Start the server:

```bash
npm start
```

Open [https://localhost](https://localhost) in your browser.

Update the `datastreamId`, `orgId`, and `SURFACE` constant in `src/app/page.js` to point at your AJO environment before testing.

---

## How it works

1. On page load the app calls `subscribeRulesetItems` for both schemas on the inbox surface, then `sendEvent` to fetch decisions.
2. Edge evaluates which campaigns qualify for the current profile and returns matching propositions.
3. The callback splits propositions by schema: inbox-item propositions configure the inbox shell; content-card propositions become notification items.
4. New notifications that arrive after the initial load (via `evaluateRulesets`) are shown as toast pop-ups.
5. Read, deleted, and dismissed states are persisted to `localStorage` so they survive page reloads.
6. Interaction events (`display`, `interact`, `dismiss`, `delete`) are reported back to AJO via `collectEvent` for campaign reporting.
