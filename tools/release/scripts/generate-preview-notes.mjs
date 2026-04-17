import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import semanticRelease from "semantic-release";
import baseConfig from "../release.config.cjs";

const repoRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
const previewBranch = process.env.PREVIEW_BRANCH || "main";
const outputJsonPath = process.env.PREVIEW_OUTPUT_JSON || "preview-release.json";
const outputNotesPath = process.env.PREVIEW_OUTPUT_NOTES || "preview-release-notes.md";
const previewRepositoryUrl = process.env.PREVIEW_REPOSITORY_URL || `file://${repoRoot}`;

const previewPlugins = baseConfig.plugins.filter((plugin) => {
  const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
  return pluginName === "@semantic-release/commit-analyzer" || pluginName === "@semantic-release/release-notes-generator";
});

const result = await semanticRelease(
  {
    ...baseConfig,
    branches: [previewBranch],
    ci: false,
    dryRun: true,
    plugins: previewPlugins,
    repositoryUrl: previewRepositoryUrl,
  },
  {
    cwd: repoRoot,
    env: process.env,
    stdout: process.stdout,
    stderr: process.stderr,
  },
);

const payload = {
  released: Boolean(result?.nextRelease),
  lastReleaseTag: result?.lastRelease?.gitTag || "",
  nextVersion: result?.nextRelease?.version || "",
  nextGitTag: result?.nextRelease?.gitTag || "",
  releaseNotes: result?.nextRelease?.notes || "",
};

writeFileSync(outputJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
writeFileSync(outputNotesPath, payload.releaseNotes);

if (!payload.released) {
  console.log("No release-relevant commits found for preview range.");
}
