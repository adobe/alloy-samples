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
const { v4: uuidv4 } = require("uuid");
const fetch = require("node-fetch");
const { isNotBlank } = require("@adobe/target-tools");

const PAGE_WIDE_SCOPE = "__view__";
const AEP_COOKIE_PREFIX = "kndctr";

const TYPE_STATE_STORE = "state:store";
const TYPE_IDENTITY_RESULT = "identity:result";
const TYPE_PERSONALIZATION = "personalization:decisions";
const TYPE_LOCATION_HINT = "locationHint:result";

const COOKIE_NAME_AEP_EDGE_CLUSTER = "cluster";
const COOKIE_NAME_VALIDATION_TOKEN = "validation_token";

const EXP_EDGE_BASE_PATH_PROD = "ee";
const EXP_EDGE_BASE_PATH_STAGE = "ee-pre-prd";

const CLUSTER_HINT_EDGE = "EdgeNetwork";
const CLUSTER_HINT_AAM = "AAM";
const CLUSTER_HINT_TARGET = "Target";

const DEFAULT_REQUEST_HEADERS = {
  accept: "*/*",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
  "content-type": "text/plain; charset=UTF-8",
  pragma: "no-cache",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "cross-site",
  "sec-gpc": "1",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

const HEADER_AEP_VALIDATION_TOKEN = "X-Adobe-AEP-Validation-Token";

const AEP_EDGE_DOMAIN = "edge.adobedc.net";

const SCHEMAS_PERSONALIZATION = [
  "https://ns.adobe.com/personalization/default-content-item",
  "https://ns.adobe.com/personalization/html-content-item",
  "https://ns.adobe.com/personalization/json-content-item",
  "https://ns.adobe.com/personalization/redirect-item",
  "https://ns.adobe.com/personalization/dom-action",
];

const NO_CONTENT = 204;

function checkForErrors(response) {
  const [statusCode, responseHeaders, responseBody] = response;

  if (
    statusCode < 200 ||
    statusCode >= 300 ||
    (!responseBody && statusCode !== NO_CONTENT) ||
    (responseBody && !Array.isArray(responseBody.handle) && statusCode !== 202)
  ) {
    const bodyToLog = responseBody ? JSON.stringify(responseBody, null, 2) : "";
    const messageSuffix = bodyToLog
      ? `response body:\n${bodyToLog}`
      : `no response body.`;
    return Promise.reject(
      new Error(
        `The server responded with a status code ${statusCode} and ${messageSuffix}`
      )
    );
  }

  return Promise.resolve(response);
}

function convertHeadersToSimpleJson(res) {
  const headersPromise = new Promise((resolve) => {
    const result = {};
    for (const pair of res.headers.entries()) {
      result[pair[0]] = pair[1];
    }
    resolve(result);
  });

  return Promise.all([Promise.resolve(res.status), headersPromise, res.json()]);
}

function prepareAepResponse(requestHeaders, requestBody) {
  return ([statusCode, responseHeaders, responseBody]) => ({
    request: {
      headers: requestHeaders,
      body: requestBody,
    },
    response: {
      headers: responseHeaders,
      body: responseBody,
    },
  });
}

function logResult(message) {
  return (result) => {
    console.log(message, JSON.stringify(result, null, 2));
    return result;
  };
}

function extractEdgeCluster(
  [statusCode, responseHeaders, responseBody],
  aepEdgeCluster
) {
  const locationHintHandle = responseBody.handle.find(
    (item) => item.type === TYPE_LOCATION_HINT
  );

  if (!locationHintHandle) {
    return aepEdgeCluster;
  }

  const { payload = [] } = locationHintHandle;
  const edgeHint = payload.find((item) => item.scope === CLUSTER_HINT_EDGE);

  if (!edgeHint) {
    return aepEdgeCluster;
  }

  return edgeHint.hint;
}

/**
 *
 * @param {string} dataStreamId
 * @param {string} aepEdgeCluster cluster hint
 * @param {string} edgeDomain edge domain
 * @param debugValidationSession validation session id (created by debugger browser extension)
 * @param {string} edgeBasePath
 */
function createAepEdgeClient(
  dataStreamId,
  aepEdgeCluster = "",
  edgeDomain = AEP_EDGE_DOMAIN,
  debugValidationSession = undefined,
  edgeBasePath = EXP_EDGE_BASE_PATH_PROD
) {
  function interact(requestBody, requestHeaders = {}) {
    const requestId = uuidv4();

    const requestUrl = [
      `https://${edgeDomain}`,
      edgeBasePath,
      aepEdgeCluster,
      "v2",
      `interact?dataStreamId=${dataStreamId}&requestId=${requestId}`,
    ]
      .filter(isNotBlank)
      .join("/");

    const headers = {
      ...DEFAULT_REQUEST_HEADERS,
      ...requestHeaders,
    };

    if (debugValidationSession) {
      headers[HEADER_AEP_VALIDATION_TOKEN] = debugValidationSession;
    }

    return fetch(requestUrl, {
      headers,
      body: JSON.stringify(requestBody),
      method: "POST",
    })
      .then(convertHeadersToSimpleJson)
      .then(checkForErrors)
      .then((response) => {
        aepEdgeCluster = extractEdgeCluster(response, aepEdgeCluster);
        return response;
      })
      .then(prepareAepResponse(headers, requestBody))
      .then(logResult(`AEP EDGE REQUEST: ${requestUrl}`))
      .catch((err) => {
        console.error(err.message);
        throw err;
      });
  }

  function collect(requestBody, requestHeaders = {}) {
    const requestId = uuidv4();

    let domain = edgeDomain;
    let region = aepEdgeCluster;

    if (edgeDomain === "server.adobedc.net") {
      if (aepEdgeCluster.length > 0) {
        domain = `${aepEdgeCluster}.${edgeDomain}`
      }
      region = ""
    }

    const requestUrl = [
      `https://${domain}`,
      edgeBasePath,
      region,
      "v2",
      `collect?dataStreamId=${dataStreamId}&requestId=${requestId}`,
    ]
      .filter(isNotBlank)
      .join("/");

    const headers = {
      ...DEFAULT_REQUEST_HEADERS,
      ...requestHeaders,
    };

    if (debugValidationSession) {
      headers[HEADER_AEP_VALIDATION_TOKEN] = debugValidationSession;
    }

    return fetch(requestUrl, {
      headers,
      body: JSON.stringify(requestBody),
      method: "POST",
    })
      .then(convertHeadersToSimpleJson)
      .then(checkForErrors)
      .then(prepareAepResponse(headers, requestBody))
      .then(logResult(`AEP EDGE REQUEST: ${requestUrl}`))
      .catch((err) => {
        console.error(err.message);
        throw err;
      });
  }

  function getPropositions({
    decisionScopes = [PAGE_WIDE_SCOPE],
    surfaces = [],
    xdm = {},
    data = {},
    meta = {},
    requestHeaders = {},
  }) {
    const requestBody = {
      event: {
        xdm: {
          ...xdm,
          timestamp: new Date().toISOString(),
        },
        data: {
          ...data,
        },
      },
      query: {
        identity: { fetch: ["ECID"] },
        personalization: {
          schemas: SCHEMAS_PERSONALIZATION,
          decisionScopes,
          surfaces,
        },
      },
      meta: {
        ...meta,
      },
    };

    return interact(requestBody, requestHeaders);
  }

  return {
    interact,
    collect,
    getPropositions,
  };
}

function getAepCookieName(organizationId, name) {
  return [AEP_COOKIE_PREFIX, organizationId.replace("@", "_"), name].join("_");
}

function getDebugSessionCookie(organizationId, req) {
  const cookieName = getAepCookieName(
    organizationId,
    COOKIE_NAME_VALIDATION_TOKEN
  );
  return req.cookies[cookieName];
}

function getAepEdgeClusterCookie(organizationId, req) {
  const cookieName = getAepCookieName(
    organizationId,
    COOKIE_NAME_AEP_EDGE_CLUSTER
  );

  return req.cookies[cookieName];
}

function createIdentityPayload(
  id,
  authenticatedState = "ambiguous",
  primary = true
) {
  if (id.length === 0) {
    return undefined;
  }

  return {
    id,
    authenticatedState,
    primary,
  };
}

function getResponseHandles(aepEdgeResult) {
  const { response = {} } = aepEdgeResult;
  const { body = {} } = response;
  const { handle: handles = [] } = body;
  return handles;
}

module.exports = {
  getAepCookieName,
  getDebugSessionCookie,
  getAepEdgeClusterCookie,
  createAepEdgeClient,
  AEP_COOKIE_PREFIX,
  PAGE_WIDE_SCOPE,
  COOKIE_NAME_AEP_EDGE_PATH: COOKIE_NAME_AEP_EDGE_CLUSTER,
  TYPE_PERSONALIZATION,
  TYPE_STATE_STORE,
  TYPE_IDENTITY_RESULT,
  AEP_EDGE_BASE_URL: AEP_EDGE_DOMAIN,
  EXP_EDGE_BASE_PATH_PROD,
  EXP_EDGE_BASE_PATH_STAGE,
  createIdentityPayload,
  getResponseHandles,
};
