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

const { ORG_ID, DATASTREAM_ID, EDGE_DOMAIN, EDGE_BASE_PATH, PORT = 4303 } =
  process.env;

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
// @adobe/alloy-node expects, so both identity and consent are read from
// and written to this visitor's real cookies instead of an in-memory
// default — the same cookie jar backs every request below, so a
// visitor's consent decision from one request is honored on the next.
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

// configure() runs once, at startup. defaultConsent: "out" means a visitor
// who has never made a choice starts opted out — sendEvent()/getIdentity()
// are both gated on it until a real setConsent() call changes their state.
const alloy = createInstance();
await alloy.configure({
  orgId: ORG_ID,
  datastreamId: DATASTREAM_ID,
  edgeDomain: EDGE_DOMAIN,
  edgeBasePath: EDGE_BASE_PATH,
  defaultConsent: "out",
  debugEnabled: false,
});

const forRequest = (req, res) =>
  alloy.forRequest({
    cookie: createExpressCookieService(req, res),
    // Express's req already has a .headers object shaped the way Node's
    // Context component expects.
    request: req,
  });

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (req, res) => {
  res.set("Content-Type", "text/html");
  res.status(200).send(
    loadTemplate("index")({
      pageTitle: "Node Server-side Consent Sample",
    }),
  );
});

// Records the visitor's consent choice. Consent lives in the same cookie
// jar as identity, so this decision is honored by every later /track call
// from this visitor — no session state on the server at all.
app.post("/consent", async (req, res) => {
  const { value } = req.body;
  const request = forRequest(req, res);

  try {
    await request.setConsent({
      consent: [{ standard: "Adobe", version: "1.0", value: { general: value } }],
    });
    res.json({ value });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// Both sendEvent() and getIdentity() silently no-op when consent is
// declined (they resolve without ever reaching Edge Network) rather than
// throwing, so there's no ECID in the result to report.
app.post("/track", async (req, res) => {
  const request = forRequest(req, res);

  try {
    await request.sendEvent({
      xdm: { eventType: "web.webpagedetails.pageViews" },
    });
    const ecid = (await request.getIdentity())?.identity?.ECID;
    if (ecid) {
      res.json({ blocked: false, ecid });
    } else {
      res.json({
        blocked: true,
        message: "No identity resolved — consent is declined or pending.",
      });
    }
  } catch (e) {
    res.json({ blocked: true, message: e.message });
  }
});

app.listen(PORT, () => {
  console.log(
    `Node server-side consent sample listening on http://localhost:${PORT}`,
  );
});
