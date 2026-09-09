import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderSiteOpenGraphImage } from "../src/server/og-image";

const destination = resolve(process.cwd(), "public/og.png");
await writeFile(destination, await renderSiteOpenGraphImage());
console.log(`Generated ${destination}`);
