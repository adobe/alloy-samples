# Web SDK vs. Node SDK — Interactive Explainer

## Overview

An interactive, visual explainer for _why_ you'd reach for
[`@adobe/alloy-node`](https://github.com/adobe/alloy/tree/main/packages/node)
(the server-side Node.js entrypoint) instead of the browser Web SDK — and
what changes when the Edge Network request originates from your server
rather than the end user's browser.

Unlike the other samples in this folder, this one makes **no real Edge
Network calls** and needs **no credentials** — it's a self-contained diagram
meant for walking an audience through the two key use cases:

- **Personalization** — resolving offers server-side, _before_ the page is
  sent, so the page arrives already personalized (no flicker, no lag from a
  client-side round trip after load).
- **Send Event** — collecting data server-to-server, so the request never
  touches the browser: invisible to the end user and immune to client-side
  ad/tracker blockers.

Each use case is interactive in its own way:

- **Personalization** — click **Next step** to walk the flow one hop at a
  time, with a tooltip at each stage. You can watch the browser path pay for
  a page round trip _and_ a Web SDK script download before it can even make
  its Edge request, while the server path fires the Edge request immediately
  and finishes in fewer steps. (There's also an **Auto-play**.)
- **Send Event** — hit **Send an event** and watch a mock "browser Network
  tab" log fill in. Flip the **🛡️ Tracker blocker** toggle: with it on, the
  browser's request to the Edge is intercepted and never arrives, while the
  server-to-server request sails through — and never shows up in the
  browser's log at all. A running tally shows how many events actually
  reached the Edge via each path.

## Running the sample

<small>Prerequisite: [install node and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).</small>

There are no dependencies to install — the tiny static server in
`src/server.js` uses only Node's built-in modules.

1. In this folder, run `npm start`.
2. Open a web browser to <http://localhost:4400>.

You can also just open `public/index.html` directly in a browser — the page
is fully static.

## What it illustrates

| | Web SDK (browser) | Node SDK (server) |
| :-- | :-- | :-- |
| Request originates in | the end user's browser | your server |
| Visible to ad/tracker blockers | yes | no |
| Personalization timing | after the page starts loading (round trip → flicker) | before the HTML is sent (no flicker) |
| Endpoint | `edge.adobedc.net` (v1) | `server.adobedc.net` (authenticated v2) |

The code snippet at the bottom of the page shows the matching
`@adobe/alloy-node` call for the selected use case — `forRequest()` plus
`sendEvent()`, resolving personalization or collecting data entirely on the
server.

## See it for real

This page is illustrative. For runnable, credentialed Node SDK samples that
actually hit the Edge Network, see the siblings in this folder:

- [`node/personalization-hybrid`](../personalization-hybrid) — resolve
  offers server-side, render them client-side.
- [`node/personalization-server-side`](../personalization-server-side) —
  resolve and render entirely server-side.
- [`node/data-collection-server-side`](../data-collection-server-side) —
  server-to-server `sendEvent()`.
- [`node/consent-server-side`](../consent-server-side) — consent, server-side.
