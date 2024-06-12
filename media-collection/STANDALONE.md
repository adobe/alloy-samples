# Media Data Collection

## Overview
To use the streamingMedia component of Web SDK, you must meet the following prerequisites:

- Before you can send Streaming Media data to Edge, first complete the steps in [Install Streaming Media with Experience Platform Edge](https://experienceleague.adobe.com/en/docs/media-analytics/using/implementation/edge-recommended/media-edge-sdk/implementation-edge).
- Make sure you have access to Adobe Experience Platform and/or Adobe Analytics.
- You must use Web SDK version 2.20.0 or later. See the [Web SDK installation overview](https://experienceleague.adobe.com/en/docs/experience-platform/web-sdk/install/overview?lang=en) to learn how to install the latest version.
- Enable the [Streaming Media](https://experienceleague.adobe.com/en/docs/experience-platform/datastreams/configure?lang=en) option for the datastream you are using.
- Ensure that the schema used by your datastream includes the Media Collection schema fields.

## Configuration

To use Media Edge Data Collection via WEB SDK, it needs to be configured via configure command. Here is an example of how the configure command call would look:
```javascript
 alloy("configure", {
  streamingMedia: {
    channel: "video channel", 
    playerName: "test player",
    version: "alloy 2.16.0",
    mainPingInterval: 10,
    adPingInterval: 10
  },
  ...
});
```

`channel` - is the channel name that will be used for all the Media sessions. This is a required field when using Streaming Media feature.
`playerName` - is the name of the player that will be used in all the Media sessions. This is a required field when using Streaming Media feature.
`version` - is the version of the player that will be used in the Media sessions.
`mainPingInterval` - is the interval at which the main ping events will be sent.
`adPingInterval` - is the interval at which the ad ping events will be sent.

## Create a Media Session

There are two ways to implement Media Edge Data Collection:

- `automatic` - in this setup Web SDK takes care of the session
- `non-automatic` - in this setup customer is responsible for creating and populating the `xdm.mediaCollection` object.

### Automatic Media Session Handling

When using `automatic` setup for Media Edge Data Collection, WEB SDK will take care of session ID handling and keeping track of
player state. Here is an example of how to create a media session:

```javascript
alloy("createMediaSession", {
  playerId: "episode-1", // an unique identifier for your media session
  xdm: {
    mediaCollection: {
      sessionDetails: {
        ...
      }
    }
  },
  getPlayerDetails: ({ playerId }) => {
    const getPlayhead = getVideoPlayedPlayhead(videoPlayer);
    return {
      playhead: getPlayhead
    };
  }
});
```

Here are the `createMediaSession` parameters:

- `playerId` - is the identifier of your Media Session
- `xdm.mediaCollection.sessionDetails` - are the Media Session details
- `getPlayerDetails` - the callback function that should be defined by the customer, that will return `playhead` (current
  state of player play head) and `qoeDataDetails`(Quality of Experience details). This callback function will be called
  before every Media event to augment it with relevant details.

### Non-automatic Media Session Handling

For cases when customers want to have full control, they would still use createMediaSession, but they will not provide the `playerId` and `getPlayerDetails`, and would provide just the value of player play head. Here is an example:
```javascript
const mediaSessionPromise = window.alloy("createMediaSession", {
  xdm: {
    mediaCollection: {
      sessionDetails: {
       ...
      },
      playhead: 0
    }
  }
});
```

## Sending Media Collection Events

To send a Media Collection event, a Media session ID is necessary. This ID is obtained by using the `createMediaSession` command and is used in all events sent to the Edge.

### Automatic Media Session: Sending Media Events

In an `automatic` setup, the WEB SDK stores the `playerId` in an internal cache. This cache holds various details such as:

- Session ID
- Callback function
- Media event-specific data

By using the `playerId` value, you can trigger a Media event. The WEB SDK will internally use the `playerId` value to fetch the necessary data, like session ID and event details, to enrich the event before sending it to the Edge.

Here's an example of how to send a media event in an automatic session:

```javascript
window.alloy("sendMediaEvent", {
  playerId: "episode-1",
  xdm: {
    eventType: "media.sessionComplete",
  },
});
```

### Non-automatic Media Session: Sending Media Events

In scenarios where you want full control and are using the `non-automatic` setup, you will need to provide the `sessionId`, `playhead`, and `qoeDataDetails` in the `xdm.mediaCollection`. Additionally, you will need to manually trigger the heartbeats (also known as `media.ping` events) that send events with the current playhead to the Edge. The recommended frequency for heartbeat requests is between 10 and 60 seconds.

Here's an example of how to send a media event in a non-automatic session:

```javascript
mediaSessionPromise.then((sessionId) => {
  window.alloy("sendMediaEvent", {
    xdm: {
      eventType: "media.play",
      mediaCollection: {
        playhead: 10,
        sessionID: sessionId,
      },
    },
  });
});
```

And this is how a ping event would look like:

```javascript
mediaSessionPromise.then((sessionId) => {
  window.alloy("sendMediaEvent", {
    xdm: {
      eventType: "media.ping",
      mediaCollection: {
        playhead: 10,
        sessionID: sessionId,
      },
    },
  });
});
```

Please note that in a non-automatic session, you are responsible for managing the session and triggering the necessary events.

# Migration Strategy

For customers who are implementing Streaming Media using [MediaJS](https://adobe-marketing-cloud.github.io/media-sdks/reference/javascript_3x/APIReference.html) and are considering a migration plan, a new command, `getMediaAnalyticsTracker`, is available. This command returns a `Media` object that is similar to the one found in the [Streaming Media JS library](https://adobe-marketing-cloud.github.io/media-sdks/reference/javascript_3x/APIReference.html).

## Accessing the API

You can access the API as shown in the following example:

```javascript
const Media = await window.alloy("getMediaAnalyticsTracker", {});
const trackerInstance = Media.getInstance();
```

In this example, `getMediaAnalyticsTracker` is an asynchronous function that returns a `Media` object. The `getInstance` method is then called on the `Media` object to get an instance of the Media Analytics tracker.

## Creating a Media Object and Initiating a Session Start

Here's an example of how to create a Media Object and initiate a Session Start:

```javascript
const mediaInfo = Media.createMediaObject(
  "VideoName",
  "player video",
  60,
  Media.StreamType.VOD,
  Media.MediaType.Video
);

const contextData = {
  isUserLoggedIn: "false",
  tvStation: "Sample TV station",
  programmer: "Sample programmer",
  assetID: "/uri-reference",
};

// Set standard Video Metadata
contextData[Media.VideoMetadataKeys.Episode] = "Sample Episode";
contextData[Media.VideoMetadataKeys.Show] = "Sample Show";

trackerInstance.trackSessionStart(mediaInfo, contextData);
```

In this example, a media object is created using the `createMediaObject` method. The `trackSessionStart` method is then called on the tracker instance to initiate a session start. The `contextData` object is used to provide additional context for the media session.
