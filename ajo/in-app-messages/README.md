# In-App Messages
Web In-App Messaging is a feature that gives in-app capabilities to web marketers, 
allowing them to create seamless and highly personalized user experiences on websites using modal-overlay type messages. With this new feature, they can engage with web customers, driving user engagement, retention, and conversions.

## Overview

This sample demonstrates using Adobe Experience Platform to get personalization message content from AJO.

This sample uses the [Adobe Experience Platform Web SDK](https://experienceleague.adobe.com/docs/experience-platform/edge/home.html) to get display in-app content.


## How it works

1. [Alloy](https://experienceleague.adobe.com/docs/experience-platform/edge/home.html) is included on the page.
2. The `sendEvent` command is used to fetch personalization content.
3. The evaluateRulesets command is used to get the content from AJO.
