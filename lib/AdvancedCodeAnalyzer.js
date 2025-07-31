const babel = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

class AdvancedCodeAnalyzer {
  constructor() {
    this.performanceIssues = [];
    this.optimizations = [];
  }

  // React-specific analysis
  analyzeReactComponent(code, filePath) {
    try {
      const ast = babel.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'decorators-legacy']
      });

      const issues = [];
      const recommendations = [];

      traverse(ast, {
        // Detect React anti-patterns
        FunctionDeclaration(path) {
          if (this.isReactComponent(path.node)) {
            // Check for inline object creation in props
            this.checkInlineObjects(path, issues);
            // Check for expensive operations in render
            this.checkExpensiveRender(path, issues);
            // Check for missing React.memo opportunities
            this.checkMemoOpportunities(path, recommendations);
          }
        },

        // Detect hooks issues
        CallExpression(path) {
          if (this.isHook(path.node)) {
            this.analyzeHookUsage(path, issues, recommendations);
          }
        },

        // Detect unnecessary re-renders
        JSXElement(path) {
          this.checkJSXOptimizations(path, recommendations);
        }
      });

      return { issues, recommendations };
    } catch (error) {
      return { issues: [], recommendations: [], error: error.message };
    }
  }

  // Bundle size impact analysis
  analyzeBundleImpact(code, filePath) {
    const imports = [];
    const heavyImports = [];
    
    try {
      const ast = babel.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
      });

      traverse(ast, {
        ImportDeclaration(path) {
          const source = path.node.source.value;
          const specifiers = path.node.specifiers;
          
          imports.push({
            source,
            specifiers: specifiers.map(s => s.local.name),
            isDefaultImport: specifiers.some(s => t.isImportDefaultSpecifier(s)),
            isNamespaceImport: specifiers.some(s => t.isImportNamespaceSpecifier(s))
          });

          // Detect heavy libraries
          if (this.isHeavyLibrary(source)) {
            heavyImports.push({
              library: source,
              estimatedSize: this.getLibrarySize(source),
              alternative: this.suggestAlternative(source)
            });
          }
        }
      });

      return { imports, heavyImports };
    } catch (error) {
      return { imports: [], heavyImports: [], error: error.message };
    }
  }

  // Performance bottleneck detection
  detectBottlenecks(code, filePath) {
    const bottlenecks = [];
    
    try {
      const ast = babel.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
      });

      traverse(ast, {
        // Nested loops detection
        ForStatement(path) {
          if (this.hasNestedLoop(path)) {
            bottlenecks.push({
              type: 'nested-loop',
              severity: 'high',
              line: path.node.loc?.start.line,
              message: 'Nested loops detected - O(n²) complexity',
              suggestion: 'Consider using Map/Set for lookups or optimize algorithm'
            });
          }
        },

        // Array method chaining
        CallExpression(path) {
          if (this.isArrayMethodChain(path)) {
            const chainLength = this.getChainLength(path);
            if (chainLength > 3) {
              bottlenecks.push({
                type: 'array-chain',
                severity: 'medium',
                line: path.node.loc?.start.line,
                message: `Long array method chain (${chainLength} methods)`,
                suggestion: 'Consider combining operations or using for-loop for better performance'
              });
            }
          }
        },

        // DOM manipulation in loops
        CallExpression(path) {
          if (this.isDOMManipulation(path) && this.isInLoop(path)) {
            bottlenecks.push({
              type: 'dom-in-loop',
              severity: 'high',
              line: path.node.loc?.start.line,
              message: 'DOM manipulation inside loop',
              suggestion: 'Batch DOM updates outside the loop'
            });
          }
        }
      });

      return bottlenecks;
    } catch (error) {
      return [];
    }
  }

  // Memory leak detection
  detectMemoryLeaks(code, filePath) {
    const leaks = [];
    
    try {
      const ast = babel.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
      });

      traverse(ast, {
        // Event listener without cleanup
        CallExpression(path) {
          if (this.isEventListener(path.node)) {
            const hasCleanup = this.hasEventCleanup(path);
            if (!hasCleanup) {
              leaks.push({
                type: 'event-listener',
                severity: 'medium',
                line: path.node.loc?.start.line,
                message: 'Event listener without cleanup',
                suggestion: 'Add removeEventListener in cleanup function'
              });
            }
          }
        },

        // Timer without cleanup
        CallExpression(path) {
          if (this.isTimer(path.node)) {
            const hasCleanup = this.hasTimerCleanup(path);
            if (!hasCleanup) {
              leaks.push({
                type: 'timer',
                severity: 'medium',
                line: path.node.loc?.start.line,
                message: 'Timer without cleanup',
                suggestion: 'Store timer ID and clear in cleanup'
              });
            }
          }
        }
      });

      return leaks;
    } catch (error) {
      return [];
    }
  }

  // Helper methods
  isReactComponent(node) {
    return node.type === 'FunctionDeclaration' && 
           node.id && 
           /^[A-Z]/.test(node.id.name);
  }

  isHook(node) {
    return node.type === 'CallExpression' &&
           node.callee.type === 'Identifier' &&
           node.callee.name.startsWith('use');
  }

  isHeavyLibrary(source) {
    const heavyLibs = [
      'lodash', 'moment', 'axios', 'jquery', 'bootstrap', 
      'material-ui', 'antd', 'react-router-dom'
    ];
    return heavyLibs.some(lib => source.includes(lib));
  }

  getLibrarySize(source) {
    const sizes = {
      'lodash': '70KB',
      'moment': '67KB', 
      'jquery': '87KB',
      'bootstrap': '158KB',
      'material-ui': '300KB+',
      'antd': '500KB+'
    };
    
    for (const [lib, size] of Object.entries(sizes)) {
      if (source.includes(lib)) return size;
    }
    return 'Unknown';
  }

  suggestAlternative(source) {
    const alternatives = {
      'lodash': 'Use native ES6 methods or lodash-es for tree shaking',
      'moment': 'Use date-fns or dayjs (2KB vs 67KB)',
      'jquery': 'Use vanilla JavaScript or modern alternatives',
      'bootstrap': 'Use Tailwind CSS or CSS Modules',
      'material-ui': 'Use Mantine or Chakra UI (lighter alternatives)',
      'antd': 'Use individual component imports'
    };
    
    for (const [lib, alt] of Object.entries(alternatives)) {
      if (source.includes(lib)) return alt;
    }
    return 'Consider lighter alternatives';
  }

  hasNestedLoop(path) {
    let hasNested = false;
    path.traverse({
      'ForStatement|WhileStatement|DoWhileStatement'(innerPath) {
        if (innerPath !== path) {
          hasNested = true;
        }
      }
    });
    return hasNested;
  }

  isArrayMethodChain(path) {
    const chainMethods = ['map', 'filter', 'reduce', 'forEach', 'find', 'some', 'every'];
    return path.node.callee && 
           path.node.callee.type === 'MemberExpression' &&
           chainMethods.includes(path.node.callee.property.name);
  }

  getChainLength(path) {
    let length = 0;
    let current = path;
    
    while (current && 
           current.node.callee && 
           current.node.callee.type === 'MemberExpression') {
      length++;
      if (current.node.callee.object.type === 'CallExpression') {
        current = { node: current.node.callee.object };
      } else {
        break;
      }
    }
    
    return length;
  }

  isDOMManipulation(path) {
    const domMethods = [
      'querySelector', 'getElementById', 'appendChild', 
      'innerHTML', 'createElement', 'setAttribute'
    ];
    
    return path.node.callee &&
           ((path.node.callee.type === 'MemberExpression' &&
             domMethods.includes(path.node.callee.property.name)) ||
            (path.node.callee.type === 'Identifier' &&
             domMethods.includes(path.node.callee.name)));
  }

  isInLoop(path) {
    let parent = path.parent;
    while (parent) {
      if (['ForStatement', 'WhileStatement', 'DoWhileStatement'].includes(parent.type)) {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  }

  isEventListener(node) {
    return node.callee &&
           node.callee.type === 'MemberExpression' &&
           node.callee.property.name === 'addEventListener';
  }

  isTimer(node) {
    const timerMethods = ['setTimeout', 'setInterval', 'requestAnimationFrame'];
    return node.callee &&
           node.callee.type === 'Identifier' &&
           timerMethods.includes(node.callee.name);
  }

  hasEventCleanup(path) {
    // Simple heuristic - check if removeEventListener exists in same scope
    let hasCleanup = false;
    const scope = path.scope;
    
    scope.traverse(scope.block, {
      CallExpression(innerPath) {
        if (innerPath.node.callee &&
            innerPath.node.callee.type === 'MemberExpression' &&
            innerPath.node.callee.property.name === 'removeEventListener') {
          hasCleanup = true;
        }
      }
    });
    
    return hasCleanup;
  }

  hasTimerCleanup(path) {
    // Check for clearTimeout/clearInterval in same scope
    let hasCleanup = false;
    const scope = path.scope;
    
    scope.traverse(scope.block, {
      CallExpression(innerPath) {
        if (innerPath.node.callee &&
            innerPath.node.callee.type === 'Identifier' &&
            ['clearTimeout', 'clearInterval', 'cancelAnimationFrame'].includes(innerPath.node.callee.name)) {
          hasCleanup = true;
        }
      }
    });
    
    return hasCleanup;
  }

  // Main analysis method
  analyzeCode(code, filePath) {
    const ext = path.extname(filePath);
    const results = {
      filePath,
      fileType: ext,
      timestamp: new Date().toISOString(),
      performance: {},
      bundleImpact: {},
      memoryLeaks: [],
      recommendations: []
    };

    // React/JSX analysis
    if (['.jsx', '.tsx'].includes(ext) || code.includes('React')) {
      const reactAnalysis = this.analyzeReactComponent(code, filePath);
      results.performance.react = reactAnalysis;
    }

    // Bundle impact analysis
    results.bundleImpact = this.analyzeBundleImpact(code, filePath);

    // Performance bottlenecks
    results.performance.bottlenecks = this.detectBottlenecks(code, filePath);

    // Memory leaks
    results.memoryLeaks = this.detectMemoryLeaks(code, filePath);

    // Generate overall score
    results.performanceScore = this.calculatePerformanceScore(results);

    return results;
  }

  calculatePerformanceScore(results) {
    let score = 100;
    
    // Deduct for bottlenecks
    const bottlenecks = results.performance.bottlenecks || [];
    bottlenecks.forEach(bottleneck => {
      if (bottleneck.severity === 'high') score -= 15;
      else if (bottleneck.severity === 'medium') score -= 8;
      else score -= 3;
    });

    // Deduct for memory leaks
    results.memoryLeaks.forEach(leak => {
      if (leak.severity === 'high') score -= 12;
      else if (leak.severity === 'medium') score -= 6;
      else score -= 2;
    });

    // Deduct for heavy imports
    const heavyImports = results.bundleImpact.heavyImports || [];
    score -= heavyImports.length * 5;

    return Math.max(0, Math.min(100, score));
  }
}

module.exports = AdvancedCodeAnalyzer;
