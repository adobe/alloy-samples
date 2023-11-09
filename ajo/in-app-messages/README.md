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

## Running the sample
Prerequisite: [install node and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

To run this sample:
1. [Setup local SSL certificates for https](https://github.com/adobe/alloy-samples/blob/main/LocalSSLCertificateSetup.md)
2. Clone the repository to your local machine.
3. Open a terminal and change directory to this sample's folder.
4. Run `npm install`
5. Run `npm start`
6. Open a web browser to https://localhost

## How it works

There are two ways to display in-app message content from Adobe Journey Optimizer.

[Alloy](https://experienceleague.adobe.com/docs/experience-platform/edge/home.html) is included on the page.
1. On page load the sendEvent command is used to fetch in-app message content.
   example :

`alloy("sendEvent", {
  renderDecisions: true,
  personalization {
   decisionContext: {
    color: "orange",
    action: "50off"
   }
  }
});`


2. Manually trigger the rulesets evaluation using `evaluateRulesets` command.
   example : 

 `alloy("evaluateRulesets", {
  renderDecisions: true,
   personalization {
     decisionContext: { color: "orange", action: "50off" }
   }
});
`

Additionally, you can set `personalizationStorageEnabled` to true for the storage of the personalization content in the browser local storage.
This will allow historical rule evaluation, for example show message only once or n number of times.
