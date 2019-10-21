import { spawn, SpawnOptions } from "child_process";
import path from "path";

/**
 * Wrapper to spawn a ts-node repl and execute a top level command
 *
 * @example
 *  await execCommand(['project', 'init'], {cwd: "/some/project/to/init"})
 *
 * @param args Argument array to pass to ./spk
 * @param opts NodeJS SpawnOptions options
 */
export const execCommand = async (args: string[], opts: SpawnOptions = {}) => {
  const tsNode = path.resolve("node_modules/ts-node/dist/bin.js");
  const tsConfig = path.resolve("tsconfig.json");
  const spk = path.resolve("src/index.ts");

  return new Promise<number>((resolve, reject) => {
    const proc = spawn("node", [tsNode, "--project", tsConfig, spk, ...args], {
      stdio: "inherit", // pipe all stdio to parent process
      ...opts
    });
    proc.on("exit", code => {
      resolve(code || 0);
    });
    proc.on("error", error => {
      reject(error);
    });
  });
};
