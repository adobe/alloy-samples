const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");

require("dotenv").config({ path: path.resolve(process.cwd(), "..", ".env") });
const {
  AEP_EDGE_DOMAIN,
  EDGE_CONFIG_ID_WITH_ANALYTICS,
  ORGANIZATION_ID,
  demoSurfaceName
} = process.env;

const template = fs.readFileSync(
  path.resolve(path.join(__dirname, "index.handlebars")),
  "utf-8"
);

const renderTemplate = Handlebars.compile(template);

const html = renderTemplate({
  edgeDomain: AEP_EDGE_DOMAIN,
  edgeConfigId: EDGE_CONFIG_ID_WITH_ANALYTICS,
  orgId: ORGANIZATION_ID,
  demoSurfaceName,
});

fs.writeFile(
  path.join(__dirname, "..", "public", "index.html"),
  html,
  (err) => {
    if (err) console.log(err);
    console.log("File written successfully");
  }
);

const signUpTemplate = fs.readFileSync(
  path.resolve(path.join(__dirname, "sign-up.handlebars")),
  "utf-8"
);
const renderSignUpTemplate = Handlebars.compile(signUpTemplate);

const signUpHtml = renderSignUpTemplate({ });

fs.writeFile(
  path.join(__dirname, "..", "public", "sign-up.html"),
  signUpHtml,
  (err) => {
    if (err) console.log(err);
    console.log("sign-up.handlebars written successfully");
  }
);
