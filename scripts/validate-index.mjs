import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const indexPath = path.join(rootDir, "index.json");
const index = JSON.parse(await fs.readFile(indexPath, "utf8"));

const errors = [];
const warnings = [];

const chapters = Array.isArray(index.chapters) ? index.chapters : [];
const resources = Array.isArray(index.resources) ? index.resources : [];
const items = chapters.flatMap(chapter => chapter.items || []);

const itemPathToTitle = new Map(items.map(item => [item.path, item.title]));
const resourcePathToTitle = new Map(
  resources.map(resource => [resource.path, resource.title])
);
const knownPaths = new Set([
  ...itemPathToTitle.keys(),
  ...resourcePathToTitle.keys(),
]);

const readFileSafe = async relativePath => {
  const absolutePath = path.join(rootDir, relativePath);
  try {
    return await fs.readFile(absolutePath, "utf8");
  } catch {
    errors.push(`missing file: ${relativePath}`);
    return null;
  }
};

const extractH2Section = (content, heading) => {
  const pattern = new RegExp(
    `^##\\s+${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*$`,
    "m"
  );
  const match = pattern.exec(content);
  if (!match) return null;

  const start = match.index + match[0].length;
  const rest = content.slice(start);
  const nextHeading = /\n##\s+/m.exec(rest);
  if (!nextHeading) return rest.trim();
  return rest.slice(0, nextHeading.index).trim();
};

for (const item of items) {
  if (typeof item.hasAssignment !== "boolean") {
    errors.push(`${item.path}: hasAssignment must be boolean`);
  }

  const content = await readFileSafe(item.path);
  if (!content) continue;

  if (item.hasAssignment) {
    if (!extractH2Section(content, "課題提出")) {
      errors.push(`Missing required section: ${item.path} (## 課題提出)`);
    }
  } else if (!extractH2Section(content, "完了記録")) {
    errors.push(`Missing required section: ${item.path} (## 完了記録)`);
  }

  const lines = content.split(/\r?\n/);
  let inFence = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const linkMatches = line.matchAll(
      /\[([^\]]+)\]\(((?:\.{1,2}\/|chapters\/|templates\/)[^)\s]+?\.md)\)/g
    );

    for (const match of linkMatches) {
      const target = match[2].trim();
      const currentDir = path.dirname(item.path);
      const resolvedPath = (
        target.startsWith("chapters/") || target.startsWith("templates/")
          ? target
          : path.normalize(path.join(currentDir, target))
      ).replace(/\\/g, "/");

      if (!knownPaths.has(resolvedPath)) {
        errors.push(
          `${item.path}: link target \`${target}\` does not match any item/resource path in index.json at line ${
            i + 1
          }.`
        );
        continue;
      }

      if (target.startsWith("chapters/") || target.startsWith("templates/")) {
        warnings.push(
          `${item.path}: prefer relative links instead of \`${target}\` at line ${
            i + 1
          }.`
        );
      }
    }
  }
}

for (const resource of resources) {
  if (resource.kind !== "template") {
    errors.push(`${resource.path}: resource kind must be "template"`);
  }
  await readFileSafe(resource.path);
}

for (const resource of resources) {
  if (resource.path === "templates/template-constants.json") {
    if (!resource.constantKey || typeof resource.constantKey !== "string") {
      errors.push(`${resource.id || resource.title}: constantKey is required for template-constants resources`);
      continue;
    }

    try {
      const constantsRaw = await fs.readFile(path.join(rootDir, resource.path), "utf8");
      const constantsJson = JSON.parse(constantsRaw);
      if (!(resource.constantKey in constantsJson)) {
        errors.push(`${resource.id || resource.title}: constantKey \`${resource.constantKey}\` not found in ${resource.path}`);
      }
    } catch {
      errors.push(`invalid JSON: ${resource.path}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Validation failed:");
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn("Warnings:");
  warnings.forEach(warning => console.warn(`- ${warning}`));
}

console.log("Validation passed.");
