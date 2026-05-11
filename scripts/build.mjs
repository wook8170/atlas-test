import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const sourceFiles = ["src/index.ts"];

await rm("dist", { recursive: true, force: true });

for (const sourceFile of sourceFiles) {
  const source = await readFile(sourceFile, "utf8");
  const outputFile = join("dist", sourceFile.replace(/^src\//, "").replace(/\.ts$/, ".js"));

  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, source, "utf8");
}
