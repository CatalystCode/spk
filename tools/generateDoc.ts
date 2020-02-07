import fs from "fs";
import path from "path";
import { ICommandBuildElements } from "../src/lib/commandBuilder";

interface ICommand {
  command: string;
  subcommands: ICommandBuildElements[];
}

const getAllDecorators = (curDir: string): ICommandBuildElements[] => {
  return fs
    .readdirSync(curDir)
    .filter(f => f.endsWith(".json"))
    .map(f => require(path.join(curDir, f)) as ICommandBuildElements);
};

const getSubDirectories = (curDir: string) => {
  return fs
    .readdirSync(curDir)
    .map(f => path.join(curDir, f))
    .filter(p => fs.lstatSync(p).isDirectory());
};

const listCommands = (
  allCommands: ICommand[]
): { [key: string]: ICommandBuildElements } => {
  const mainCommands: { [key: string]: ICommandBuildElements } = {};
  allCommands.forEach(cmd => {
    let level1 = cmd.command;
    if (level1 === "commands") {
      level1 = "";
    } else {
      level1 = level1 + " ";
    }
    cmd.subcommands.forEach(c => {
      const key = `${level1}${c.command.replace(/ .+/, "")}`;
      mainCommands[key] = c;
    });
  });
  return mainCommands;
};

const dir = path.join(process.cwd(), "src", "commands");
const commandDirs = getSubDirectories(dir);
commandDirs.unshift(dir);

const commands: ICommand[] = commandDirs
  .map(d => {
    return {
      command: path.basename(d),
      subcommands: getAllDecorators(d)
    };
  })
  .filter(item => item.subcommands.length > 0);

const mapCommands = listCommands(commands);

console.log(JSON.stringify(mapCommands, null, 2));
