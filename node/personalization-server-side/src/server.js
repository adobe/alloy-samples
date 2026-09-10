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
  PORT = 4301,
} = process.env;

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
// Edge returns nothing for DECISION_SCOPE. Unlike the hybrid sample, this
// doesn't need to be shaped as a proposition at all — since rendering
// happens entirely server-side, this is just the plain content values the
// template needs.
const createMockOfferContent = () => ({
  heroImageName: "demo-marketing-offer1-default.png",
  buttonActions: [
    {
      id: 1,
      text: "Mock button",
      content:
        "No live activity is configured for this decision scope, so this is mock content.",
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
    res.append(
      "Set-Cookie",
      serializeSetCookie(name, "", { expires: new Date(0) }),
    );
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

// Fetches decisions for this visitor's request-scoped instance and, if a
// real proposition came back, sends the display notification server-side —
// there's no client-side alloy.js in this sample to do it once content
// renders, so the server has to be the one to report it was shown.
const fetchOfferContent = async (request) => {
  const { propositions } = await request.sendEvent({
    xdm: { eventType: "decisioning.propositionFetch" },
    decisionScopes: [DECISION_SCOPE],
  });

  const [proposition] = propositions;
  if (!proposition) {
    return { offerContent: createMockOfferContent(), usedMock: true };
  }

  await request.sendEvent({
    xdm: {
      eventType: "decisioning.propositionDisplay",
      _experience: {
        decisioning: {
          propositions: [
            {
              id: proposition.id,
              scope: proposition.scope,
              scopeDetails: proposition.scopeDetails,
            },
          ],
        },
      },
    },
  });

  return {
    offerContent: proposition.items[0]?.data?.content,
    usedMock: false,
  };
};

const app = express();
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", async (req, res) => {
  const request = alloy.forRequest({
    cookie: createExpressCookieService(req, res),
    // Express's req already has a .headers object shaped the way Node's
    // Context component expects — forwards this visitor's real
    // User-Agent/client hints to Edge Network and derives
    // web.webPageDetails.URL from the Referer header, no adapter needed.
    request: req,
  });

  let offerContent;
  let usedMock;
  let error;
  try {
    ({ offerContent, usedMock } = await fetchOfferContent(request));
  } catch (e) {
    error = e.message;
  }

  res.set("Content-Type", "text/html");
  res.status(200).send(
    loadTemplate("index")({
      pageTitle: "Node Server-side Personalization Sample",
      decisionScope: DECISION_SCOPE,
      usedMock,
      error,
      heroImageName:
        offerContent?.heroImageName || "demo-marketing-offer1-default.png",
      buttonActions: offerContent?.buttonActions || [],
    }),
  );
});

app.listen(PORT, () => {
  console.log(
    `Node server-side personalization sample listening on http://localhost:${PORT}`,
  );
});
