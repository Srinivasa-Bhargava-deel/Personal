# cfg-exporter

A helper tool built with libclang/LLVM that emits function CFGs in JSON format.

## Prerequisites

- LLVM/Clang development packages (providing `LLVMConfig.cmake` and `ClangConfig.cmake`)
- CMake >= 3.13
- A C++17-compatible compiler

## Build

```bash
cd cpp-tools/cfg-exporter
mkdir -p build
cd build
cmake ..
cmake --build .
```

This produces the `cfg-exporter` binary inside `build/`.

## Usage

```bash
./cfg-exporter <source-file> -- -std=c++17 -Iinclude
```

Any additional compilation flags after `--` are forwarded to clang.

The tool prints a JSON document of the form:

```json
{
  "functions": [
    {
      "name": "main",
      "file": "/path/to/example.cpp",
      "range": { "start": { "line": 5, "column": 1 } },
      "blocks": [
        {
          "id": 0,
          "label": "Entry",
          "isEntry": true,
          "isExit": false,
          "statements": [ { "text": "int x;", "range": { ... } } ],
          "successors": [ 1 ],
          "predecessors": []
        },
        ...
      ]
    }
  ]
}
```

Downstream tooling can convert this JSON into whatever in-memory structures it needs.
