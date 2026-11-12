import {cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "monaco-editor", "min", "vs");
const target = join(root, "public", "monaco", "vs");
const marker = join(root, "public", "monaco", ".version");

if (!existsSync(source)) {
  console.error("monaco-editor is not installed. Run `npm ci` first.");
  process.exit(1);
}

const {version} = JSON.parse(readFileSync(join(root, "node_modules", "monaco-editor", "package.json"), "utf8"));
if (existsSync(marker) && readFileSync(marker, "utf8") === version && existsSync(target)) {
  console.log(`Monaco ${version} already in public/monaco`);
  process.exit(0);
}

rmSync(join(root, "public", "monaco"), {recursive: true, force: true});
mkdirSync(dirname(target), {recursive: true});
cpSync(source, target, {recursive: true});
writeFileSync(marker, version);
console.log(`Copied Monaco ${version} to public/monaco`);
