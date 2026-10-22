# toplethos-ide

Graph window plus VS Code for the text.

```bash
sudo pacman -S python-gobject gtk4
yay -S visual-studio-code-bin
git clone https://github.com/sera5m/toplethos-ide
cd toplethos-ide
ln -sfn "$(pwd)/vscode-toplethos" ~/.vscode/extensions/sera5m.toplethos-0.1.0
python3 toplethos_ide.py
```

Open `examples/graph_demo.vul` in the file list. Click a box. VS Code opens that node (`code -g file:line`). Reload the VS Code window once so `.vul` highlights and the Outline lists nodes.

`code` must be on PATH (Command Palette → `Shell Command: Install 'code' command in PATH`).

Run still executes the file on disk with `rsvm`, else `toplethos_run.py`.
