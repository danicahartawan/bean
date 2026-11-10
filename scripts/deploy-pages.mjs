// Build the site for GitHub Pages (https://danicahartawan.github.io/bean/) and publish it
// to the gh-pages branch. Run with: npm run deploy:pages   (add --no-push to only build)
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "dist-pages");
const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: "inherit" });
const read = (cmd, cwd = root) => execSync(cmd, { cwd }).toString().trim();

// 1. Build with the /bean/ base path.
run(`npx vite build --base=/bean/ --outDir "${out}" --emptyOutDir`);

// 2. Vite can't bundle plain <script src="./x.js"> files, so copy them next to their pages.
const htmlFiles = dir => readdirSync(dir).flatMap(name => {
  const full = path.join(dir, name);
  return statSync(full).isDirectory() ? htmlFiles(full) : name.endsWith(".html") ? [full] : [];
});
for (const html of htmlFiles(out)) {
  const rel = path.relative(out, path.dirname(html));
  for (const [, src] of readFileSync(html, "utf8").matchAll(/<script(?![^>]*type="module")[^>]*\ssrc="(\.\/[^"]+\.js)"/g)) {
    const from = path.join(root, rel, src);
    if (existsSync(from)) cpSync(from, path.join(out, rel, src));
  }
}

// 3. Images referenced from scripts by their original names (e.g. assets/bean-avatar.png).
cpSync(path.join(root, "assets"), path.join(out, "assets"), { recursive: true, force: false, errorOnExist: false });

// 4. Serve files as-is (no Jekyll processing).
writeFileSync(path.join(out, ".nojekyll"), "");
console.log(`\nBuilt ${out}`);

if (process.argv.includes("--no-push")) process.exit(0);

// 5. Publish to the gh-pages branch.
const site = path.join(root, ".worktrees", "gh-pages-publish");
rmSync(site, { recursive: true, force: true });
run("git worktree prune");
const remoteHasBranch = read("git ls-remote --heads origin gh-pages").length > 0;
if (remoteHasBranch) {
  run("git fetch -q origin gh-pages");
  run(`git worktree add -q -B gh-pages "${site}" origin/gh-pages`);
} else {
  run(`git worktree add -q --detach "${site}"`);
  run("git checkout -q --orphan gh-pages", site);
}
for (const name of readdirSync(site)) if (name !== ".git") rmSync(path.join(site, name), { recursive: true, force: true });
cpSync(out, site, { recursive: true });
run("git add -A", site);
const sha = read("git rev-parse --short HEAD");
if (read("git status --porcelain", site)) {
  run(`git commit -q -m "Deploy ${sha} to GitHub Pages"`, site);
  run("git push -q origin gh-pages", site);
  console.log("Pushed to gh-pages.");
} else console.log("gh-pages already up to date.");
run(`git worktree remove --force "${site}"`);
