#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const glob = require('glob');

const VERSION = '2.1.0-production';

// Configuration Management
class ConfigManager {
  constructor() {
    this.defaultConfig = {
      exclude: ['node_modules', 'dist', 'build', '.git', 'coverage', '.nyc_output'],
      thresholds: {
        fileSize: 100000, // 100KB
        functions: 20,
        loops: 10,
        lines: 1000
      },
      outputFormat: 'console', // console | json | summary
      logLevel: 'info' // quiet | info | debug
    };
    this.config = this.loadConfig();
  }

  loadConfig() {
    const configPaths = [
      path.join(process.cwd(), '.perf-wizardrc'),
      path.join(process.cwd(), '.perf-wizardrc.json'),
      path.join(process.cwd(), 'perf-wizard.config.js')
    ];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          return { ...this.defaultConfig, ...config };
        } catch (error) {
          console.warn(chalk.yellow(`⚠️  Invalid config file: ${configPath}`));
        }
      }
    }

    return this.defaultConfig;
  }
}

// Enhanced Analysis Engine
class PerformanceAnalyzer {
  constructor(config) {
    this.config = config;
    this.results = [];
    this.startTime = Date.now();
  }

  shouldExclude(filePath) {
    return this.config.exclude.some(pattern => 
      filePath.includes(pattern) || path.basename(filePath).startsWith('.')
    );
  }

  analyzeJavaScript(filePath, content) {
    const analysis = {
      lines: content.split('\n').length,
      chars: content.length,
      functions: (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*\{/g) || []).length,
      loops: (content.match(/for\s*\(|while\s*\(|forEach\(|map\(|filter\(/g) || []).length,
      imports: (content.match(/import\s+.*from|require\s*\(/g) || []).length,
      complexity: this.calculateComplexity(content)
    };

    return analysis;
  }

  calculateComplexity(content) {
    const complexityKeywords = [
      /if\s*\(/g, /else/g, /for\s*\(/g, /while\s*\(/g, 
      /switch\s*\(/g, /case\s+/g, /catch\s*\(/g, /\?\s*:/g
    ];
    
    return complexityKeywords.reduce((total, regex) => {
      return total + (content.match(regex) || []).length;
    }, 1);
  }

  generateSuggestions(analysis, filePath) {
    const suggestions = [];
    const { thresholds } = this.config;
    const ext = path.extname(filePath);

    if (analysis.size > thresholds.fileSize) {
      suggestions.push({
        type: 'warning',
        message: `File size (${(analysis.size/1024).toFixed(1)}KB) exceeds threshold (${(thresholds.fileSize/1024).toFixed(1)}KB)`
      });
    }

    if (ext === '.js' || ext === '.ts') {
      if (analysis.details.functions > thresholds.functions) {
        suggestions.push({
          type: 'warning',
          message: `High function count (${analysis.details.functions}) - consider modularization`
        });
      }

      if (analysis.details.loops > thresholds.loops) {
        suggestions.push({
          type: 'info',
          message: `Multiple loops detected (${analysis.details.loops}) - review for performance`
        });
      }

      if (analysis.details.lines > thresholds.lines) {
        suggestions.push({
          type: 'warning',
          message: `Large file (${analysis.details.lines} lines) - consider splitting`
        });
      }

      if (analysis.details.complexity > 15) {
        suggestions.push({
          type: 'warning',
          message: `High cyclomatic complexity (${analysis.details.complexity}) - consider refactoring`
        });
      }
    }

    if (suggestions.length === 0) {
      suggestions.push({
        type: 'success',
        message: 'Code structure looks optimized'
      });
    }

    return suggestions;
  }

  analyzeFile(filePath) {
    if (this.shouldExclude(filePath)) {
      return null;
    }

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath);
    const size = stats.size;

    let details = null;
    let content = '';

    if (['.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte'].includes(ext)) {
      try {
        content = fs.readFileSync(filePath, 'utf8');
        details = this.analyzeJavaScript(filePath, content);
      } catch (error) {
        // Skip unreadable files
        return null;
      }
    }

    const analysis = {
      file: path.relative(process.cwd(), filePath),
      fullPath: filePath,
      size: size,
      sizeFormatted: this.formatSize(size),
      type: ext.slice(1).toUpperCase() || 'FILE',
      details: details,
      timestamp: new Date().toISOString()
    };

    analysis.suggestions = this.generateSuggestions(analysis, filePath);
    return analysis;
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  analyzePattern(pattern) {
    const files = glob.sync(pattern, { 
      ignore: this.config.exclude.map(ex => `**/${ex}/**`)
    });

    this.log('debug', `Found ${files.length} files matching pattern: ${pattern}`);

    const results = [];
    for (const file of files) {
      const analysis = this.analyzeFile(file);
      if (analysis) {
        results.push(analysis);
        this.results.push(analysis);
      }
    }

    return results;
  }

  generateSummary() {
    const totalFiles = this.results.length;
    const totalSize = this.results.reduce((sum, r) => sum + r.size, 0);
    const warnings = this.results.reduce((sum, r) => 
      sum + r.suggestions.filter(s => s.type === 'warning').length, 0
    );
    const executionTime = Date.now() - this.startTime;

    return {
      totalFiles,
      totalSize: this.formatSize(totalSize),
      warnings,
      executionTime: `${executionTime}ms`,
      timestamp: new Date().toISOString()
    };
  }

  log(level, message) {
    const levels = { quiet: 0, info: 1, debug: 2 };
    const currentLevel = levels[this.config.logLevel] || 1;
    const messageLevel = levels[level] || 1;

    if (messageLevel <= currentLevel) {
      console.log(message);
    }
  }
}

// Output Formatters
class OutputFormatter {
  static console(results, summary, config) {
    if (config.logLevel === 'quiet') {
      return OutputFormatter.summary(summary);
    }

    console.log(chalk.cyan.bold('\n🔍 Performance Analysis Results\n'));

    results.forEach(result => {
      console.log(chalk.blue(`📁 ${result.file}`));
      console.log(chalk.yellow(`   Size: ${result.sizeFormatted} | Type: ${result.type}`));
      
      if (result.details) {
        console.log(chalk.magenta(`   Lines: ${result.details.lines} | Functions: ${result.details.functions} | Complexity: ${result.details.complexity}`));
      }

      result.suggestions.forEach(suggestion => {
        const icon = suggestion.type === 'warning' ? '⚠️' : 
                    suggestion.type === 'success' ? '✅' : '💡';
        const color = suggestion.type === 'warning' ? chalk.red : 
                     suggestion.type === 'success' ? chalk.green : chalk.cyan;
        console.log(color(`   ${icon} ${suggestion.message}`));
      });
      
      console.log('');
    });

    OutputFormatter.summary(summary);
  }

  static json(results, summary) {
    const output = {
      summary,
      results,
      version: VERSION
    };
    console.log(JSON.stringify(output, null, 2));
  }

  static summary(summary) {
    console.log(chalk.cyan.bold('📊 Summary'));
    console.log(chalk.green(`✨ Analyzed: ${summary.totalFiles} files (${summary.totalSize})`));
    
    if (summary.warnings > 0) {
      console.log(chalk.yellow(`⚠️  Warnings: ${summary.warnings}`));
    } else {
      console.log(chalk.green('✅ No warnings found'));
    }
    
    console.log(chalk.blue(`⏱️  Execution time: ${summary.executionTime}`));
  }
}

// CLI Setup
const config = new ConfigManager();

program
  .version(VERSION)
  .description('🚀 Perf-Wizard - Professional Performance Analysis Tool')
  .option('--about', 'Show application information')
  .option('-f, --file <path>', 'Analyze specific file')
  .option('-d, --dir <path>', 'Analyze directory')
  .option('-g, --glob <pattern>', 'Analyze files using glob pattern (e.g., "src/**/*.js")')
  .option('--json', 'Output results in JSON format')
  .option('--summary', 'Show only summary')
  .option('--config <path>', 'Use custom config file')
  .option('--quiet', 'Minimal output')
  .option('--debug', 'Verbose debug output')
  .option('--memory', 'Memory usage analysis')
  .option('--exclude <patterns>', 'Comma-separated exclude patterns', (value) => value.split(','))
  .option('--threshold-size <bytes>', 'File size threshold in bytes', parseInt)
  .option('--threshold-functions <count>', 'Function count threshold', parseInt);

program.action((options) => {
  // Override config with CLI options
  if (options.quiet) config.config.logLevel = 'quiet';
  if (options.debug) config.config.logLevel = 'debug';
  if (options.exclude) config.config.exclude = [...config.config.exclude, ...options.exclude];
  if (options.thresholdSize) config.config.thresholds.fileSize = options.thresholdSize;
  if (options.thresholdFunctions) config.config.thresholds.functions = options.thresholdFunctions;

  const analyzer = new PerformanceAnalyzer(config.config);

  if (options.about) {
    console.log(chalk.cyan.bold(`🚀 Perf-Wizard v${VERSION}`));
    console.log(chalk.green('🏆 Professional Performance Analysis Tool'));
    console.log(chalk.yellow('📊 Real code analysis with actionable insights'));
    console.log(chalk.blue('💡 Production-ready with config support'));
    console.log(chalk.magenta('⚙️  Config file: .perf-wizardrc (optional)'));
    return;
  }

  if (options.memory) {
    const memUsage = process.memoryUsage();
    console.log(chalk.cyan.bold('🧠 Memory Analysis'));
    console.log(chalk.green(`✅ RSS: ${analyzer.formatSize(memUsage.rss)}`));
    console.log(chalk.green(`✅ Heap Used: ${analyzer.formatSize(memUsage.heapUsed)}`));
    console.log(chalk.green(`✅ Heap Total: ${analyzer.formatSize(memUsage.heapTotal)}`));
    console.log(chalk.green(`✅ External: ${analyzer.formatSize(memUsage.external)}`));
    console.log(chalk.yellow('💡 Memory usage monitored'));
    return;
  }

  let results = [];

  if (options.file) {
    const analysis = analyzer.analyzeFile(options.file);
    if (analysis) results.push(analysis);
  } else if (options.dir) {
    results = analyzer.analyzePattern(path.join(options.dir, '**/*'));
  } else if (options.glob) {
    results = analyzer.analyzePattern(options.glob);
  } else {
    // Default: analyze current directory
    results = analyzer.analyzePattern('**/*');
  }

  if (results.length === 0) {
    console.log(chalk.yellow('ℹ️  No files found to analyze'));
    return;
  }

  const summary = analyzer.generateSummary();

  if (options.json) {
    OutputFormatter.json(results, summary);
  } else if (options.summary) {
    OutputFormatter.summary(summary);
  } else {
    OutputFormatter.console(results, summary, config.config);
  }
});

program.parse();
