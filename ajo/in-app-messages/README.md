# In-App Messages
Web In-App Messaging is a feature that gives in-app capabilities to web marketers, 
allowing them to create seamless and highly personalized user experiences on websites using modal-overlay type messages. With this new feature, they can engage with web customers, driving user engagement, retention, and conversions.

## Overview

This sample demonstrates using Adobe Experience Platform to get personalization message content from AJO.

This sample uses the [Adobe Experience Platform Web SDK](https://experienceleague.adobe.com/docs/experience-platform/edge/home.html) to get display in-app content.

Similar sample can be found on Alloy Sandbox In-app Messages [here](https://alloyio.com/inAppMessages)

## How it works

[Alloy](https://experienceleague.adobe.com/docs/experience-platform/edge/home.html) is included on the page.
1. `sendEvent` command  : If the renderDecisions property is set to true, the DecisioningEngine component will evaluate it's known rules.
   This means that after a konductor response is received, the rules will be evaluated and personalization rendered.
    An optional property called decisionContext can be provided to supply the context object the decisioning engine will use when evaluating the rulesets.
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

2.`evaluateRulesets` command: You can manually trigger the rulesets evaluation by calling the evaluateRulesets command.
   example : 

```alloy("evaluateRulesets", {
  renderDecisions: true,
   personalization {
     decisionContext: { color: "orange", action: "50off" }
   }
});
```
