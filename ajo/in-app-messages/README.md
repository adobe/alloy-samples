# In-App Messages
Web In-App Messaging is a feature that gives marketers the ability to deliver personalized messages to web users. 
Allowing marketers them to display personalized messages on websites using modal-overlay type messages.
With this new feature, marketers can engage with web customers, driving user engagement, retention, and conversions.


## Overview

This sample demonstrates using Adobe Experience Platform to get personalization message content from AJO.
This sample uses the [Adobe Experience Platform Web SDK](https://experienceleague.adobe.com/docs/experience-platform/edge/home.html) to get display in-app content.

## Getting Started

1. Author in-app message content in Adobe Journey Optimizer.
2. Configure the sample to use your Adobe Journey Optimizer orgid,  datastreamId and surfaceUrl. Sample configuration is in the .env file.
3. Run the sample.

## How it works

There are two ways to display in-app message content from Adobe Journey Optimizer.

[Alloy](https://experienceleague.adobe.com/docs/experience-platform/edge/home.html) is included on the page.
1. On page load the sendEvent command is used to fetch in-app message content.
   example :

```alloy("sendEvent", {
  renderDecisions: true,
  personalization {
   decisionContext: {
    color: "orange",
    action: "50off"
   }
  }
});
```

2. Manually trigger the rulesets evaluation using `evaluateRulesets` command.
   example : 

```alloy("evaluateRulesets", {
  renderDecisions: true,
   personalization {
     decisionContext: { color: "orange", action: "50off" }
   }
});
```
