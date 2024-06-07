/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const path = require("path");

require("dotenv").config({ path: path.resolve(process.cwd(), "..", ".env") });

const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require('body-parser')

const fs = require("fs");
const http = require("http");
const https = require("https");

const {
  createAepEdgeClient,
} = require("aep-edge-samples-common/aepEdgeClient");

const {
  createImsClient,
} = require("aep-edge-samples-common/authentication");

const {
  loadHandlebarsTemplate,
} = require("aep-edge-samples-common/templating");

const {
  collect,
  getOrSetFPIDCookie
} = require("aep-edge-samples-common/collection");

const { sendResponse } = require("aep-edge-samples-common/utils");

const {
  IMS_HOST,
  ORGANIZATION_ID,
  CLIENT_ID,
  CLIENT_SECRET,
  ACCESS_SCOPES,
  DATASTREAM_ID,
  AEP_EDGE_DOMAIN,
  AEP_EDGE_REGION
} = process.env;

const aepEdgeClient = createAepEdgeClient(
  DATASTREAM_ID,
  AEP_EDGE_REGION,
  AEP_EDGE_DOMAIN
);

const imsClient = createImsClient(
  CLIENT_ID,
  CLIENT_SECRET,
  ACCESS_SCOPES,
  IMS_HOST
);

// Initialize the Express app
const httpApp = express();
const httpsApp = express();

// Setup cookie parsing middleware and static file serving from the /public directory
httpsApp.use(cookieParser());
httpsApp.use(bodyParser.json())
httpsApp.use(express.static(path.resolve(__dirname, "..", "public")));

// Setup the root route Express app request handler for GET requests
httpsApp.get("/", async (req, res) => {
  let template = loadHandlebarsTemplate("index");
  let templateVariables = {
    pageTitle: "Collecting data via AEP Edge Network Server API",
    buttonActions: [{
      id: "buy-now",
      content: {
        eventType: "buy"
      },
      text: "Buy now"
    }, {
      id: "newsletter",
      content: {
        eventType: "subscribe"
      },
      text: "Subscribe now"
    }, {
      id: "free-trial",
      content: {
        eventType: "trial"
      },
      text: "Free Trial"
    }]
  };

  let identity = retrieveIdentity(req, res);

  try {
    let authInfo = {
      accessToken: await imsClient.generateAccessToken(),
      orgId: ORGANIZATION_ID,
      apiKey: CLIENT_ID
    };

    collect(aepEdgeClient, req, identity, {
      eventType: "pageView",
      producedBy: "express-demo-app"
    }, authInfo);

    sendResponse({
      req,
      res,
      template,
      templateVariables
    });
  } catch (e) {
    console.log(e);

    template = loadHandlebarsTemplate("error");
    templateVariables.error = e.message;
    sendResponse({
      req,
      res,
      template,
      templateVariables,
    });
  }
});

httpsApp.post("/execute", async (req, res) => {
  try {
    // Your business logic to handle this event.
    // processEvent(...):

    let authInfo = {
      accessToken: await imsClient.generateAccessToken(),
      orgId: ORGANIZATION_ID,
      apiKey: CLIENT_ID
    };

    let identity = retrieveIdentity(req, res);

    // And also collect this event via AEP Edge Sever Side.
    collect(aepEdgeClient, req, identity, {
      eventType: req.body.eventType,
      producedBy: "express-demo-app"
    }, authInfo);

    res.status(200).send();
  } catch (e) {
    console.error(e.message, e);
    res.status(500).send()
  }
});

function retrieveIdentity(req, res) {
  // Get the identity for the current visitor.

  // We assume it is an authenticated visitor and we return his identity, which is represented by an email.
  return {
    type: "Email",
    id: "user@express-demo-app.com"
  }
}

// Startup the Express server listener
const httpsOptions = {
  key: fs.readFileSync("./key.pem"),
  cert: fs.readFileSync("./cert.pem"),
};

https.createServer(httpsOptions, httpsApp).listen(443, () => {
  console.log(`https server started`);
});

http.createServer(httpApp).listen(80, () => {
  console.log(`http server started`);
  httpApp.all("*", (req, res) => {
    return res.redirect(
      301,
      ["https://", req.headers.host, req.originalUrl].join("")
    );
  });
});

// Stop the server on any app warnings
process.on("warning", (e) => {
  console.warn("Node application warning", e);
  process.exit(-1);
});
