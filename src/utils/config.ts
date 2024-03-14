import { promises as fs } from "fs";
import paperConfig from "../../../paper/apps/web/tailwind.config";
import { paperTailwind } from "./converter";

function requireUncached(module: string) {
  delete require.cache[require.resolve(module)];
  return require(module);
}

export async function loadConfigFile<T>(filepath: string): Promise<T | undefined> {
  // paperTailwind.appendLine(JSON.stringify(paperConfig, null, 2));

  return paperConfig as T;

  /* let content: string | undefined;

  async function read() {
    if (content === null) {
      content = await fs.readFile(filepath, "utf-8");
    }

    return content;
  }

  try {
    return JSON.parse((await read()) || "");
  } catch {
    return requireUncached(filepath);
  } */
}
