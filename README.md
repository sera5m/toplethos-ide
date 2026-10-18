# toplethos-ide

Desktop editor + PC interpreter. First run clones [toplethos-lang](https://github.com/sera5m/toplethos-lang).

```bash
sudo pacman -S python-gobject gtk4 python-pyserial python-matplotlib
git clone https://github.com/sera5m/toplethos-ide
cd toplethos-ide
python3 toplethos_ide.py
```

- Folder / file list, Open, Save, Export
- Line numbers; errors print `line N:`
- Run: `rsvm` if on PATH, else `toplethos_run.py`
- Language: include, C arrays, `@memory_hard`, `native` / `py`
