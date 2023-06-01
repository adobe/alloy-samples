/*
Copyright 2023 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const { exec } = require("child_process");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const { hostnames = "localhost" } = process.env;

const cmd = [
  "mkcert -key-file key.pem -cert-file cert.pem",
  ...hostnames.split(","),
  "127.0.0.1 ::1",
].join(" ");

exec(cmd, (err, stdout, stderr) => {
  if (err) {
    console.log(
      `******************************************************************************************************************************`
    );
    console.log(
      "Unable to generate SSL Certificate, please install mkcert: https://github.com/adobe/alloy-samples/blob/main/LocalSSLCertificateSetup.md"
    );
    console.log(
      `******************************************************************************************************************************`
    );

    process.exitCode = 1;
  }
});
