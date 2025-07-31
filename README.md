# 🚀 Perf-Wizard

**Professional Performance Analysis Tool** for JavaScript/TypeScript projects with config support, JSON output, and glob patterns.

[![npm version](https://img.shields.io/npm/v/perf-wizard.svg)](https://www.npmjs.com/package/perf-wizard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🔍 **Real code analysis** - No fake data, authentic performance insights
- ⚙️ **Config file support** - `.perf-wizardrc` for custom settings
- 📊 **Multiple output formats** - Console, JSON, Summary
- 🎯 **Glob pattern support** - Analyze specific file patterns
- 🚫 **Smart exclusions** - Auto-ignore node_modules, dist, etc.
- 📈 **Cyclomatic complexity** - Code complexity analysis
- 🧠 **Memory monitoring** - Real-time memory usage tracking
- ⚡ **Fast execution** - Optimized for large codebases

## 📦 Installation

```bash
npm install -g perf-wizard
```

## 🚀 Quick Start

```bash
# Analyze current directory
perf-wizard

# Analyze specific file
perf-wizard --file src/index.js

# Analyze with glob pattern
perf-wizard --glob "src/**/*.js"

# JSON output for CI/CD
perf-wizard --json > analysis.json

# Summary only
perf-wizard --summary
```

## 📖 Usage

### Basic Commands

```bash
perf-wizard [options]

Options:
  --about                        Show application information
  -f, --file <path>             Analyze specific file
  -d, --dir <path>              Analyze directory
  -g, --glob <pattern>          Use glob pattern (e.g., "src/**/*.js")
  --json                        Output results in JSON format
  --summary                     Show only summary
  --quiet                       Minimal output
  --debug                       Verbose debug output
  --memory                      Memory usage analysis
  --exclude <patterns>          Comma-separated exclude patterns
  --threshold-size <bytes>      File size threshold in bytes
  --threshold-functions <count> Function count threshold
```

### Examples

```bash
# Analyze TypeScript files in src/
perf-wizard --glob "src/**/*.ts"

# Analyze with custom threshold
perf-wizard --threshold-size 50000 --threshold-functions 15

# Exclude additional patterns
perf-wizard --exclude "test,spec,*.test.js"

# Memory analysis
perf-wizard --memory

# Debug output
perf-wizard --debug --dir src/
```

## ⚙️ Configuration

Create `.perf-wizardrc` in your project root:

```json
{
  "exclude": [
    "node_modules",
    "dist",
    "build",
    ".git",
    "coverage",
    "*.min.js"
  ],
  "thresholds": {
    "fileSize": 100000,
    "functions": 20,
    "loops": 10,
    "lines": 1000
  },
  "outputFormat": "console",
  "logLevel": "info"
}
```

## 📊 Output Examples

### Console Output
```
🔍 Performance Analysis Results

📁 src/utils/helper.js
   Size: 15.2 KB | Type: JS
   Lines: 450 | Functions: 12 | Complexity: 8
   ✅ Code structure looks optimized

📊 Summary
✨ Analyzed: 25 files (156.8 KB)
✅ No warnings found
⏱️  Execution time: 145ms
```

### JSON Output
```json
{
  "summary": {
    "totalFiles": 25,
    "totalSize": "156.8 KB",
    "warnings": 0,
    "executionTime": "145ms"
  },
  "results": [...],
  "version": "2.1.0-production"
}
```

## 🔧 CI/CD Integration

### GitHub Actions
```yaml
- name: Performance Analysis
  run: |
    npm install -g perf-wizard
    perf-wizard --json > perf-analysis.json
    perf-wizard --summary
```

## 📄 License

MIT License - Created by **Arie Syahrial** ([@arisyh7](https://github.com/arisyh7))

---

⭐ **Star this repository if you find it helpful!**
