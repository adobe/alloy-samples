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

const { ORG_ID, DATASTREAM_ID, EDGE_DOMAIN, EDGE_BASE_PATH, PORT = 4302 } =
  process.env;

const BUTTON_ACTIONS = [
  { id: "buy-now", eventType: "buy", text: "Buy Now" },
  { id: "subscribe", eventType: "subscribe", text: "Subscribe" },
  { id: "free-trial", eventType: "trial", text: "Free Trial" },
];

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
// visitor's real cookies instead of an in-memory default. Both routes
// below use this — the page load *and* the button-click requests — which
// is what keeps them all attributed to the same visitor.
const createExpressCookieService = (req, res) => ({
  get: (name) => req.cookies[name],
  getAll: () => req.cookies,
  set: (name, value, options) => {
    res.append("Set-Cookie", serializeSetCookie(name, value, options));
    return value;
  },
  remove: (name) => {
    res.append(
      "Set-Cookie",
      serializeSetCookie(name, "", { expires: new Date(0) }),
    );
  },
  withConverter: () => createExpressCookieService(req, res),
});

// configure() runs once, at startup. Everything request-scoped happens via
// forRequest() inside the route handlers below.
const alloy = createInstance();
await alloy.configure({
  orgId: ORG_ID,
  datastreamId: DATASTREAM_ID,
  edgeDomain: EDGE_DOMAIN,
  edgeBasePath: EDGE_BASE_PATH,
  debugEnabled: false,
});

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// Records a page-view event and resolves this visitor's ECID, purely to
// display it on the page as proof that later /track calls (a different,
// later request) resolve to the same one.
app.get("/", async (req, res) => {
  const request = alloy.forRequest({
    cookie: createExpressCookieService(req, res),
    // Express's req already has a .headers object shaped the way Node's
    // Context component expects — forwards this visitor's real
    // User-Agent/client hints to Edge Network and derives
    // web.webPageDetails.URL from the Referer header, no adapter needed.
    request: req,
  });

  let ecid;
  let error;
  try {
    await request.sendEvent({ xdm: { eventType: "web.webpagedetails.pageViews" } });
    ({
      identity: { ECID: ecid },
    } = await request.getIdentity());
  } catch (e) {
    error = e.message;
  }

  res.set("Content-Type", "text/html");
  res.status(200).send(
    loadTemplate("index")({
      pageTitle: "Node Server-side Data Collection Sample",
      ecid,
      error,
      buttonActions: BUTTON_ACTIONS,
    }),
  );
});

// Hit by the client-side button clicks (see public/script.js). Each is its
// own request, so forRequest() is created fresh here too — reusing this
// same visitor's real cookies, read from *this* request, is what proves
// the event gets attributed to the same visitor as the page load.
app.post("/track", async (req, res) => {
  const request = alloy.forRequest({
    cookie: createExpressCookieService(req, res),
    // Express's req already has a .headers object shaped the way Node's
    // Context component expects — forwards this visitor's real
    // User-Agent/client hints to Edge Network and derives
    // web.webPageDetails.URL from the Referer header, no adapter needed.
    request: req,
  });

  try {
    await request.sendEvent({ xdm: { eventType: req.body.eventType } });
    const {
      identity: { ECID: ecid },
    } = await request.getIdentity();
    res.json({ ecid });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(
    `Node server-side data collection sample listening on http://localhost:${PORT}`,
  );
});
