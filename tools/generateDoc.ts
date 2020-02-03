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
    const level1 = cmd.command;
    cmd.subcommands.forEach(c => {
      const key = `${level1} ${c.command.replace(/ .+/, "")}`;
      mainCommands[key] = c;
    });
  });
  return mainCommands;
};

const dir = path.join(process.cwd(), "src", "commands");
const commandDirs = getSubDirectories(dir);

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

// const buffer: string[] = ["## SPK Commands"];
// Object.keys(mapCommands).forEach(k => {
//   buffer.push(`* [spk ${k}](#spk-${k.replace(/\s/g, "-")})`);
// });

// buffer.push("\n---\n");

// buffer.push("\n## Details\n");
// Object.keys(mapCommands).forEach(k => {
//   const cmd = mapCommands[k];
//   buffer.push(`### spk ${k}`);
//   buffer.push("```");

//   const valuesArray = cmd.command.split(/\s/);
//   let values = "";
//   if (valuesArray.length > 1) {
//     valuesArray.shift();
//     values = " " + valuesArray.join(" ");
//   }
//   const alias = cmd.alias ? `|${cmd.alias}` : "";

//   buffer.push(`spk ${k}${alias}${values} [options]`);
//   buffer.push(`  ${cmd.description}`);
//   buffer.push("\nOptions:");

//   (cmd.options || []).forEach(opt => {
//     buffer.push(`  ${opt.arg}`);
//     buffer.push(`    ${opt.description}`);
//     buffer.push("\n");
//   });

//   buffer.push("  -h, --help");
//   buffer.push("    output usage information");

//   buffer.push("```");
//   buffer.push("\n\n[Go to Top](#SPK-Commands)");
// });

// console.log(buffer.join("\n"));
