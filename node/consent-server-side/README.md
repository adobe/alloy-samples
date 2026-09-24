# Node Server-side Consent Sample

## Overview

This sample demonstrates consent gating powered by
[`@adobe/alloy-node`](https://github.com/adobe/alloy/tree/main/packages/node),
the Adobe Experience Platform Web SDK's (alpha) Node.js entrypoint.

The server is configured with `defaultConsent: "out"`, so a visitor who has
never made a choice starts opted out. Clicking "Record Pageview" calls a
`/track` endpoint that runs `sendEvent()` followed by `getIdentity()` —
both are gated on consent the same way they would be in the browser SDK.
Neither throws when consent is declined; they just silently resolve
without an ECID, which is what `/track` checks for to report whether the
event actually went through. Clicking "Accept"/"Decline" calls a separate
`/consent` endpoint that runs `setConsent()`.

Consent lives in this visitor's cookies — the same ones identity does —
so a decision made on one request is honored by every later one, without
any server-side session state. Try it in this order to see both
directions:

1. Click "Record Pageview" first — it's blocked, since this visitor
   starts opted out.
2. Click "Accept", then "Record Pageview" again — it goes through, with a
   real ECID.
3. Click "Decline", then "Record Pageview" again — it's blocked again.

## Running the sample

<small>Prerequisite: [install node and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).</small>

1. In this folder, run `npm install`.
2. Run `npm start`.
3. Open a web browser to <http://localhost:4303>.

By default (see `.env`), this sample points at the same org/datastream as
this repo's own [`node/data-collection-server-side`](../data-collection-server-side)
sample — no personalization/decisioning involved, so any real org/datastream
works if you'd rather point it at your own.
