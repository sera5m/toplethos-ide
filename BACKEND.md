This IDE’s VM backend is **toplethos-lang BASE** (`cpp_vm` → `rsvm`).

```bash
cmake -S ../toplethos-lang/cpp_vm -B ../toplethos-lang/cpp_vm/build -DOIRIA_ROOT=/path/to/OIRIA_OS_espIDF
cmake --build ../toplethos-lang/cpp_vm/build
export PATH="$PATH:$PWD/../toplethos-lang/cpp_vm/build"
python3 toplethos_ide.py
```

Run on This PC executes `rsvm file.vul` — the same C++ interpreter as the watch, desktop host only.
