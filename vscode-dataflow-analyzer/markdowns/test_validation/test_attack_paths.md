# Validation: test_attack_paths.cpp

## Test File Purpose
Tests source-to-sink path visualization and attack path highlighting. Validates complete attack paths, path highlighting, and source/sink identification.

## Expected Behavior

### Attack Path Visualization
- Complete attack paths should be identified from source to sink
- Paths should be highlighted in visualization
- Source, propagation, and sink blocks should be visually distinct
- Paths should follow control flow correctly
- Inter-procedural paths should be shown

## Expected Logs

```
[SecurityAnalyzer] Attack path detected: scanf -> buffer -> printf
[SecurityAnalyzer] Source block: block_1 (scanf)
[SecurityAnalyzer] Sink block: block_3 (printf)
[SecurityAnalyzer] Vulnerability type: Format String
```

## Expected UI Output

### Taint Analysis Tab
- Attack paths should be listed
- Paths should be clickable to highlight
- Source and sink should be clearly marked

### CFG Tab
- Attack paths should be highlighted
- Source blocks should be visually distinct
- Sink blocks should be visually distinct
- Propagation blocks should be marked

## Validation Checklist

- [ ] Simple attack paths are identified
- [ ] Multi-step attack paths are identified
- [ ] SQL injection paths are identified
- [ ] Buffer overflow paths are identified
- [ ] Command injection paths are identified
- [ ] Paths with control flow are identified
- [ ] Inter-procedural paths are identified
- [ ] Paths are highlighted in visualization
- [ ] Source and sink blocks are visually distinct

