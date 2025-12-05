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
/** same as ../../common/authentication.js but as an ES module and inside our own monorepo */

import { isNotBlank } from "./utils.js";

export function createImsClient(
  clientId,
  clientSecret,
  scopes = "openid, AdobeID, read_organizations, additional_info.projectedProductContext, session",
  host = "ims-na1.adobelogin.com",
  path = "/ims/token/v3",
) {
  let imsToken = null;
  let imsTokenGenerationTimestamp;

  async function generateAccessToken() {
    let currentTimestamp = Math.floor(Date.now() / 1000);

    if (
      imsToken &&
      currentTimestamp < imsTokenGenerationTimestamp + imsToken["expires_in"]
    ) {
      return imsToken["access_token"];
    }

    const requestUrl = [`https://${host}`, path].filter(isNotBlank).join("/");

    const formData = new FormData();

    formData.append("grant_type", "client_credentials");
    formData.append("client_id", clientId);
    formData.append("client_secret", clientSecret);
    formData.append("scope", scopes);

    let res = await fetch(requestUrl, {
      method: "POST",
      body: formData,
    });
    res = await Promise.all([Promise.resolve(res.status), res.json()]);

    let [status, body] = res;

    if (status !== 200) {
      throw new Error(
        `The server responded with a status code ${status} and ${body}`,
      );
    } else {
      imsToken = body;
      imsTokenGenerationTimestamp = Math.floor(Date.now() / 1000);

      return imsToken["access_token"];
    }
  }

  return {
    generateAccessToken,
  };
}
