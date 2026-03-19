import { nodeResolve } from "@rollup/plugin-node-resolve";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

const meta = `/**
 * @name IgnoreCalls
 * @version ${pkg.version}
 * @description Silently block incoming calls from specific Discord users without affecting anyone else.
 * @author mayc
 * @authorLink https://github.com/mayc
 * @source https://github.com/mayc/IgnoreCalls
 * @updateUrl https://raw.githubusercontent.com/mayc/IgnoreCalls/main/dist/IgnoreCalls.plugin.js
 */
`;

export default {
  input: "src/index.js",
  output: {
    file: "dist/IgnoreCalls.plugin.js",
    format: "cjs",
    banner: meta,
    // BdApi, module y require son globales en el entorno de BetterDiscord
    globals: {
      BdApi: "BdApi",
    },
  },
  external: [],
  plugins: [nodeResolve()],
};
