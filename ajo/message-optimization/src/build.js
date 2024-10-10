const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");

require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });
const {
  AEP_EDGE_DOMAIN,
  EDGE_CONFIG_ID_WITH_ANALYTICS,
  ORGANIZATION_ID,
  PROFILE_TARGETING_SURFACE_NAME,
  CONTEXT_TARGETING_SURFACE_NAME
} = process.env;

const templates = ["home", "about"]; // Add your template names here

templates.forEach((templateName) => {
  // Read the Handlebars template
  const templatePath = path.resolve(__dirname, `${templateName}.handlebars`);
  const template = fs.readFileSync(templatePath, "utf-8");

  // Compile the Handlebars template
  const renderTemplate = Handlebars.compile(template);

  // Render the HTML with environment variables
  const html = renderTemplate({
    edgeDomain: AEP_EDGE_DOMAIN,
    edgeConfigId: EDGE_CONFIG_ID_WITH_ANALYTICS,
    orgId: ORGANIZATION_ID,
    profileTargetingSurfaceName: PROFILE_TARGETING_SURFACE_NAME,
    contextTargetingSurfaceName: CONTEXT_TARGETING_SURFACE_NAME
  });

  // Write the rendered HTML to the appropriate output file
  const outputPath = path.join(__dirname, "..", "public", `${templateName}.html`);
  fs.writeFile(outputPath, html, (err) => {
    if (err) {
      console.log(`Error writing ${templateName}.html:`, err);
    } else {
      console.log(`${templateName}.html written successfully`);
    }
  });
});
