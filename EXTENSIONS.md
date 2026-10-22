# Extensions

`rsvm` / `rs_vm` is the virtual machine. The `rs` is not Rust. These suffixes are what the desktop and VS Code should key off.

| suffix | was | what |
|---|---|---|
| `.tpth_s` | `.vul` | Toplethos source. Text. Language id `toplethos`. |
| `.tpth_aot` | `.cvul` | Ahead-of-time image. Not source. Language id `tpth-aot`. |
| `.tpth_bc` | `.bvul` | Bytecode image. Not source. Language id `tpth-bc`. |

`.vul`, `.cvul`, and `.bvul` still map to the same language ids so old files open correctly. New files use the `tpth_` names.

Abbreviation: toplethos → `tpth`. `.tpth_s` is pronounced "toplethos source".

## Filesystem (Arch, any freedesktop desktop)

VS Code's language id does not change what the file manager or `xdg-open` thinks. That database is shared-mime-info, and it matches the suffix.

From this repo, for your user only:

```bash
mkdir -p ~/.local/share/mime/packages
cp mime/toplethos.xml ~/.local/share/mime/packages/toplethos.xml
update-mime-database ~/.local/share/mime
xdg-mime query filetype examples/graph_demo.tpth_s
```

That last line should print `text/x-toplethos`. An AOT file prints `application/x-toplethos-aot`. The weight on the glob is 80 so the suffix wins over content sniffing, which is what was guessing Rust or TypeScript from the text.

Log out and back in if Strata still shows the old icon. The database is already updated; the file manager caches icons.

This does not affect VS Code. If the status bar there still says TypeScript or Rust, that is an editor association. Reload the window after `git pull`. A user setting that says `"*.tpth_s": "typescript"` or `"rust"` overrides the extension, so delete that line from Settings if it exists.

