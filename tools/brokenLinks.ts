// DISCLAIMER: Only test this tool on mac
// There may be some false negative results

import fs from "fs";
import path from "path";
import axios from "axios";

const urlExists = async (url: string): Promise<boolean> => {
  try {
    const res = await axios.head(url);
    return res.status === 200;
  } catch (_) {
    return false;
  }
};

const regex = /\[[^[]+?\]\(([^(]+?)\)/g;

// get sub folders under commands folder.
const getMarkdownFiles = (curDir: string, mds: string[]): void => {
  fs.readdirSync(curDir).forEach(f => {
    const p = path.join(curDir, f);
    if (fs.lstatSync(p).isDirectory()) {
      getMarkdownFiles(p, mds);
    } else if (p.endsWith(".md")) {
      mds.push(p);
    }
  });
};

const testFile = (folder: string, link: string): boolean => {
  const arr = link.split(" ");
  const target = arr[0].replace(/#.+/, "");
  return fs.existsSync(folder + "/" + target);
};

const testLink = async (
  file: string,
  folder: string,
  link: string
): Promise<void> => {
  if (link.startsWith("#")) {
    return;
  }
  let ok = false;
  if (link.startsWith("./")) {
    ok = testFile(folder, link.substring(2));
  }
  if (!link.startsWith("https://") && !link.startsWith("http://")) {
    ok = testFile(folder, link);
  }
  if (link.startsWith("https://") || link.startsWith("http://")) {
    ok = await urlExists(link);
  }
  if (!ok) {
    console.log(`${file}: ${link}`);
  }
};

(async (): Promise<void> => {
  const dir = path.join(process.cwd(), "guides");
  const mdFiles: string[] = [];
  getMarkdownFiles(dir, mdFiles);
  const promises: Promise<void>[] = [];

  mdFiles.forEach(f => {
    const folder = f.substring(0, f.lastIndexOf("/"));
    let content = fs.readFileSync(f, "utf-8");
    content = content.replace(/\n/g, " ");

    let m = regex.exec(content);
    while (m) {
      const target = m[1];
      promises.push(testLink(f, folder, target));
      m = regex.exec(content);
    }
  });

  Promise.all(promises);
})();
