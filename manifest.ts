const fs = require("fs");

const baseManifest = JSON.parse(
  fs.readFileSync("manifest.base.json").toString()
);
const pack = JSON.parse(fs.readFileSync("package.json").toString());
baseManifest.version = pack.version;
baseManifest.description = pack.description;
fs.writeFileSync("manifest.json", JSON.stringify(baseManifest));
