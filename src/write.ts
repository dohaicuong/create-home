import path from "node:path";
import fs from "node:fs";

export const write =
  (
    root: string,
    templateDir: string,
    packageName: string,
    renameFiles: Record<string, string | undefined>,
  ) =>
  (file: string, content?: string) => {
    const targetPath = path.join(root, renameFiles[file] ?? file);
    if (content) {
      fs.writeFileSync(targetPath, content);
    } else if (file === "index.html") {
      const templatePath = path.join(templateDir, file);
      const templateContent = fs.readFileSync(templatePath, "utf-8");
      const updatedContent = templateContent.replace(
        /<title>.*?<\/title>/,
        `<title>${packageName}</title>`,
      );
      fs.writeFileSync(targetPath, updatedContent);
    } else if (file === "package.json") {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(templateDir, `package.json`), "utf-8"),
      );
      pkg.name = packageName;
      write(
        root,
        templateDir,
        packageName,
        renameFiles,
      )("package.json", JSON.stringify(pkg, null, 2) + "\n");
    } else {
      copy(path.join(templateDir, file), targetPath);
    }
  };

function copy(src: string, dest: string) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    copyDir(src, dest);
  } else {
    fs.copyFileSync(src, dest);
  }
}

function copyDir(srcDir: string, destDir: string) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file);
    const destFile = path.resolve(destDir, file);
    copy(srcFile, destFile);
  }
}
