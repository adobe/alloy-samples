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

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import Handlebars from "handlebars";

import { createInstance } from "@adobe/alloy-node";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const {
  ORG_ID,
  DATASTREAM_ID,
  EDGE_DOMAIN,
  EDGE_BASE_PATH,
  DECISION_SCOPE,
  SURFACE,
  PORT = 4300,
} = process.env;

const PERSONALIZATION_TARGET_SELECTOR = "#personalization-target";

Handlebars.registerHelper(
  "safeString",
  (value) => new Handlebars.SafeString(value),
);
const templateCache = new Map();
const loadTemplate = (name) => {
  if (!templateCache.has(name)) {
    templateCache.set(
      name,
      Handlebars.compile(
        fs.readFileSync(
          path.join(__dirname, "templates", `${name}.handlebars`),
          "utf8",
        ),
      ),
    );
  }
  return templateCache.get(name);
};

// A hand-built stand-in for real personalization content, used only when
// Edge returns nothing for DECISION_SCOPE (e.g. no live AJO/Target activity
// is configured for it, which is the default — see .env). Shaped as a real
// `setHtml` DOM-action proposition, so the client renders it exactly the
// way it would render genuine content: by calling `applyPropositions`, with
// no custom rendering code of its own.
const createMockProposition = () => ({
  id: "mock-proposition-1",
  scope: DECISION_SCOPE,
  scopeDetails: { decisionProvider: "mock" },
  items: [
    {
      id: "mock-item-1",
      // DOM_ACTION, not HTML_CONTENT_ITEM: applyPropositions only keeps
      // HTML_CONTENT_ITEM items when the caller separately supplies
      // selector/type via its own `metadata` option (for a different use
      // case — applying the same content to a different element than
      // where it was fetched for); DOM_ACTION items carry selector/type
      // in `data` directly, which is what we want here.
      schema: "https://ns.adobe.com/personalization/dom-action",
      data: {
        type: "setHtml",
        selector: PERSONALIZATION_TARGET_SELECTOR,
        content: `
          <h3>🎉 You're seeing mock personalization content</h3>
          <p>
            The server called <code>@adobe/alloy-node</code>'s
            <code>sendEvent()</code>, requesting decisions for decision
            scope <code>${DECISION_SCOPE}</code> from the Edge Network.
            However, no live AJO/Target activity is configured for that scope,
            so the server fell back to this hardcoded proposition. Point
            <code>DECISION_SCOPE</code> in <code>.env</code> at a configured
            activity or experience (see <code>README.md<code> for details)
            to see live content.
          </p>
        `,
      },
    },
  ],
});

// Express's res.cookie() serializes via the `cookie` package, which
// strictly enforces the RFC 6265 cookie-name token grammar — and rejects
// Alloy's own legacy `AMCV_...@AdobeOrg` cookie name because of the `@`,
// even though every real browser accepts it. Build the Set-Cookie header
// by hand instead of going through res.cookie()'s strict validation.
const serializeSetCookie = (
  name,
  value,
  { domain, path: cookiePath = "/", expires, secure, sameSite } = {},
) => {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${cookiePath}`];
  if (domain) parts.push(`Domain=${domain}`);
  if (expires instanceof Date) {
    parts.push(`Expires=${expires.toUTCString()}`);
  } else if (typeof expires === "number") {
    // Legacy AMCV-style expiry is expressed in days, not milliseconds.
    parts.push(`Max-Age=${Math.floor(expires * 24 * 60 * 60)}`);
  }
  if (secure) parts.push("Secure");
  if (sameSite) parts.push(`SameSite=${sameSite}`);
  return parts.join("; ");
};

// Adapts a single Express request/response into the CookieService shape
// @adobe/alloy-node expects, so identity is read from and written to this
// visitor's real cookies instead of an in-memory default.
const createExpressCookieService = (req, res) => ({
  get: (name) => req.cookies[name],
  getAll: () => req.cookies,
  set: (name, value, options) => {
    res.append("Set-Cookie", serializeSetCookie(name, value, options));
    return value;
  },
  remove: (name) => {
    res.append("Set-Cookie", serializeSetCookie(name, "", { expires: new Date(0) }));
  },
  withConverter: () => createExpressCookieService(req, res),
});

// configure() runs once, at startup. Everything request-scoped happens via
// forRequest() inside the route handler below.
const alloy = createInstance();
await alloy.configure({
  orgId: ORG_ID,
  datastreamId: DATASTREAM_ID,
  edgeDomain: EDGE_DOMAIN,
  edgeBasePath: EDGE_BASE_PATH,
  debugEnabled: false,
});

// Requests decisions for this visitor's request-scoped instance, falling
// back to the mock proposition when Edge returns nothing.
const fetchPersonalization = async (request) => {
  const sendEventOptions = {
    xdm: { eventType: "decisioning.propositionFetch" },
    decisionScopes: [DECISION_SCOPE],
  };
  if (SURFACE) {
    sendEventOptions.personalization = { surfaces: [SURFACE] };
  }

  let propositions = [];
  let error;
  try {
    ({ propositions } = await request.sendEvent(sendEventOptions));
  } catch (e) {
    error = e.message;
  }

  const usedMock = !error && propositions.length === 0;
  if (usedMock) {
    propositions = [createMockProposition()];
  }

  return { propositions, usedMock, error };
};

const app = express();
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "..", "public")));

// Renders the page shell only — no personalization request is made yet.
// That happens on demand, when the client clicks the "Get personalized
// content" button (see public/script.js), against /personalize below.
app.get("/", (req, res) => {
  res.set("Content-Type", "text/html");
  res.status(200).send(
    loadTemplate("index")({
      pageTitle: "Node Hybrid Personalization Sample",
      orgId: ORG_ID,
      datastreamId: DATASTREAM_ID,
      decisionScope: DECISION_SCOPE,
    }),
  );
});

// Called client-side by the "Get personalized content" button. Each click
// is its own request, so forRequest() is created fresh here too — reusing
// this same visitor's real cookies, read from *this* request.
app.get("/personalize", async (req, res) => {
  const request = alloy.forRequest({
    cookie: createExpressCookieService(req, res),
    // Express's req already has a .headers object shaped the way Node's
    // Context component expects — forwards this visitor's real
    // User-Agent/client hints to Edge Network and derives
    // web.webPageDetails.URL from the Referer header, no adapter needed.
    request: req,
  });

  const { propositions, usedMock, error } = await fetchPersonalization(
    request,
  );

  if (error) {
    res.status(502).json({ error });
    return;
  }

  res.json({ propositions, usedMock });
});

app.listen(PORT, () => {
  console.log(
    `Node hybrid personalization sample listening on http://localhost:${PORT}`,
  );
});
