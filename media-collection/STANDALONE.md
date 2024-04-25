# Media Data Collection

## Overview

## Configuration

To be able to use Media Edge Data Collection via WEB SDK, it has to be configured via `configure` command. The `configure`
command call would look something like this:

```javascript
 alloy("configure", {
  streamingMedia: {
    channel: "video channel",
    playerName: "test player",
    version: "alloy 2.16.0"
  },
  ...
});
```

## Create a Media Session

There are few ways to implement Media Edge Data Collection:

- `automatic` - in this setup Web SDK takes care of the session
- `non-automatic` - in this setup customer is responsible for creating and populating the `xdm.mediaCollection` object.

### Automatic Media Session Handling

When using `automatic` setup for Media Edge Data Collection, WEB SDK will take care of session ID handling and keeping track of
player state. In order to be able to successfully use this setup WEB SDK needs to know a few details when dealing with
player events. To make sure that all this can be successfully wired WEB SDK exposes a new command named `createMediaSession`.

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

There are cases when customers will want to have full control. For this use case they would still use `createMediaSession`,
however since this is a setup where customers have full control, they will not provide the `playerId` and `onBeforeMediaEvent`,
and would provide just the value of player play head. One caveat is that customers will have to make sure that they keep track
of different details and ensure that all these details are sent in subsequent Media events.

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

## Send a Media Collection Event

In order send a Media Collection event a Media session ID is required. The Media session ID is retrieved by using the
`createMediaSession` command and it will be used in all the events send to the Edge.

### Sending Media Events for an automatic Media Session

When using the `automatic` setup, the WEB SDK will store the `playerId` in an internal cache. This cache contains details
like:

- session ID
- callback function
- media event specific data
- etc.

By leveraging `playerId` value, customer can trigger a Media event. WEB SDK internally will use the value of the `playerId`
to look up the necessary data, like session ID, event details to augment the event before sending it to the Edge.

```javascript
window.alloy("sendMediaEvent", {
  playerId: "episode-1",
  xdm: {
    eventType: "media.sessionComplete",
  },
});
```

### Sending Media Events for non-automatic Media Session

In the cases the customer wants to have full control, and they are using the `non-automatic` setup, They will have to provide
the `sessionId`, `playhead` and `qoeDataDetails` in the `xdm.mediaCollection`. However, they will have to manually trigger
the heartbeats aka `media.ping` events, that would send events with the current play head to the Edge. The recommended frequency
of heartbeat requests is between 10 seconds and 60 seconds.

This is how a custom call to `sendMediaEvent` would look like:

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

This is how a ping event would look like:

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

# Migration strategy

For existing Media Analytics customers that are looking for a migration plan, there is a new command named
`getMediaAnalyticsTracker`. This command will return `Media` object similar to the one found in Media Analytics JS library.

This is how the API can be accessed:

```javascript
const Media = await window.alloy("getMediaAnalyticsTracker", {});
const trackerInstance = Media.getInstance();
```

Here is an example on how to create a Media Object and trigger a Session Start.

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

More details on the Media Analytics JS library can be found here: https://adobe-marketing-cloud.github.io/media-sdks/reference/javascript_3x/APIReference.html
