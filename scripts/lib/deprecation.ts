import ts from 'typescript';

export function isDeprecatedReference(checker: ts.TypeChecker, node: ts.Identifier): boolean {
  const target = ts.isPropertyAccessExpression(node.parent) ? node.parent : node;
  const parent = target.parent;
  if (ts.isCallExpression(parent) && parent.expression === target) {
    const signature = checker.getResolvedSignature(parent);
    if (signature) return signature.getJsDocTags().some((tag) => tag.name === 'deprecated');
  }
  return checker.getSymbolAtLocation(node)?.getJsDocTags(checker)
    .some((tag) => tag.name === 'deprecated') ?? false;
}
