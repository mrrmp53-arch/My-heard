# Terminal Tool

## Requirements
- Node.js 18+ recommended

## Run
```bash
cd terminal-tool
npm install
npm start
```

Open:
http://localhost:3000

## Included
- HTML/CSS/JavaScript terminal UI
- Node.js + Express API
- Workspace sandbox at `./workspace`
- Restricted commands: help, pwd, ls, cd, cat, mkdir, touch, clear, whoami, date, echo
- Path traversal protection
- Output limit
- Command history

This demo intentionally does NOT expose arbitrary OS command execution such as `exec`, `sh`, `bash`, or `powershell`. For production, add authentication, rate limiting, audit logs, and stronger isolation (container/VM) before allowing more powerful commands.
