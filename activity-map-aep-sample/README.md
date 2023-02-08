# Collecting link click information. 

## Overview
Activity Map is a feature in Adobe Analytics that allows the customers to detect which part of the page had more interactions. Here you can find more informations about it:[Activity Map](https://experienceleague.adobe.com/docs/analytics/analyze/activity-map/activity-map.html?lang=en#:~:text=Activity%20Map%20is%20an%20Adobe,engagement%20of%20your%20web%20pages).

Using Web SDK you can collect information about link click interaction on your page. When configuring the Web SDK, there is `clickCollectionEnabled` configuration that enables or disables the link click tracking. 

Note: By default this configuration is enabled.

```javascript
 alloy("configure", {
    ...
    clickCollectionEnabled: true
    ...
    }
```

You can filter which link click interactions that you want to track or augment the metadata that is being captured by using a callback function `onBeforeLinkClickSend`. This function can be defined in the `configure` command, similar to the `onBeforeEventSend` callback.
If it is defined, Web SDK calls this function after it processes the link click interaction. If it's result is false or undefined then the link click interaction event is canceled. 

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

