import commander from "commander";
import {
  build,
  ICommandBuildElements,
  validateForRequiredValues
} from "./commandBuilder";

interface ICommandOption {
  flags: string;
  description: string;
}

describe("Tests Command Builder's build function", () => {
  it("Sanity tests", () => {
    const descriptor: ICommandBuildElements = {
      alias: "cbt",
      command: "command-build-test",
      description: "description of command",
      options: {
        optionA: {
          arg: "-a, --optionA <optionA>",
          description: "description for optionA",
          required: false
        },
        optionB: {
          arg: "-b, --optionB <optionB>",
          description: "description for optionB",
          required: false
        },
        optionC: {
          arg: "-c, --optionC <optionC>",
          description: "description for optionC",
          required: false
        }
      }
    };

    const options: ICommandOption[] = Object.getOwnPropertyNames(
      descriptor.options
    ).map((name: string) => {
      return {
        description: descriptor.options[name].description,
        flags: descriptor.options[name].arg
      };
    });
    const cmd = build(new commander.Command(), descriptor);

    expect(cmd.description()).toBe("description of command");
    expect(cmd.alias()).toBe("cbt");
    cmd.options.forEach((opt: ICommandOption, i: number) => {
      expect(opt.flags).toBe(options[i].flags);
      expect(opt.description).toBe(options[i].description);
    });
  });
});

describe("Tests Command Builder's validation function", () => {
  it("Validation tests", () => {
    const descriptor: ICommandBuildElements = {
      alias: "cbt",
      command: "command-build-test",
      description: "description of command",
      options: {
        optionA: {
          arg: "-a, --optionA <optionA>",
          description: "description for optionA",
          required: true
        },
        optionB: {
          arg: "-b, --optionB <optionB>",
          description: "description for optionB",
          required: false
        },
        optionC: {
          arg: "-c --optionC <optionC>",
          description: "description for optionC",
          required: true
        }
      }
    };

    const options: ICommandOption[] = Object.getOwnPropertyNames(
      descriptor.options
    ).map((name: string) => {
      return {
        description: descriptor.options[name].description,
        flags: descriptor.options[name].arg
      };
    });
    const errors = validateForRequiredValues(descriptor, {
      optionA: "has value"
    });

    // Option-A is ok because we have value for optionA
    // Option-B is ok because it is not flag as required
    // Option-C is not ok because value is missing
    expect(errors.length).toBe(1);
    expect(errors[0]).toBe("-c --optionC <optionC>");
  });
});
