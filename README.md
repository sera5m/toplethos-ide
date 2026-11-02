# toplethos-ide

Graph window plus VS Code for the text.

```bash
sudo pacman -S python-gobject gtk4
yay -S visual-studio-code-bin
git clone https://github.com/sera5m/toplethos-ide
cd toplethos-ide
ln -sfn "$(pwd)/vscode-toplethos" ~/.vscode/extensions/sera5m.toplethos-1.0.0
python3 toplethos_ide.py
```

Open `examples/graph_demo.tpth_s` in the file list. Click a box. VS Code opens that node (`code -g file:line`). Reload the VS Code window once so `.tpth_s` highlights as Toplethos, not as Rust or plain text.

The 1.0 editor is that extension. It follows [USE.md](https://github.com/sera5m/toplethos-lang/blob/v1.0.0/USE.md) in [toplethos-lang](https://github.com/sera5m/toplethos-lang) `v1.0.0`. Run in this GTK window still calls `rsvm`, else `toplethos_run.py`. That is the old runner, not the 1.0 compiler.

`code` must be on PATH (Command Palette → `Shell Command: Install 'code' command in PATH`).

Run still executes the file on disk with `rsvm`, else `toplethos_run.py`.
