import fs from "node:fs";
import path from "node:path";

export function emptyDir(dir: string) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const file of fs.readdirSync(dir)) {
    if (file === ".git") {
      continue;
    }
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true });
  }
}

export function isEmptyDir(path: string) {
  const files = fs.readdirSync(path);
  return files.length === 0 || (files.length === 1 && files[0] === ".git");
}

export function formatTargetDir(targetDir: string) {
  return targetDir
    .trim()
    .replace(/[<>:"\\|?*]/g, "")
    .replace(/\/+$/g, "");
}
