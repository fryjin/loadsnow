import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const directions: Record<string, string[]> = {
  'design-domain': [],
  'design-random': [],
  'design-rules': ['design-domain'],
  'card-library': ['design-domain'],
  'design-generation': ['design-domain', 'design-random', 'design-rules', 'card-library'],
  'design-layout': ['design-domain'],
  'design-quality': ['design-domain'],
  'design-render-model': ['design-domain'],
  'renderer-svg': ['design-render-model'],
  'workspace-core': ['design-domain'],
};

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : [];
  });
}

describe('Core architecture gates', () => {
  it.each(Object.entries(directions))('%s only imports permitted packages and no platform globals', (name, dependencies) => {
    const allowed = dependencies.map(dependency => '@loadsnow/' + dependency);
    const directory = resolve(root, 'packages', name);
    const manifest = JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>; devDependencies?: Record<string, string>; peerDependencies?: Record<string, string>;
    };
    expect(Object.keys(manifest.dependencies ?? {}).sort()).toEqual([...allowed].sort());
    expect(Object.keys(manifest.devDependencies ?? {})).toEqual([]);
    expect(Object.keys(manifest.peerDependencies ?? {})).toEqual([]);
    const problems: string[] = [];
    for (const file of sourceFiles(resolve(directory, 'src'))) {
      const code = readFileSync(file, 'utf8');
      if (/\bMath\s*(?:\.\s*random|\[\s*['"]random['"]\s*\])/.test(code)) {
        problems.push(relative(root, file) + ': random leakage');
      }
      const tree = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
      function visit(node: ts.Node): void {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
          const specifier = node.moduleSpecifier;
          if (specifier && ts.isStringLiteral(specifier) && !allowed.includes(specifier.text)) {
            // Local source modules are allowed, but cannot escape this package.
            const target = resolve(directory, 'src', relative(resolve(directory, 'src'), resolve(file, '..', specifier.text)));
            if (!specifier.text.startsWith('.') || relative(resolve(directory, 'src'), target).startsWith('..')) {
              problems.push(relative(root, file) + ': forbidden import ' + specifier.text);
            }
          }
        }
        if (ts.isIdentifier(node) && ['window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'indexedDB', 'globalThis', 'process', 'Buffer', 'require', 'React'].includes(node.text)) {
          problems.push(relative(root, file) + ': platform identifier ' + node.text);
        }
        if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          problems.push(relative(root, file) + ': dynamic import must be reviewed');
        }
        if (ts.isStringLiteral(node) && /^[LTP]\d{3}$/.test(node.text)) {
          problems.push(relative(root, file) + ': hardcoded prototype card id');
        }
        ts.forEachChild(node, visit);
      }
      visit(tree);
    }
    expect(problems).toEqual([]);
  });
});
