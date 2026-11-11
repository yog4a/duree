import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeVsix } from "./vsix.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "duree.vsix");
writeVsix(root, out);
console.log(out);
