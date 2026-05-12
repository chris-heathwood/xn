'use strict';

/**
 * xn/no-closure-in-loop
 *
 * Flags function expressions / arrow functions created inside loop bodies.
 *
 * Why: Each iteration creates a new function object on the heap. In hot loops
 * this generates significant GC pressure. The closure also captures the loop
 * scope, which may prevent the loop variable from being optimised into a
 * register by TurboFan.
 *
 * Exceptions (not flagged):
 *   - Immediately-invoked expressions (IIFEs) inside loops are a known pattern
 *     for scope isolation and are not flagged.
 *
 * Fix: Hoist the function outside the loop, or use a named method reference.
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow function creation inside loops — allocates a new closure object on every iteration',
      category: 'Performance',
      recommended: true,
      url: 'https://github.com/cheathwood/xn#xn-no-closure-in-loop',
    },
    schema: [],
    messages: {
      closureInLoop:
        'Function created inside a loop allocates a new closure on every iteration. ' +
        'Hoist the function outside the loop to avoid per-iteration heap allocation.',
    },
  },

  create(context) {
    const loopTypes = new Set([
      'ForStatement',
      'ForInStatement',
      'ForOfStatement',
      'WhileStatement',
      'DoWhileStatement',
    ]);

    function isInsideLoop(node) {
      let current = node.parent;
      while (current) {
        if (loopTypes.has(current.type)) return true;
        // Stop at function boundaries (outer loops don't count)
        if (
          current.type === 'FunctionDeclaration' ||
          current.type === 'FunctionExpression' ||
          current.type === 'ArrowFunctionExpression'
        )
          return false;
        current = current.parent;
      }
      return false;
    }

    function isIIFE(node) {
      return (
        node.parent &&
        node.parent.type === 'CallExpression' &&
        node.parent.callee === node
      );
    }

    function checkFn(node) {
      if (isIIFE(node)) return;
      if (isInsideLoop(node)) {
        context.report({ node, messageId: 'closureInLoop' });
      }
    }

    return {
      FunctionExpression: checkFn,
      ArrowFunctionExpression: checkFn,
    };
  },
};
