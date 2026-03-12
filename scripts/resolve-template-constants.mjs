import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const outputRoot = args[0] ? path.resolve(rootDir, args[0]) : path.resolve(rootDir, "dist");

const indexPath = path.join(rootDir, "index.json");
const templateConstantsPath = path.join(rootDir, "templates", "template-constants.json");
const chapterOutputDir = path.join(outputRoot, "chapters");

const placeholderPattern = /\{\{\s*templates\.templateConstants\.([A-Za-z0-9_]+)\s*\}\}/g;

const index = JSON.parse(await fs.readFile(indexPath, "utf8"));
const chapters = Array.isArray(index.chapters) ? index.chapters : [];
const chapterPaths = chapters
  .flatMap(chapter => chapter.items || [])
  .map(item => item.path)
  .filter(itemPath => typeof itemPath === "string" && itemPath.startsWith("chapters/") && itemPath.endsWith(".md"));

const templateConstants = JSON.parse(await fs.readFile(templateConstantsPath, "utf8"));

await fs.rm(chapterOutputDir, { recursive: true, force: true });
await fs.mkdir(chapterOutputDir, { recursive: true });

const unresolved = [];

for (const chapterPath of chapterPaths) {
  const inputPath = path.join(rootDir, chapterPath);
  const outputPath = path.join(outputRoot, chapterPath);
  const content = await fs.readFile(inputPath, "utf8");

  const replaced = content.replace(placeholderPattern, (match, key) => {
    if (!(key in templateConstants)) {
      unresolved.push({ file: chapterPath, key, match });
      return match;
    }
    return templateConstants[key];
  });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, replaced, "utf8");
}

if (unresolved.length > 0) {
  console.error("Template constant resolution failed:");
  unresolved.forEach(({ file, key, match }) => {
    console.error(`- ${file}: unresolved placeholder \`${match}\` (missing key: ${key})`);
  });
  process.exit(1);
}

console.log(`Resolved template constants for ${chapterPaths.length} chapter files.`);
console.log(`Output: ${path.relative(rootDir, outputRoot)}`);
