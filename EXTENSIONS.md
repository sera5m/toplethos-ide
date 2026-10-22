# Extensions

`rsvm` / `rs_vm` is the virtual machine. The `rs` is not Rust. These suffixes are what the desktop and VS Code should key off.

| suffix | was | what |
|---|---|---|
| `.tpth_s` | `.vul` | Toplethos source. Text. Language id `toplethos`. |
| `.tpth_aot` | `.cvul` | Ahead-of-time image. Not source. Language id `tpth-aot`. |
| `.tpth_bc` | `.bvul` | Bytecode image. Not source. Language id `tpth-bc`. |

`.vul`, `.cvul`, and `.bvul` still map to the same language ids so old files open correctly. New files use the `tpth_` names.

Abbreviation: toplethos → `tpth`. `.tpth_s` is pronounced "toplethos source".
