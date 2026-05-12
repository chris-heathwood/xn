'use strict';

/**
 * xn/no-object-in-loop
 *
 * Flags `new ClassName()` and object literal `{}` allocations inside loop bodies.
 *
 * Why: Each iteration allocates a new object on the V8 heap. In a tight loop
 * this creates sustained GC pressure and can trigger minor (scavenger) or even
 * major GC cycles at the worst possible time. The fix is object pooling —
 * pre-allocate a pool of objects before the loop and reset/reuse them.
 *
 * This rule does NOT flag:
 *   - TypedArray construction (already efficient)
 *   - Array/object spread in assignment positions where intent is clear
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn on object/class instantiation inside loops — consider object pooling to reduce GC pressure',
      category: 'Performance',
      recommended: true,
      url: 'https://github.com/cheathwood/xn#xn-no-object-in-loop',
    },
    schema: [],
    messages: {
      newInLoop:
        '`new {{name}}()` inside a loop allocates on every iteration. ' +
        'Consider object pooling: pre-allocate instances and reset state instead of re-creating.',
      literalInLoop:
        'Object literal `{}` inside a loop allocates on every iteration. ' +
        'Consider hoisting the allocation or using an object pool.',
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

    const typedArrayNames = new Set([
      'Int8Array','Uint8Array','Uint8ClampedArray',
      'Int16Array','Uint16Array',
      'Int32Array','Uint32Array',
      'Float32Array','Float64Array',
      'BigInt64Array','BigUint64Array',
    ]);

    function isInsideLoop(node) {
      let current = node.parent;
      while (current) {
        if (loopTypes.has(current.type)) return true;
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

    return {
      NewExpression(node) {
        if (!isInsideLoop(node)) return;
        const name =
          node.callee.type === 'Identifier' ? node.callee.name : 'Object';
        if (typedArrayNames.has(name)) return; // TypedArrays are fine
        context.report({
          node,
          messageId: 'newInLoop',
          data: { name },
        });
      },

      ObjectExpression(node) {
        if (!isInsideLoop(node)) return;
        context.report({ node, messageId: 'literalInLoop' });
      },
    };
  },
};
