const { spawn } = require("child_process");
const path = require("path");

const { env } = require("../../config/env");

const pythonRenderer = {
  async healthcheck() {
    return new Promise((resolve) => {
      const scriptPath = path.resolve(process.cwd(), env.pythonRendererScript);
      let child;

      try {
        child = spawn(env.pythonExecutable, [scriptPath, "--healthcheck"]);
      } catch (error) {
        resolve({
          available: false,
          executable: env.pythonExecutable,
          script: env.pythonRendererScript,
          error: error.message,
        });
        return;
      }

      let stderr = "";
      let stdout = "";

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("close", (code) => {
        resolve({
          available: code === 0,
          executable: env.pythonExecutable,
          script: env.pythonRendererScript,
          output: stdout || null,
          error: stderr || null,
        });
      });

      child.on("error", (error) => {
        resolve({
          available: false,
          executable: env.pythonExecutable,
          script: env.pythonRendererScript,
          error: error.message,
        });
      });
    });
  },

  async renderResearchAnswer(payload) {
    return runPythonRenderer({
      command: "render-research-answer",
      payload,
    });
  },
};

function runPythonRenderer(input) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(process.cwd(), env.pythonRendererScript);
    let child;

    try {
      child = spawn(env.pythonExecutable, [scriptPath], {
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error) {
      reject(error);
      return;
    }

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        reject(new Error(`Python renderer timed out after ${env.pythonRenderTimeoutMs}ms`));
      }
    }, env.pythonRenderTimeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(error);
      }
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);

      if (code !== 0) {
        reject(new Error(stderr || `Python renderer exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout || "{}"));
      } catch (error) {
        reject(new Error("Python renderer returned invalid JSON"));
      }
    });

    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
}

module.exports = { pythonRenderer };
