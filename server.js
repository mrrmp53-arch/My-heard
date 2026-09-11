const express = require("express");
const path = require("path");
const fs = require("fs/promises");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname, "workspace");

const COMMANDS = new Set(["help", "pwd", "ls", "cd", "cat", "mkdir", "touch", "clear", "whoami", "date", "echo"]);
const MAX_OUTPUT = 20_000;

app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(__dirname, "public")));

function safePath(cwd, input = ".") {
  const target = path.resolve(cwd, input);
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    throw new Error("Access denied: path is outside the workspace.");
  }
  return target;
}

function formatPath(p) {
  const rel = path.relative(ROOT, p);
  return "/" + rel.replaceAll(path.sep, "/");
}

async function ensureRoot() {
  await fs.mkdir(ROOT, { recursive: true });
}

async function runCommand(commandLine, cwd) {
  const parts = commandLine.trim().split(/\s+/);
  const cmd = parts.shift();
  const args = parts;

  if (!cmd) return { output: "", cwd };

  if (!COMMANDS.has(cmd)) {
    return { output: `Command not allowed: ${cmd}\nType "help" for available commands.`, cwd };
  }

  if (cmd === "help") {
    return {
      output: [
        "Available commands:",
        "  help              Show this help",
        "  pwd               Show current directory",
        "  ls [path]         List files",
        "  cd [path]         Change directory",
        "  cat <file>        Read a text file",
        "  mkdir <name>      Create a directory",
        "  touch <name>      Create an empty file",
        "  echo <text>       Print text",
        "  whoami            Show current user",
        "  date              Show server date/time",
        "  clear             Clear terminal"
      ].join("\n"),
      cwd
    };
  }

  if (cmd === "pwd") return { output: formatPath(cwd), cwd };

  if (cmd === "whoami") return { output: "terminal-user", cwd };

  if (cmd === "date") return { output: new Date().toString(), cwd };

  if (cmd === "echo") return { output: args.join(" "), cwd };

  if (cmd === "ls") {
    const target = safePath(cwd, args[0] || ".");
    const entries = await fs.readdir(target, { withFileTypes: true });
    const output = entries
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(e => e.isDirectory() ? `${e.name}/` : e.name)
      .join("\n");
    return { output: output || "(empty)", cwd };
  }

  if (cmd === "cd") {
    const target = safePath(cwd, args[0] || ROOT);
    const stat = await fs.stat(target);
    if (!stat.isDirectory()) throw new Error("Not a directory.");
    return { output: "", cwd: target };
  }

  if (cmd === "cat") {
    if (!args[0]) throw new Error("Usage: cat <file>");
    const target = safePath(cwd, args[0]);
    const stat = await fs.stat(target);
    if (!stat.isFile()) throw new Error("Not a file.");
    const data = await fs.readFile(target, "utf8");
    return { output: data.slice(0, MAX_OUTPUT), cwd };
  }

  if (cmd === "mkdir") {
    if (!args[0]) throw new Error("Usage: mkdir <name>");
    const target = safePath(cwd, args[0]);
    await fs.mkdir(target, { recursive: false });
    return { output: "", cwd };
  }

  if (cmd === "touch") {
    if (!args[0]) throw new Error("Usage: touch <name>");
    const target = safePath(cwd, args[0]);
    const handle = await fs.open(target, "a");
    await handle.close();
    return { output: "", cwd };
  }

  if (cmd === "clear") return { output: "\u0000CLEAR", cwd };

  return { output: "", cwd };
}

app.post("/api/terminal", async (req, res) => {
  try {
    await ensureRoot();
    const command = String(req.body.command || "").trim();
    const requestedCwd = String(req.body.cwd || "/");
    const cwd = safePath(ROOT, requestedCwd);
    const result = await runCommand(command, cwd);
    res.json({ ok: true, output: result.output, cwd: formatPath(result.cwd) });
  } catch (err) {
    res.status(400).json({ ok: false, output: err.message || "Command failed." });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "terminal-api" });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

ensureRoot().then(() => {
  app.listen(PORT, () => {
    console.log(`Terminal Tool running at http://localhost:${PORT}`);
    console.log(`Workspace: ${ROOT}`);
  });
});