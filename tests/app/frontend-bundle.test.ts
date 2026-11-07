import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("frontend bundle", () => {
  it("does not import the server SDK package", async () => {
    const importers: string[] = [];
    await esbuild.build({
      absWorkingDir: root,
      entryPoints: [path.join(root, "app.tsx")],
      bundle: true,
      write: false,
      jsx: "automatic",
      external: ["react", "react-dom", "@get-bb/plugin-sdk/*"],
      loader: { ".css": "empty" },
      plugins: [
        {
          name: "record-server-sdk",
          setup(build) {
            build.onResolve({ filter: /^@\// }, (args) =>
              build.resolve(`./${args.path.slice(2)}`, {
                importer: args.importer,
                kind: args.kind,
                resolveDir: root,
              }),
            );
            build.onResolve({ filter: /^@get-bb\/plugin-sdk$/ }, (args) => {
              importers.push(path.relative(root, args.importer));
              return { path: args.path, external: true };
            });
          },
        },
      ],
    });
    expect(importers).toEqual([]);
  });
});
