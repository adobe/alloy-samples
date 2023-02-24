# Collecting link click information. 

## Overview
[Activity Map](https://experienceleague.adobe.com/docs/analytics/analyze/activity-map/activity-map.html?lang=en#:~:text=Activity%20Map%20is%20an%20Adobe,engagement%20of%20your%20web%20pages)  is a feature in Adobe Analytics that allows the customers to collect link activity on the page. 


## Configuration
Using Web SDK you can collect information about link click interaction from your page.
When configuring the Web SDK, there is `clickCollectionEnabled` configuration that enables or disables the link click tracking. 

NOTE: By default this configuration is enabled.

```javascript

alloy("configure", {
  ...
  clickCollectionEnabled: true
  ...
});
```

You can filter which link click interactions you want to track or augment the metadata that is being sent by using a callback function `onBeforeLinkClickSend` that is available in the `configure` command. 
When it is defined, Web SDK calls this function after it processes the link click interaction. When it's result is `false` or `undefined` the link click interaction event will not be sent to the Edge.

```javascript
alloy("configure", {
  ...
  onBeforeLinkClickSend: function(options) {
    // options.linkElement - the html element that has been clicked
    // options.xdm - the xdm object with the details that Web SDK generated from the current page
    // options.data - event data that can be augmented
},
clickCollectionEnabled: true
...
}); 
```
NOTE: by default Web SDK will trigger an event for every tracked link click interaction at the time it happens to capture that link click event in AEP Platform.


## Use custom code to send the Activity Map data with next page-view event

With AppMeasurements the Activity Map context data for exit links was sent immediately, while for the other link types the Activity Map context data was cached and sent with the next page view hit.
Using Web SDK the link click interactions generates a link click event(and an interact call) that will send data to the Edge.

If your implementation needs to cache the link click interactions(except exit links) and send them with next page view event, this can be accomplished using the `onBeforeEventSend` callback function.

We advise on using `onBeforeLinkClickSend` to filter the link that will be tracked for an easier migration and use `onBeforeEventSend` to cache the link click interaction and send it with next page view event.


Example:
In our website we don't want to track the links from the menu and some internal link. We will use `onBeforeLinkClickSend` to filter out those interactions like in the code below:

```javascript
function onBeforeLinkClickSend(options) {
  const { xdm, clickedElement } = options;
  
  
  // here we filter the link clicks that we want to be tracked
  return !(clickedElement.parentElement.classList.contains("doNotTrack") || xdm.web.webInteraction.region === "navbar");
}
```


This will instruct the WEB SDK which link click interactions needs to be tracked.
In `onBeforeEventSend` we will filter which link click interactions will be sent right away to the Edge and which we want to store in cache till next page-view event.
For example, when we have an exit link, we want to sent an event before the user leaves the context of the current page, but for the other link types we store the information in the local storage.

```javascript
if(xdm.web && xdm.web.webInteraction) {
  // we trigger the event so that it gets collected when it is an exit link
  if(xdm.web.webInteraction.type === "exit") {
    return true;
  }
  // all the rest of the interactions are stored in local storage or cookie and sent with next page view event
  const interaction = xdm.web.webInteraction;
  const activityMap = {};
  activityMap.page = document.location.href;
  activityMap.linkRegion = interaction.region;
  activityMap.linkName = interaction.name;
  addDataToLocalStorage(activityMap);
  return false;
}
   
 ```

Every implementation is different and it is important to send the previous page Activity Map context data with an event that is a page-view event. 
In our example we are sending the page-view data with `page-view` event type, so we will attach to that event the Activity Map context data. 


```javascript
if (xdm.eventType === "page-view") { // this type of events have represents page view hit
  const lastInteraction = getDataFromStorage();
  if (lastInteraction) {
    if(!xdm.web.webReferrer.URL) {
      xdm.web.webReferrer.URL = lastInteraction.page;
    }
    xdm.web.webReferrer.linkRegion = lastInteraction.linkRegion;
    xdm.web.webReferrer.linkName = lastInteraction.linkName;

    clearDataFromStorage();
  }
}
```


## Running the sample

<small> Prerequisite: [install node and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).</small>

To run this sample:

1. Clone the repository to your local machine.
2. Open a terminal and change directory to this sample's folder.
3. Run `npm install`
4. Run `npm start`
5. Open a web browser to [http://localhost:8080](http://localhost:8080)

