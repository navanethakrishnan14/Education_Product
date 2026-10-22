import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const platformRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tenantRoot = resolve(platformRoot, "../Tenant_frontend");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

console.log("\nEduSphere local development");
console.log("Platform frontend: http://localhost:5173");
console.log("Management login:  http://localhost:5174/login/management\n");
console.log("Starting both frontend servers. Press Ctrl+C to stop them.\n");

const platform = spawn(npmCommand, ["run", "dev:platform"], {
  cwd: platformRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});
const tenant = spawn(npmCommand, ["run", "dev"], {
  cwd: tenantRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});

let shuttingDown = false;
function stopChildren(signal = "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of [platform, tenant]) {
    if (child.exitCode === null && !child.killed) child.kill(signal);
  }
}

for (const [name, child] of [["Platform frontend", platform], ["Tenant frontend", tenant]]) {
  child.on("error", (error) => {
    console.error(`\nCould not start ${name}: ${error.message}`);
  });
  child.on("exit", (code, signal) => {
    if (!shuttingDown && code !== 0) {
      console.error(`\n${name} stopped (code: ${code ?? "none"}, signal: ${signal ?? "none"}).`);
      console.error("Check the output above for missing dependencies or a port conflict.");
    }
  });
}

process.on("SIGINT", () => stopChildren("SIGTERM"));
process.on("SIGTERM", () => stopChildren("SIGTERM"));
