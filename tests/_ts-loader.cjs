// Lets plain `node --test` import the project's TypeScript without extra deps.
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolve.call(
    this,
    name.startsWith("@/") ? path.join(__dirname, "../src", name.slice(2)) : name,
    ...args,
  );
};

require.extensions[".ts"] = (module, filename) => {
  const {outputText} = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true},
  });
  module._compile(outputText, filename);
};

module.exports = (relativeToSrc) => require(path.join(__dirname, "../src", relativeToSrc));
