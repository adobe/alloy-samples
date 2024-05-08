/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const uuid = require('uuid')
const {getAddress} = require("./utils");

function collect(aepEdgeClient, req, identity, xdm, authInfo = null) {
  const address = getAddress(req);

  let headers = {
    Referer: address
  };

  if (authInfo != null) {
    headers["Authorization"] = `Bearer ${authInfo.accessToken}`;
    headers["x-gw-ims-org-id"] = `${authInfo.orgId}`;
    headers["x-api-key"] = `${authInfo.apiKey}`;
  }

  aepEdgeClient.collect(
    {
      events: [{
        xdm: {
          web: {
            webPageDetails: { URL: address },
            webReferrer: { URL: "" },
          },
          timestamp: new Date().toISOString(),
          identityMap: {
            [identity.type]: [{
              id: identity.id,
              primary: true
            }]
          },
          ...xdm
        },
      }],
    },
    headers
  );
}

const cookieName = 'customer-defined-cookie';
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: true
}

function getOrSetFPIDCookie(req, res) {
  let fpid;

  if (req.cookies[cookieName] === undefined) {
    fpid = uuid.v4()
    console.log(`Creating FPID: ${fpid}`)
    res.cookie(cookieName, fpid, cookieOptions)
  } else {
    fpid = req.cookies[cookieName]
    console.log(`Reusing FPID ${fpid}`)
  }

  return fpid
}


module.exports = {
  collect,
  getOrSetFPIDCookie
};
