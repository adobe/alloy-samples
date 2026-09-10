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
//     the Edge is intercepted at the shield, while the server-to-server
//     request sails through (and never shows up in the browser at all).

const SVG_NS = "http://www.w3.org/2000/svg";

// Box-edge attach points (SVG viewBox coords); the lane supplies y.
const X = { browserR: 190, browserC: 110, serverL: 400, serverR: 560, edgeL: 772 };
const LANE_Y = { web: 124, node: 348 };

// The browser→Edge send arc, and where along it the blocker sits (t ≈ just
// outside the browser). Arc height clears the server box.
const SEND_WEB_ARC = 100;
const BLOCK_T = 0.12;

const KIND = {
  req: { color: "#1473e6", marker: "mk-blue" },
  res: { color: "#9aa0a6", marker: "mk-grey" },
  edge: { color: "#e0a500", marker: "mk-gold" },
  good: { color: "#3aa35a", marker: "mk-green" },
  load: { color: "#8b5cf6", marker: null },
  blocked: { color: "#d64545", marker: "mk-red" },
};

const PERS = {
  web: [
    { from: "browserR", to: "serverL", kind: "req", ms: 500, cap: "① Browser → server: request the page", tip: "The browser asks your server for the page. Nothing personalized yet." },
    { from: "serverL", to: "browserR", kind: "res", ms: 500, cap: "② Server → browser: page HTML loads", tip: "Your server returns HTML. The page starts to paint — still generic." },
    { from: "browserC", to: "browserC", kind: "load", ms: 700, cap: "③ Browser downloads &amp; runs the Web SDK (alloy.js)", tip: "The browser now downloads and executes alloy.js. Only after this can any Edge request happen." },
    { from: "browserR", to: "edgeL", kind: "edge", ms: 650, arc: 100, cap: "④ Web SDK → Edge: personalization request", tip: "Finally — several steps in — the Web SDK calls the Edge for personalization." },
    { from: "edgeL", to: "browserR", kind: "res", ms: 650, arc: 140, cap: "⑤ Edge → browser: offers render after paint (flicker)", tip: "Offers come back and get applied, but the page already painted → visible flicker." },
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
      "The visitor's action hits <span class='em'>your server</span>, which sends the event to the Edge — the request never leaves the browser.",
      "Data collection is <span class='em'>obfuscated from the end user</span>: no third-party request in their network tab, nothing for a blocker to drop.",
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
    { comment: "// On your server, when the visitor's action arrives — collect it server-side:" },
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
let stepIndex = 0; // personalization
let blockerOn = false; // send event
let reachedWeb = 0;
let reachedNode = 0;

/* ---------- geometry ---------- */

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const quadPoint = (p0, pc, p2, t) => {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * pc[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * pc[1] + t * t * p2[1],
  ];
};

// de Casteljau split of a quadratic at t: returns the shared point S and the
// two sub-curve controls (A for p0→S, B for S→p2).
const splitQuad = (p0, pc, p2, t) => {
  const a = lerp(p0, pc, t);
  const b = lerp(pc, p2, t);
  const s = lerp(a, b, t);
  return { a, b, s };
};

const pointAt = (hop, lane, t) => {
  const p0 = wp(hop.from, lane);
  const p2 = wp(hop.to, lane);
  if (hop.arc) {
    const pc = [(p0[0] + p2[0]) / 2, Math.min(p0[1], p2[1]) - hop.arc];
    return quadPoint(p0, pc, p2, t);
  }
  return lerp(p0, p2, t);
};

const hopPathD = (hop, lane) => {
  const p0 = wp(hop.from, lane);
  const p2 = wp(hop.to, lane);
  if (hop.arc) {
    const pc = [(p0[0] + p2[0]) / 2, Math.min(p0[1], p2[1]) - hop.arc];
    return `M ${p0[0]} ${p0[1]} Q ${pc[0]} ${pc[1]} ${p2[0]} ${p2[1]}`;
  }
  return `M ${p0[0]} ${p0[1]} L ${p2[0]} ${p2[1]}`;
};

// The point on the web send arc where the blocker intercepts it.
const blockPoint = () => {
  const p0 = wp("browserR", "web");
  const p2 = wp("edgeL", "web");
  const pc = [(p0[0] + p2[0]) / 2, Math.min(p0[1], p2[1]) - SEND_WEB_ARC];
  return splitQuad(p0, pc, p2, BLOCK_T);
};

/* ---------- primitives ---------- */

const pulse = (boxId) => {
  const box = el(boxId);
  box.classList.remove("ping");
  void box.offsetWidth;
  box.classList.add("ping");
};

const clearLane = (lane) => {
  el(`arrows-${lane}`).replaceChildren();
  el(`dot-${lane}`).classList.remove("show");
  el(`cap-${lane}`).innerHTML = "";
  el(`tip-${lane}`).hidden = true;
};

const drawArrow = (lane, d, color, { dashed = false, marker = null } = {}) => {
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", d);
  path.setAttribute("class", `arrow${dashed ? " dashed" : ""}`);
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-linecap", "round");
  if (marker) path.setAttribute("marker-end", `url(#${marker})`);
  el(`arrows-${lane}`).appendChild(path);
  requestAnimationFrame(() => path.classList.add("show"));
  return path;
};

const drawMark = (lane, [x, y], text, color) => {
  const t = document.createElementNS(SVG_NS, "text");
  t.setAttribute("x", x);
  t.setAttribute("y", y + 7);
  t.setAttribute("text-anchor", "middle");
  t.setAttribute("class", "block-x");
  if (color) t.setAttribute("fill", color);
  t.textContent = text;
  el(`arrows-${lane}`).appendChild(t);
};

// Animates the dot along `pointFn(t)` over `ms`, resolving when done. Bails
// early if a newer run supersedes it.
const animateAlong = (lane, color, ms, pointFn, token) =>
  new Promise((resolve) => {
    const dot = el(`dot-${lane}`);
    dot.setAttribute("fill", color);
    dot.classList.add("show");
    const start = performance.now();
    const tick = (now) => {
      if (token !== runToken) {
        resolve();
        return;
      }
      const t = Math.min(1, (now - start) / ms);
      const [x, y] = pointFn(t);
      dot.setAttribute("transform", `translate(${x} ${y})`);
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });

// A standard hop (straight or arc), with an arrowhead; pulses the Edge box on
// arrival there.
const animateHop = async (hop, lane, token) => {
  const kind = KIND[hop.kind];
  if (hop.kind !== "load") {
    drawArrow(lane, hopPathD(hop, lane), kind.color, { marker: kind.marker });
  }
  await animateAlong(lane, kind.color, hop.ms, (t) => pointAt(hop, lane, t), token);
  if (token !== runToken) return;
  if (hop.to === "edgeL") pulse(`box-edge-${lane}`);
};

// The blocked browser→Edge send: solid blue up to the shield, then grey
// dashed the rest of the way, ending in an ✖ at the Edge (never delivered).
const animateBlockedSend = async (token) => {
  const p0 = wp("browserR", "web");
  const p2 = wp("edgeL", "web");
  const { a, b, s } = blockPoint();
  drawArrow(
    "web",
    `M ${p0[0]} ${p0[1]} Q ${a[0]} ${a[1]} ${s[0]} ${s[1]}`,
    KIND.req.color,
  );
  await animateAlong("web", KIND.req.color, 420, (t) => quadPoint(p0, a, s, t), token);
  if (token !== runToken) return;
  el(`dot-web`).classList.remove("show");
  drawArrow(
    "web",
    `M ${s[0]} ${s[1]} Q ${b[0]} ${b[1]} ${p2[0]} ${p2[1]}`,
    KIND.res.color,
    { dashed: true },
  );
  drawMark("web", p2, "✖", KIND.blocked.color);
};

const showTip = (lane, hop, index) => {
  const tip = el(`tip-${lane}`);
  tip.innerHTML = `<div class="tip-step">Step ${index + 1}</div>${hop.tip}`;
  tip.hidden = false;
  const [mx, my] = pointAt(hop, lane, 0.5);
  const width = 232;
  tip.style.left = `${Math.max(4, Math.min(960 - width - 4, mx - width / 2))}px`;
  // Web lane above the hop, node lane below — measured height keeps the
  // pointer end near the arc even though the diagram no longer clips.
  const h = tip.offsetHeight;
  tip.style.top = lane === "web" ? `${my - h - 12}px` : `${my + 14}px`;
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
    if (token !== runToken) return;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 240));
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
    ? "Blocker is <b>on</b>: the Web SDK count stops climbing (every browser request is dropped), but the Node SDK count keeps going — those requests never even appear in this log."
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

const runWebSend = async (token) => {
  if (blockerOn) {
    el("cap-web").innerHTML =
      "Web SDK → Edge: request intercepted by the tracker blocker 🛡️";
    await animateBlockedSend(token);
    if (token !== runToken) return;
    logRequest(false);
    showDone("web", { tone: "warn", text: "Dropped — the browser request never reached the Edge." });
  } else {
    el("cap-web").innerHTML =
      "Web SDK → Edge: event sent from the browser (visible in the network tab)";
    await animateHop({ from: "browserR", to: "edgeL", arc: SEND_WEB_ARC, ms: 720, kind: "req" }, "web", token);
    if (token !== runToken) return;
    logRequest(true);
    reachedWeb += 1;
  }
};

const runNodeSend = async (token) => {
  el("cap-node").innerHTML = "① Browser → your server: the visitor's action";
  await animateHop({ from: "browserR", to: "serverL", ms: 500, kind: "req" }, "node", token);
  if (token !== runToken) return;
  el("cap-node").innerHTML =
    "② Server (Node SDK) → Edge: sendEvent, server-to-server";
  await animateHop({ from: "serverR", to: "edgeL", ms: 650, kind: "edge" }, "node", token);
  if (token !== runToken) return;
  reachedNode += 1;
};

const sendEvent = async () => {
  if (busy) return;
  busy = true;
  const token = runToken;
  el("btn-send").disabled = true;
  // Fresh arrows/captions each send; keep the log + tallies.
  el("arrows-web").replaceChildren();
  el("arrows-node").replaceChildren();
  el("dot-web").classList.remove("show");
  el("dot-node").classList.remove("show");

  await Promise.all([runWebSend(token), runNodeSend(token)]);

  if (token === runToken) updateReached();
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
  const shield = el("shield-web");
  if (on) {
    const { s } = blockPoint();
    shield.style.left = `${s[0] - 11}px`;
    shield.style.top = `${s[1] - 13}px`;
    shield.hidden = false;
  } else {
    shield.hidden = true;
  }
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
  if (key === "sendEvent") {
    clearLog();
    setBlocker(blockerOn); // reflect toggle state + place the shield
  }
};

document.querySelectorAll(".usecase-tab").forEach((tab) => {
  tab.addEventListener("click", () => selectUseCase(tab.dataset.usecase));
});

selectUseCase("personalization");
