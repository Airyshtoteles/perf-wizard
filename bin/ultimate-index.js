#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const glob = require('glob');
const AdvancedCodeAnalyzer = require('../lib/AdvancedCodeAnalyzer');

const VERSION = '3.0.0-ultimate';

// Enhanced Configuration Management
class ConfigManager {
  constructor() {
    this.defaultConfig = {
      exclude: ['node_modules', 'dist', 'build', '.git', 'coverage', '.nyc_output', '*.min.js'],
      thresholds: {
        fileSize: 100000,
        functions: 20,
        loops: 10,
        lines: 1000,
        performanceScore: 80,
        bundleSize: 500000
      },
      analysis: {
        react: true,
        vue: true,
        angular: false,
        bundleImpact: true,
        memoryLeaks: true,
        performance: true,
        accessibility: false
      },
      outputFormat: 'console',
      logLevel: 'info',
      autofix: false
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
          let config;
          if (configPath.endsWith('.js')) {
            delete require.cache[require.resolve(configPath)];
            config = require(configPath);
          } else {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          }
          return { ...this.defaultConfig, ...config };
        } catch (error) {
          console.warn(chalk.yellow(`⚠️  Invalid config file: ${configPath}`));
        }
      }
    }

    return this.defaultConfig;
  }
}

// Ultimate Performance Analyzer
class UltimatePerformanceAnalyzer {
  constructor(config) {
    this.config = config;
    this.results = [];
    this.startTime = Date.now();
    this.advancedAnalyzer = new AdvancedCodeAnalyzer();
    this.totalScore = 0;
    this.issueCount = { high: 0, medium: 0, low: 0 };
  }

  shouldExclude(filePath) {
    return this.config.exclude.some(pattern => 
      filePath.includes(pattern) || 
      path.basename(filePath).startsWith('.') ||
      filePath.includes('test') ||
      filePath.includes('spec')
    );
  }

  async analyzeFile(filePath) {
    if (this.shouldExclude(filePath)) {
      return null;
    }

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath);
    const size = stats.size;

    // Skip binary files and very large files
    if (size > 5000000 || this.isBinaryFile(ext)) {
      return null;
    }

    let content = '';
    let advancedAnalysis = null;

    if (['.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte'].includes(ext)) {
      try {
        content = fs.readFileSync(filePath, 'utf8');
        
        // Advanced AST analysis
        if (this.config.analysis.performance) {
          advancedAnalysis = this.advancedAnalyzer.analyzeCode(content, filePath);
        }
      } catch (error) {
        this.log('debug', `Error reading file ${filePath}: ${error.message}`);
        return null;
      }
    }

    const analysis = {
      file: path.relative(process.cwd(), filePath),
      fullPath: filePath,
      size: size,
      sizeFormatted: this.formatSize(size),
      type: ext.slice(1).toUpperCase() || 'FILE',
      timestamp: new Date().toISOString(),
      advanced: advancedAnalysis,
      traditionalAnalysis: this.getTraditionalAnalysis(content, filePath)
    };

    // Generate comprehensive suggestions
    analysis.suggestions = this.generateComprehensiveSuggestions(analysis);
    analysis.performanceScore = this.calculateOverallScore(analysis);
    
    // Update global stats
    this.updateGlobalStats(analysis);

    return analysis;
  }

  getTraditionalAnalysis(content, filePath) {
    if (!content) return null;

    return {
      lines: content.split('\n').length,
      chars: content.length,
      functions: (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*\{/g) || []).length,
      loops: (content.match(/for\s*\(|while\s*\(|forEach\(|map\(|filter\(/g) || []).length,
      imports: (content.match(/import\s+.*from|require\s*\(/g) || []).length,
      complexity: this.calculateBasicComplexity(content),
      todos: (content.match(/TODO|FIXME|XXX/gi) || []).length,
      duplicatedCode: this.detectDuplicatedCode(content)
    };
  }

  calculateBasicComplexity(content) {
    const complexityKeywords = [
      /if\s*\(/g, /else/g, /for\s*\(/g, /while\s*\(/g, 
      /switch\s*\(/g, /case\s+/g, /catch\s*\(/g, /\?\s*:/g
    ];
    
    return complexityKeywords.reduce((total, regex) => {
      return total + (content.match(regex) || []).length;
    }, 1);
  }

  detectDuplicatedCode(content) {
    const lines = content.split('\n').filter(line => line.trim().length > 10);
    const duplicates = [];
    const seen = new Map();

    lines.forEach((line, index) => {
      const normalized = line.trim().replace(/\s+/g, ' ');
      if (seen.has(normalized)) {
        duplicates.push({
          line: index + 1,
          content: normalized,
          firstOccurrence: seen.get(normalized)
        });
      } else {
        seen.set(normalized, index + 1);
      }
    });

    return duplicates.length;
  }

  generateComprehensiveSuggestions(analysis) {
    const suggestions = [];
    const { thresholds } = this.config;

    // Traditional analysis suggestions
    if (analysis.traditionalAnalysis) {
      const trad = analysis.traditionalAnalysis;
      
      if (analysis.size > thresholds.fileSize) {
        suggestions.push({
          type: 'warning',
          category: 'size',
          severity: 'high',
          message: `Large file size (${analysis.sizeFormatted}) - consider splitting`,
          impact: 'Bundle size, loading time',
          autofix: false
        });
      }

      if (trad.functions > thresholds.functions) {
        suggestions.push({
          type: 'warning',
          category: 'maintainability',
          severity: 'medium',
          message: `High function count (${trad.functions}) - consider modularization`,
          impact: 'Code maintainability, testing complexity',
          autofix: false
        });
      }

      if (trad.complexity > 15) {
        suggestions.push({
          type: 'warning',
          category: 'complexity',
          severity: 'high',
          message: `High cyclomatic complexity (${trad.complexity}) - refactor needed`,
          impact: 'Code maintainability, bug risk',
          autofix: false
        });
      }

      if (trad.duplicatedCode > 5) {
        suggestions.push({
          type: 'info',
          category: 'duplication',
          severity: 'medium',
          message: `Duplicated code detected (${trad.duplicatedCode} instances)`,
          impact: 'Maintainability, bundle size',
          autofix: true
        });
      }

      if (trad.todos > 0) {
        suggestions.push({
          type: 'info',
          category: 'maintenance',
          severity: 'low',
          message: `${trad.todos} TODO/FIXME comments found`,
          impact: 'Code completion status',
          autofix: false
        });
      }
    }

    // Advanced analysis suggestions
    if (analysis.advanced) {
      const advanced = analysis.advanced;

      // Performance bottlenecks
      if (advanced.performance.bottlenecks) {
        advanced.performance.bottlenecks.forEach(bottleneck => {
          suggestions.push({
            type: 'warning',
            category: 'performance',
            severity: bottleneck.severity,
            message: bottleneck.message,
            impact: 'Runtime performance',
            line: bottleneck.line,
            suggestion: bottleneck.suggestion,
            autofix: false
          });
        });
      }

      // Memory leaks
      advanced.memoryLeaks.forEach(leak => {
        suggestions.push({
          type: 'error',
          category: 'memory',
          severity: leak.severity,
          message: leak.message,
          impact: 'Memory usage, potential crashes',
          line: leak.line,
          suggestion: leak.suggestion,
          autofix: false
        });
      });

      // Bundle impact
      if (advanced.bundleImpact.heavyImports) {
        advanced.bundleImpact.heavyImports.forEach(heavyImport => {
          suggestions.push({
            type: 'warning',
            category: 'bundle',
            severity: 'medium',
            message: `Heavy dependency: ${heavyImport.library} (${heavyImport.estimatedSize})`,
            impact: 'Bundle size, loading time',
            suggestion: heavyImport.alternative,
            autofix: false
          });
        });
      }

      // React-specific issues
      if (advanced.performance.react) {
        const react = advanced.performance.react;
        
        if (react.issues) {
          react.issues.forEach(issue => {
            suggestions.push({
              type: 'warning',
              category: 'react',
              severity: 'medium',
              message: issue.message || 'React performance issue detected',
              impact: 'Component performance, re-renders',
              autofix: false
            });
          });
        }

        if (react.recommendations) {
          react.recommendations.forEach(rec => {
            suggestions.push({
              type: 'info',
              category: 'react-optimization',
              severity: 'low',
              message: rec.message || 'React optimization opportunity',
              impact: 'Component performance',
              autofix: true
            });
          });
        }
      }
    }

    // If no issues found
    if (suggestions.length === 0) {
      suggestions.push({
        type: 'success',
        category: 'quality',
        severity: 'info',
        message: 'Code structure looks well optimized! 🎉',
        impact: 'No performance concerns detected',
        autofix: false
      });
    }

    return suggestions;
  }

  calculateOverallScore(analysis) {
    if (analysis.advanced && analysis.advanced.performanceScore !== undefined) {
      return analysis.advanced.performanceScore;
    }

    // Fallback scoring for non-JS files
    let score = 100;
    
    if (analysis.size > this.config.thresholds.fileSize) {
      score -= 10;
    }

    if (analysis.traditionalAnalysis) {
      const trad = analysis.traditionalAnalysis;
      if (trad.complexity > 15) score -= 20;
      if (trad.functions > this.config.thresholds.functions) score -= 10;
      if (trad.duplicatedCode > 5) score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  updateGlobalStats(analysis) {
    this.totalScore += analysis.performanceScore;
    
    analysis.suggestions.forEach(suggestion => {
      if (suggestion.severity === 'high') this.issueCount.high++;
      else if (suggestion.severity === 'medium') this.issueCount.medium++;
      else if (suggestion.severity === 'low') this.issueCount.low++;
    });
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  isBinaryFile(ext) {
    const binaryExts = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.zip', '.tar', '.gz'];
    return binaryExts.includes(ext.toLowerCase());
  }

  async analyzePattern(pattern) {
    const files = glob.sync(pattern, { 
      ignore: this.config.exclude.map(ex => `**/${ex}/**`)
    });

    this.log('debug', `Found ${files.length} files matching pattern: ${pattern}`);

    const results = [];
    for (const file of files) {
      const analysis = await this.analyzeFile(file);
      if (analysis) {
        results.push(analysis);
        this.results.push(analysis);
      }
    }

    return results;
  }

  generateUltimateSummary() {
    const totalFiles = this.results.length;
    const totalSize = this.results.reduce((sum, r) => sum + r.size, 0);
    const averageScore = totalFiles > 0 ? Math.round(this.totalScore / totalFiles) : 0;
    const executionTime = Date.now() - this.startTime;

    // Performance grade
    let grade = 'F';
    if (averageScore >= 90) grade = 'A+';
    else if (averageScore >= 80) grade = 'A';
    else if (averageScore >= 70) grade = 'B';
    else if (averageScore >= 60) grade = 'C';
    else if (averageScore >= 50) grade = 'D';

    // Top issues
    const topIssues = this.results
      .flatMap(r => r.suggestions.filter(s => s.severity === 'high'))
      .slice(0, 5);

    // Bundle analysis
    const jsFiles = this.results.filter(r => ['.js', '.ts', '.jsx', '.tsx'].includes(path.extname(r.fullPath)));
    const estimatedBundleSize = jsFiles.reduce((sum, file) => sum + file.size, 0);

    return {
      totalFiles,
      totalSize: this.formatSize(totalSize),
      averageScore,
      grade,
      issues: this.issueCount,
      executionTime: `${executionTime}ms`,
      estimatedBundleSize: this.formatSize(estimatedBundleSize),
      topIssues,
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

// Enhanced Output Formatters
class UltimateOutputFormatter {
  static console(results, summary, config) {
    if (config.logLevel === 'quiet') {
      return UltimateOutputFormatter.summary(summary);
    }

    console.log(chalk.cyan.bold('\n🚀 Ultimate Performance Analysis Results\n'));

    // Performance overview
    const gradeColor = summary.grade === 'A+' || summary.grade === 'A' ? chalk.green :
                      summary.grade === 'B' ? chalk.yellow : chalk.red;
    
    console.log(chalk.blue('📊 Performance Overview'));
    console.log(gradeColor(`   Grade: ${summary.grade} (Score: ${summary.averageScore}/100)`));
    console.log(chalk.yellow(`   Bundle Size: ${summary.estimatedBundleSize}`));
    console.log('');

    // Top issues
    if (summary.topIssues.length > 0) {
      console.log(chalk.red.bold('🚨 Critical Issues to Fix:'));
      summary.topIssues.forEach((issue, index) => {
        console.log(chalk.red(`   ${index + 1}. ${issue.message}`));
        if (issue.suggestion) {
          console.log(chalk.blue(`      💡 ${issue.suggestion}`));
        }
      });
      console.log('');
    }

    // File details
    results.forEach(result => {
      const scoreColor = result.performanceScore >= 80 ? chalk.green :
                        result.performanceScore >= 60 ? chalk.yellow : chalk.red;
      
      console.log(chalk.blue(`📁 ${result.file}`));
      console.log(chalk.yellow(`   Size: ${result.sizeFormatted} | Type: ${result.type} | `));
      console.log(scoreColor(`   Performance Score: ${result.performanceScore}/100`));
      
      if (result.traditionalAnalysis) {
        const trad = result.traditionalAnalysis;
        console.log(chalk.magenta(`   Lines: ${trad.lines} | Functions: ${trad.functions} | Complexity: ${trad.complexity}`));
      }

      // Show critical suggestions only
      const criticalSuggestions = result.suggestions.filter(s => s.severity === 'high');
      criticalSuggestions.forEach(suggestion => {
        const icon = suggestion.type === 'error' ? '🚨' : '⚠️';
        console.log(chalk.red(`   ${icon} ${suggestion.message}`));
        if (suggestion.line) {
          console.log(chalk.gray(`      Line ${suggestion.line}`));
        }
      });
      
      console.log('');
    });

    UltimateOutputFormatter.summary(summary);
  }

  static json(results, summary) {
    const output = {
      summary,
      results,
      version: VERSION,
      generatedAt: new Date().toISOString()
    };
    console.log(JSON.stringify(output, null, 2));
  }

  static summary(summary) {
    console.log(chalk.cyan.bold('📊 Ultimate Performance Summary'));
    
    const gradeColor = summary.grade === 'A+' || summary.grade === 'A' ? chalk.green :
                      summary.grade === 'B' ? chalk.yellow : chalk.red;
    
    console.log(gradeColor(`🏆 Overall Grade: ${summary.grade} (${summary.averageScore}/100)`));
    console.log(chalk.green(`📁 Analyzed: ${summary.totalFiles} files (${summary.totalSize})`));
    console.log(chalk.blue(`📦 Estimated Bundle: ${summary.estimatedBundleSize}`));
    
    if (summary.issues.high > 0) {
      console.log(chalk.red(`🚨 High Priority Issues: ${summary.issues.high}`));
    }
    if (summary.issues.medium > 0) {
      console.log(chalk.yellow(`⚠️  Medium Priority Issues: ${summary.issues.medium}`));
    }
    if (summary.issues.low > 0) {
      console.log(chalk.blue(`💡 Optimization Opportunities: ${summary.issues.low}`));
    }
    
    if (summary.issues.high === 0 && summary.issues.medium === 0) {
      console.log(chalk.green('✅ No critical issues found - Great job! 🎉'));
    }
    
    console.log(chalk.blue(`⏱️  Execution time: ${summary.executionTime}`));
  }

  static detailed(results, summary, config) {
    UltimateOutputFormatter.console(results, summary, config);
    
    // Additional detailed analysis
    console.log(chalk.cyan.bold('\n🔍 Detailed Analysis Report\n'));
    
    results.forEach(result => {
      if (result.suggestions.length === 1 && result.suggestions[0].type === 'success') {
        return; // Skip files with no issues
      }
      
      console.log(chalk.blue.bold(`📋 ${result.file} - Detailed Report`));
      
      // Group suggestions by category
      const categories = {};
      result.suggestions.forEach(suggestion => {
        if (!categories[suggestion.category]) {
          categories[suggestion.category] = [];
        }
        categories[suggestion.category].push(suggestion);
      });
      
      Object.entries(categories).forEach(([category, suggestions]) => {
        console.log(chalk.yellow(`\n  🏷️  ${category.toUpperCase()}`));
        suggestions.forEach(suggestion => {
          const icon = suggestion.severity === 'high' ? '🚨' :
                      suggestion.severity === 'medium' ? '⚠️' : '💡';
          console.log(`    ${icon} ${suggestion.message}`);
          console.log(chalk.gray(`       Impact: ${suggestion.impact}`));
          if (suggestion.suggestion) {
            console.log(chalk.blue(`       Solution: ${suggestion.suggestion}`));
          }
          if (suggestion.autofix) {
            console.log(chalk.green(`       🔧 Auto-fixable`));
          }
        });
      });
      
      console.log('');
    });
  }
}

// CLI Setup
const config = new ConfigManager();

program
  .version(VERSION)
  .description('🚀 Perf-Wizard Ultimate - World-Class Performance Analysis Tool')
  .option('--about', 'Show application information')
  .option('-f, --file <path>', 'Analyze specific file')
  .option('-d, --dir <path>', 'Analyze directory')
  .option('-g, --glob <pattern>', 'Analyze files using glob pattern (e.g., "src/**/*.js")')
  .option('--json', 'Output results in JSON format')
  .option('--summary', 'Show only summary')
  .option('--detailed', 'Show detailed analysis report')
  .option('--config <path>', 'Use custom config file')
  .option('--quiet', 'Minimal output')
  .option('--debug', 'Verbose debug output')
  .option('--memory', 'Memory usage analysis')
  .option('--score-threshold <number>', 'Minimum performance score threshold', parseInt)
  .option('--exclude <patterns>', 'Comma-separated exclude patterns', (value) => value.split(','))
  .option('--react', 'Enable React-specific analysis')
  .option('--vue', 'Enable Vue-specific analysis')
  .option('--autofix', 'Enable auto-fix suggestions (experimental)')
  .option('--ci', 'CI mode - exit with error code if score below threshold');

program.action(async (options) => {
  // Override config with CLI options
  if (options.quiet) config.config.logLevel = 'quiet';
  if (options.debug) config.config.logLevel = 'debug';
  if (options.exclude) config.config.exclude = [...config.config.exclude, ...options.exclude];
  if (options.scoreThreshold) config.config.thresholds.performanceScore = options.scoreThreshold;
  if (options.react) config.config.analysis.react = true;
  if (options.vue) config.config.analysis.vue = true;
  if (options.autofix) config.config.autofix = true;

  const analyzer = new UltimatePerformanceAnalyzer(config.config);

  if (options.about) {
    console.log(chalk.cyan.bold(`🚀 Perf-Wizard Ultimate v${VERSION}`));
    console.log(chalk.green('🏆 World-Class Performance Analysis Tool'));
    console.log(chalk.yellow('🔍 Advanced AST analysis with React/Vue optimization'));
    console.log(chalk.blue('📊 Bundle impact analysis & memory leak detection'));
    console.log(chalk.magenta('⚡ Performance scoring & auto-fix suggestions'));
    console.log(chalk.cyan('🎯 Production-ready for CI/CD pipelines'));
    console.log(chalk.white('\n📚 Features:'));
    console.log(chalk.white('  • React/Vue component optimization'));
    console.log(chalk.white('  • Bundle size impact analysis'));
    console.log(chalk.white('  • Memory leak detection'));
    console.log(chalk.white('  • Performance bottleneck identification'));
    console.log(chalk.white('  • Cyclomatic complexity analysis'));
    console.log(chalk.white('  • Auto-fix suggestions'));
    return;
  }

  if (options.memory) {
    const memUsage = process.memoryUsage();
    console.log(chalk.cyan.bold('🧠 Ultimate Memory Analysis'));
    console.log(chalk.green(`✅ RSS: ${analyzer.formatSize(memUsage.rss)}`));
    console.log(chalk.green(`✅ Heap Used: ${analyzer.formatSize(memUsage.heapUsed)}`));
    console.log(chalk.green(`✅ Heap Total: ${analyzer.formatSize(memUsage.heapTotal)}`));
    console.log(chalk.green(`✅ External: ${analyzer.formatSize(memUsage.external)}`));
    console.log(chalk.yellow('💡 Memory usage monitored in real-time'));
    return;
  }

  let results = [];

  try {
    if (options.file) {
      const analysis = await analyzer.analyzeFile(options.file);
      if (analysis) results.push(analysis);
    } else if (options.dir) {
      results = await analyzer.analyzePattern(path.join(options.dir, '**/*'));
    } else if (options.glob) {
      results = await analyzer.analyzePattern(options.glob);
    } else {
      // Default: analyze current directory
      results = await analyzer.analyzePattern('**/*');
    }

    if (results.length === 0) {
      console.log(chalk.yellow('ℹ️  No files found to analyze'));
      return;
    }

    const summary = analyzer.generateUltimateSummary();

    if (options.json) {
      UltimateOutputFormatter.json(results, summary);
    } else if (options.summary) {
      UltimateOutputFormatter.summary(summary);
    } else if (options.detailed) {
      UltimateOutputFormatter.detailed(results, summary, config.config);
    } else {
      UltimateOutputFormatter.console(results, summary, config.config);
    }

    // CI mode - exit with error if below threshold
    if (options.ci && summary.averageScore < config.config.thresholds.performanceScore) {
      console.log(chalk.red(`\n❌ CI Failed: Performance score ${summary.averageScore} below threshold ${config.config.thresholds.performanceScore}`));
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.red(`💥 Analysis failed: ${error.message}`));
    if (options.debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }
});

program.parse();
