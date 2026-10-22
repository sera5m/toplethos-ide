# Toplethos VS Code extension

Teaches VS Code that `.vul` is Toplethos: comment highlighting, the `//<<<node>>>` markers, and an outline entry per node.

No build step. No npm install.

## Install

From this repo:

```bash
mkdir -p ~/.vscode/extensions
ln -sfn "$(pwd)/vscode-toplethos" ~/.vscode/extensions/sera5m.toplethos-0.1.0
```

Then in VS Code: Command Palette → `Developer: Reload Window`.

The graph IDE does not talk to the extension over a socket. It runs:

```bash
code -g /path/file.vul:LINE:1
```

That flag is built into VS Code. The extension only has to be installed so the opened buffer is highlighted and the Outline lists the nodes.

`code` must be on `PATH`. In VS Code: Command Palette → `Shell Command: Install 'code' command in PATH`.
