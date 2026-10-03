import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { isDeprecatedReference } from './deprecation';

describe('deprecation checking', () => {
  it('checks the selected overload while retaining deprecated property detection', () => {
    const code = [
      'declare function read(value: string): void;',
      '/** @deprecated numeric overload */',
      'declare function read(value: number): void;',
      'read("current");',
      'read(123);',
      'declare const value: { /** @deprecated old property */ old: string };',
      'value.old;',
    ].join('\n');
    const source = ts.createSourceFile('/fixture.ts', code, ts.ScriptTarget.Latest, true);
    const host = ts.createCompilerHost({ noLib: true });
    host.getSourceFile = (file) => file === '/fixture.ts' ? source : undefined;
    host.fileExists = (file) => file === '/fixture.ts';
    const program = ts.createProgram(['/fixture.ts'], { noLib: true }, host);
    const checker = program.getTypeChecker();
    const found: boolean[] = [];
    const visit = (node: ts.Node) => {
      if (
        ts.isIdentifier(node) &&
        (ts.isCallExpression(node.parent) ||
          (ts.isPropertyAccessExpression(node.parent) && node.parent.name === node))
      ) {
        found.push(isDeprecatedReference(checker, node));
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    expect(found).toEqual([false, true, true]);
  });
});
