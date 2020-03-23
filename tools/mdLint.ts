import fs from "fs";
import path from "path";
import { exec } from "../src/lib/shell";

// get sub folders under commands folder.
const getMarkdownFiles = (curDir: string, mds: string[]): void => {
  fs.readdirSync(curDir).forEach((f) => {
    const p = path.join(curDir, f);
    if (fs.lstatSync(p).isDirectory()) {
      getMarkdownFiles(p, mds);
    } else if (p.endsWith(".md")) {
      mds.push(p);
    }
  });
};

const testMd = async (f: string): Promise<void> => {
  try {
    await exec("./node_modules/.bin/markdown-link-check", [f]);
  } catch (e) {
    console.log(`${f}: ${e.message}`);
    process.exit(1);
  }
};

(async (): Promise<void> => {
  const dir = path.join(process.cwd(), "guides");
  const mdFiles: string[] = [];
  getMarkdownFiles(dir, mdFiles);
  const promises: Promise<void>[] = [];

  mdFiles.forEach((f) => {
    promises.push(testMd(f));
  });

  await Promise.all(promises);
  process.exit(0);
})();
