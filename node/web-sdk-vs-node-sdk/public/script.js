/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

// Drives the interactive explainer. No Alloy, no network — everything here is
// illustrative. Two very different interactions:
//   • Personalization: step through the flow one hop at a time, with a tooltip
//     at each step, so you can watch the browser path pay for page-load +
//     script-load before it can even call the Edge.
//   • Send Event: fire events with a mock "browser Network tab" log and a
//     tracker-blocker toggle — with the blocker on, the browser's request to
//     the Edge is intercepted, while the server-to-server request sails
//     through (and never shows up in the browser at all).

const SVG_NS = "http://www.w3.org/2000/svg";

// Box-edge attach points (SVG viewBox coords); the lane supplies y.
const X = { browserR: 190, browserC: 110, serverL: 400, serverR: 560, edgeL: 772 };
const LANE_Y = { web: 124, node: 348 };

const KIND = {
  req: { color: "#1473e6", marker: "mk-blue" },
  res: { color: "#9aa0a6", marker: "mk-grey" },
  edge: { color: "#e0a500", marker: "mk-gold" },
  good: { color: "#3aa35a", marker: "mk-green" },
  load: { color: "#8b5cf6", marker: null },
  blocked: { color: "#d64545", marker: "mk-red" },
};

// Personalization flow, hop by hop. `cap` is the one-line caption; `tip` is
// the richer tooltip shown at that step.
const PERS = {
  web: [
    { from: "browserR", to: "serverL", kind: "req", ms: 500, cap: "① Browser → server: request the page", tip: "The browser asks your server for the page. Nothing personalized yet." },
    { from: "serverL", to: "browserR", kind: "res", ms: 500, cap: "② Server → browser: page HTML loads", tip: "Your server returns HTML. The page starts to paint — still generic." },
    { from: "browserC", to: "browserC", kind: "load", ms: 700, cap: "③ Browser downloads &amp; runs the Web SDK (alloy.js)", tip: "The browser now downloads and executes alloy.js. Only after this can any Edge request happen." },
    { from: "browserR", to: "edgeL", kind: "edge", ms: 650, arc: 70, cap: "④ Web SDK → Edge: personalization request", tip: "Finally — several steps in — the Web SDK calls the Edge for personalization." },
    { from: "edgeL", to: "browserR", kind: "res", ms: 650, arc: 104, cap: "⑤ Edge → browser: offers render after paint (flicker)", tip: "Offers come back and get applied, but the page already painted → visible flicker." },
  ],
  webDone: { tone: "warn", text: "Personalized content appears late — after the page already painted (flicker)." },
  node: [
    { from: "browserR", to: "serverL", kind: "req", ms: 500, cap: "① Browser → your server: request the page", tip: "The browser asks your server for the page — same first step as the Web SDK." },
    { from: "serverR", to: "edgeL", kind: "edge", ms: 650, cap: "② Server (Node SDK) → Edge: personalize, right away", tip: "Your server calls the Edge for personalization immediately, while it builds the page — no browser script needed." },
    { from: "edgeL", to: "serverR", kind: "res", ms: 650, cap: "③ Edge → server: offers", tip: "The Edge returns offers to your server." },
    { from: "serverL", to: "browserR", kind: "good", ms: 500, cap: "④ Server → browser: fully personalized page", tip: "The server sends back a page that's already personalized. No client round trip, no flicker." },
  ],
  nodeDone: { tone: "good", text: "Fully personalized page delivered in fewer steps — already rendered, no flicker." },
};

const COPY = {
  personalization: {
    web: [
      "The browser can't even start the Edge request until it has <span class='em'>(1) fetched the page</span> and <span class='em'>(2) downloaded and run the Web SDK</span> — those happen first, in sequence.",
      "Only then does it call the Edge, and the offer renders <span class='em'>after the page already painted</span> → flicker.",
      "Great for rich client-side rendering, click tracking, SPA views.",
    ],
    node: [
      "Your server fires the Edge request <span class='em'>the moment the page is requested</span> — in parallel with building the page, before any browser script exists.",
      "The page is delivered <span class='em'>already personalized</span>: no extra round trip, no waiting on script load, no flicker.",
      "Hand the resolved <span class='em'>propositions</span> to the page; the client just calls <code>applyPropositions</code>.",
    ],
  },
  sendEvent: {
    web: [
      "Request leaves the <span class='em'>end user's browser</span>, so it's visible to — and blockable by — extensions and ad blockers.",
      "It shows up in the visitor's own network tab: data collection <span class='em'>isn't obfuscated</span> from them.",
      "Great for rich client-side rendering, click tracking, SPA views.",
    ],
    node: [
      "Request leaves <span class='em'>your server</span>, never the browser — nothing for a client-side blocker to see or drop.",
      "Data collection is <span class='em'>obfuscated from the end user</span>: no third-party request in their network tab.",
      "Authenticated server-to-server call (OAuth) straight to the Edge Server API.",
    ],
  },
};

const CODE = {
  personalization: [
    { comment: "// On your server, per request — resolve offers before you render:" },
    { key: "const", rest: " request = alloy.forRequest({ cookie });" },
    { key: "const", rest: " { propositions } = ", key2: "await", rest2: " request.sendEvent({" },
    { rest: '  xdm: { eventType: "decisioning.propositionFetch" },' },
    { rest: '  personalization: { surfaces: ["web://example.com/"] },' },
    { rest: "});" },
    { comment: "// → serialize `propositions` into the HTML you send back" },
  ],
  sendEvent: [
    { comment: "// On your server, per request — collect data the browser never sees:" },
    { key: "const", rest: " request = alloy.forRequest({ cookie });" },
    { key: "await", rest: " request.sendEvent({" },
    { rest: '  xdm: { eventType: "commerce.purchases", /* … */ },' },
    { rest: "});" },
    { comment: "// → never touches the browser; blockers can't see it" },
  ],
};

const el = (id) => document.getElementById(id);
const wp = (name, lane) => [X[name], LANE_Y[lane]];

let currentUseCase = "personalization";
let runToken = 0;
let busy = false;
// personalization
let stepIndex = 0;
// send event
let blockerOn = false;
let reachedWeb = 0;
let reachedNode = 0;

/* ---------- geometry ---------- */

const pointAt = (hop, lane, t) => {
  const [ax, ay] = wp(hop.from, lane);
  const [bx, by] = wp(hop.to, lane);
  if (hop.arc) {
    const cx = (ax + bx) / 2;
    const cy = Math.min(ay, by) - hop.arc;
    const u = 1 - t;
    return [u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by];
  }
  return [ax + (bx - ax) * t, ay + (by - ay) * t];
};

const hopPathD = (hop, lane) => {
  const [ax, ay] = wp(hop.from, lane);
  const [bx, by] = wp(hop.to, lane);
  if (hop.arc) {
    const cx = (ax + bx) / 2;
    const cy = Math.min(ay, by) - hop.arc;
    return `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;
  }
  return `M ${ax} ${ay} L ${bx} ${by}`;
};

/* ---------- primitives ---------- */

const pulse = (boxId) => {
  const box = el(boxId);
  box.classList.remove("ping");
  // reflow to restart the animation
  void box.offsetWidth;
  box.classList.add("ping");
};

const clearLane = (lane) => {
  el(`arrows-${lane}`).replaceChildren();
  el(`dot-${lane}`).classList.remove("show");
  el(`cap-${lane}`).innerHTML = "";
  el(`tip-${lane}`).hidden = true;
};

// Animates the dot along one hop, drawing its arrow. Resolves when done (or at
// stopAt for a blocked hop). Bails out early if a newer run supersedes it.
const animateHop = (hop, lane, token) =>
  new Promise((resolve) => {
    const kind = KIND[hop.kind];
    const dot = el(`dot-${lane}`);
    dot.setAttribute("fill", kind.color);
    dot.classList.add("show");

    if (hop.kind !== "load") {
      const arrow = document.createElementNS(SVG_NS, "path");
      arrow.setAttribute("d", hopPathD(hop, lane));
      arrow.setAttribute("class", `arrow${hop.stopAt ? " dashed" : ""}`);
      arrow.setAttribute("stroke", kind.color);
      if (kind.marker && !hop.stopAt) {
        arrow.setAttribute("marker-end", `url(#${kind.marker})`);
      }
      el(`arrows-${lane}`).appendChild(arrow);
      requestAnimationFrame(() => arrow.classList.add("show"));
    }

    const end = hop.stopAt ?? 1;
    const start = performance.now();
    const tick = (now) => {
      if (token !== runToken) {
        resolve();
        return;
      }
      const t = Math.min(end, (now - start) / hop.ms);
      const [x, y] = pointAt(hop, lane, t);
      dot.setAttribute("transform", `translate(${x} ${y})`);
      if (t < end) {
        requestAnimationFrame(tick);
        return;
      }
      if (hop.stopAt) {
        const [bx, by] = pointAt(hop, lane, hop.stopAt);
        const block = document.createElementNS(SVG_NS, "text");
        block.setAttribute("x", bx);
        block.setAttribute("y", by + 7);
        block.setAttribute("text-anchor", "middle");
        block.setAttribute("class", "block-x");
        block.textContent = "🛑";
        el(`arrows-${lane}`).appendChild(block);
        dot.classList.remove("show");
      } else if (hop.to === "edgeL") {
        pulse(`box-edge-${lane}`);
      }
      resolve();
    };
    requestAnimationFrame(tick);
  });

const showTip = (lane, hop, index) => {
  const tip = el(`tip-${lane}`);
  tip.innerHTML = `<div class="tip-step">Step ${index + 1}</div>${hop.tip}`;
  tip.hidden = false;
  // Anchor near the hop midpoint; web lane above the arrow, node below.
  const [mx, my] = pointAt(hop, lane, 0.5);
  const width = 232;
  const left = Math.max(6, Math.min(960 - width - 6, mx - width / 2));
  tip.style.left = `${left}px`;
  tip.style.top = lane === "web" ? `${my - 92}px` : `${my + 16}px`;
};

const showDone = (lane, done) => {
  el(`cap-${lane}`).innerHTML = `<span class="done ${done.tone}">${done.text}</span>`;
  el(`dot-${lane}`).classList.remove("show");
};

/* ---------- personalization: step-through ---------- */

const persTotalSteps = () => Math.max(PERS.web.length, PERS.node.length);

const updateStepHint = () => {
  const hint = el("step-hint");
  if (!hint) return;
  const total = persTotalSteps();
  hint.textContent =
    stepIndex >= total
      ? "Done — compare where each path ended up."
      : `Step ${stepIndex} of ${total} — click “Next step”.`;
};

const nextStep = async () => {
  if (busy || stepIndex >= persTotalSteps()) return;
  busy = true;
  const token = runToken;
  const i = stepIndex;
  const anims = [];

  ["web", "node"].forEach((lane) => {
    const hop = PERS[lane][i];
    if (hop) {
      el(`cap-${lane}`).innerHTML = hop.cap;
      showTip(lane, hop, i);
      anims.push(animateHop(hop, lane, token));
    } else {
      el(`tip-${lane}`).hidden = true;
    }
  });

  await Promise.all(anims);
  if (token === runToken) {
    if (PERS.web[i] && i === PERS.web.length - 1) showDone("web", PERS.webDone);
    if (PERS.node[i] && i === PERS.node.length - 1) showDone("node", PERS.nodeDone);
    stepIndex += 1;
    updateStepHint();
    el("btn-next").disabled = stepIndex >= persTotalSteps();
  }
  busy = false;
};

const autoPlay = async () => {
  if (busy) return;
  el("btn-auto").disabled = true;
  while (stepIndex < persTotalSteps()) {
    const token = runToken;
    // eslint-disable-next-line no-await-in-loop
    await nextStep();
    if (token !== runToken) return; // reset/tab-switch cancelled us
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 220));
  }
};

const resetPers = () => {
  runToken += 1;
  busy = false;
  stepIndex = 0;
  clearLane("web");
  clearLane("node");
  el("btn-next").disabled = false;
  el("btn-auto").disabled = false;
  updateStepHint();
};

/* ---------- send event: blocker + mock network log ---------- */

const updateReached = () => {
  el("reached-web").textContent = reachedWeb;
  el("reached-node").textContent = reachedNode;
  el("se-note").innerHTML = blockerOn
    ? "Blocker is <b>on</b>: the Web SDK count stops climbing (every browser request is dropped), but the Node SDK count keeps going — those requests never even appear here."
    : "The Node SDK requests never show up in this log — they're sent server-to-server, so neither the visitor nor their blocker can see them. Try turning the blocker on.";
};

const logRequest = (ok) => {
  const list = el("se-log-list");
  const empty = list.querySelector(".se-empty");
  if (empty) empty.remove();
  const li = document.createElement("li");
  li.className = ok ? "ok" : "blocked";
  li.innerHTML = `<span class="req-url">POST edge.adobedc.net/ee/v2/interact</span><span class="req-status">${ok ? "200 OK" : "(blocked)"}</span>`;
  list.prepend(li);
};

const sendEvent = async () => {
  if (busy) return;
  busy = true;
  const token = runToken;
  el("btn-send").disabled = true;

  const webHop = {
    from: "browserR",
    to: "edgeL",
    arc: 70,
    ms: 700,
    kind: blockerOn ? "blocked" : "req",
    stopAt: blockerOn ? 0.45 : undefined,
  };
  const nodeHop = { from: "serverR", to: "edgeL", ms: 650, kind: "edge" };

  el("cap-web").innerHTML = blockerOn
    ? "Web SDK → Edge: request cancelled by the tracker blocker 🛑"
    : "Web SDK → Edge: event sent from the browser (visible in the network tab)";
  el("cap-node").innerHTML =
    "Node SDK → Edge: event sent server-to-server (invisible to the browser)";

  await Promise.all([
    animateHop(webHop, "web", token).then(() => {
      if (token !== runToken) return;
      logRequest(!blockerOn);
      if (!blockerOn) reachedWeb += 1;
    }),
    animateHop(nodeHop, "node", token).then(() => {
      if (token !== runToken) return;
      reachedNode += 1;
    }),
  ]);

  if (token === runToken) {
    updateReached();
    if (blockerOn) {
      showDone("web", { tone: "warn", text: "Dropped — the browser request never reached the Edge." });
    }
  }
  busy = false;
  el("btn-send").disabled = false;
};

const clearLog = () => {
  runToken += 1;
  busy = false;
  reachedWeb = 0;
  reachedNode = 0;
  clearLane("web");
  clearLane("node");
  el("se-log-list").innerHTML =
    '<li class="se-empty">No requests yet — click “Send an event”.</li>';
  updateReached();
  el("btn-send").disabled = false;
};

const setBlocker = (on) => {
  blockerOn = on;
  el("shield-web").hidden = !on;
  updateReached();
};

/* ---------- controls + use-case wiring ---------- */

const renderControls = () => {
  const controls = el("controls");
  if (currentUseCase === "personalization") {
    controls.innerHTML = `
      <button class="btn" id="btn-next">▶ Next step</button>
      <button class="btn ghost" id="btn-auto">Auto-play</button>
      <button class="btn ghost" id="btn-reset">↻ Reset</button>
      <span class="run-hint" id="step-hint"></span>`;
    el("btn-next").addEventListener("click", nextStep);
    el("btn-auto").addEventListener("click", autoPlay);
    el("btn-reset").addEventListener("click", resetPers);
    updateStepHint();
  } else {
    controls.innerHTML = `
      <label class="switch">
        <input type="checkbox" id="blocker-toggle" />
        <span class="slider"></span>
        <span class="switch-label">🛡️ Tracker blocker</span>
      </label>
      <button class="btn" id="btn-send">Send an event</button>
      <button class="btn ghost" id="btn-clear">Clear</button>`;
    const toggle = el("blocker-toggle");
    toggle.checked = blockerOn;
    toggle.addEventListener("change", (e) => setBlocker(e.target.checked));
    el("btn-send").addEventListener("click", sendEvent);
    el("btn-clear").addEventListener("click", clearLog);
  }
};

const renderCodeLine = (line) => {
  if (line.comment) return `<span class="c-comment">${line.comment}</span>`;
  let out = "";
  if (line.key) out += `<span class="c-key">${line.key}</span>`;
  if (line.rest) out += line.rest;
  if (line.key2) out += `<span class="c-key">${line.key2}</span>`;
  if (line.rest2) out += line.rest2;
  return out;
};

const renderSidePanels = () => {
  el("vp-web").innerHTML = COPY[currentUseCase].web.map((i) => `<li>${i}</li>`).join("");
  el("vp-node").innerHTML = COPY[currentUseCase].node.map((i) => `<li>${i}</li>`).join("");
  el("code-hint").innerHTML = CODE[currentUseCase].map(renderCodeLine).join("\n");
};

const selectUseCase = (key) => {
  runToken += 1;
  busy = false;
  currentUseCase = key;
  clearLane("web");
  clearLane("node");
  el("shield-web").hidden = true;
  el("se-panel").hidden = key !== "sendEvent";

  document.querySelectorAll(".usecase-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.usecase === key);
  });

  if (key === "personalization") {
    stepIndex = 0;
  } else {
    reachedWeb = 0;
    reachedNode = 0;
  }

  renderControls();
  renderSidePanels();
  if (key === "sendEvent") clearLog();
};

document.querySelectorAll(".usecase-tab").forEach((tab) => {
  tab.addEventListener("click", () => selectUseCase(tab.dataset.usecase));
});

selectUseCase("personalization");
