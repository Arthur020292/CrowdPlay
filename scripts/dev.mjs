import net from "node:net";
import os from "node:os";
import process from "node:process";
import { spawn } from "node:child_process";

const DEFAULT_WEB_PORT = 4177;
const DEFAULT_WORKER_PORT = 8788;

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const server = net.createServer();

      server.unref();
      server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
          tryPort(port + 1);
          return;
        }
        reject(error);
      });

      server.listen(port, "127.0.0.1", () => {
        const address = server.address();
        const resolvedPort = typeof address === "object" && address ? address.port : port;
        server.close(() => resolve(resolvedPort));
      });
    };

    tryPort(startPort);
  });
}

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        return entry.address;
      }
    }
  }
  return "127.0.0.1";
}

function runCommand(label, command, args, env) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
    shell: false
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`[${label}] exited via ${signal}`);
    } else if (code && code !== 0) {
      console.log(`[${label}] exited with code ${code}`);
      process.exitCode = code;
    }
  });

  return child;
}

async function main() {
  const webPort = await findAvailablePort(DEFAULT_WEB_PORT);
  const workerPort = await findAvailablePort(DEFAULT_WORKER_PORT);
  const lanAddress = getLocalIpAddress();

  console.log(`CrowdPlay local dev ports`);
  console.log(`- web:    http://127.0.0.1:${webPort}`);
  console.log(`- worker: http://127.0.0.1:${workerPort}`);
  console.log(`- phone:  http://${lanAddress}:${webPort}`);
  console.log("");

  const sharedEnv = {
    ...process.env,
    CROWDPLAY_WEB_PORT: String(webPort),
    CROWDPLAY_WORKER_PORT: String(workerPort)
  };

  const worker = runCommand(
    "worker",
    "npm",
    ["run", "dev", "-w", "@crowdplay/worker", "--", "--port", String(workerPort), "--local"],
    sharedEnv
  );
  const web = runCommand(
    "web",
    "npm",
    ["run", "dev", "-w", "@crowdplay/web", "--", "--port", String(webPort), "--host", "0.0.0.0"],
    sharedEnv
  );

  const shutdown = (signal) => {
    worker.kill(signal);
    web.kill(signal);
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
