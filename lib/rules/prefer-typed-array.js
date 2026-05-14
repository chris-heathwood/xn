'use strict';

/**
 * xn/prefer-typed-array
 *
 * Suggests TypedArrays when plain arrays are used exclusively for numeric data.
 *
 * Why: Plain JS arrays of numbers are still heap objects subject to GC and
 * boxing overhead. TypedArrays (`Float64Array`, `Int32Array`, etc.) are:
 *   - Stored as contiguous unboxed memory (no pointer chasing)
 *   - Never subject to elements-kind downgrade
 *   - Zero GC overhead for the numeric data itself
 *   - Cache-friendly for SIMD-style access patterns
 *
 * This rule flags:
 *   - Array literals whose EVERY element is a numeric literal.
 *   - `new Array(n)` or `Array(n)` where n is a numeric literal (pre-sized
 *     numeric buffer is a strong signal for TypedArray use).
 *
 * It does NOT flag mixed arrays or arrays whose purpose is unknown.
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer TypedArrays (Float64Array, Int32Array…) over plain arrays for numeric data',
      category: 'Performance',
      recommended: true,
      url: 'https://github.com/cheathwood/eslint-plugin-extreme-node#xn-prefer-typed-array',
    },
    schema: [],
    messages: {
      preferTypedArrayLiteral:
        'All elements are numeric. Consider a TypedArray (e.g. `Float64Array`, `Int32Array`) ' +
        'for contiguous unboxed storage and zero GC overhead.',
      preferTypedArrayNew:
        '`{{expr}}` allocates a plain numeric array. Consider `new Float64Array({{n}})` ' +
        'or `new Int32Array({{n}})` for better memory layout.',
    },
  },

  create(context) {
    function isNumericLiteral(node) {
      if (!node) return false;
      if (node.type === 'Literal') return typeof node.value === 'number';
      if (
        node.type === 'UnaryExpression' &&
        (node.operator === '-' || node.operator === '+')
      )
        return isNumericLiteral(node.argument);
      return false;
    }

    const TYPED_ARRAY_CTORS = new Set([
      'Float64Array', 'Float32Array',
      'Int32Array', 'Int16Array', 'Int8Array',
      'Uint32Array', 'Uint16Array', 'Uint8Array', 'Uint8ClampedArray',
      'BigInt64Array', 'BigUint64Array',
    ]);

    return {
      ArrayExpression(node) {
        if (node.elements.length < 2) return;
        const parent = node.parent;
        if (
          parent.type === 'NewExpression' &&
          parent.callee.type === 'Identifier' &&
          TYPED_ARRAY_CTORS.has(parent.callee.name)
        ) return;
        if (node.elements.every(isNumericLiteral)) {
          context.report({ node, messageId: 'preferTypedArrayLiteral' });
        }
      },

      NewExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'Array' &&
          node.arguments.length === 1 &&
          isNumericLiteral(node.arguments[0])
        ) {
          const n = node.arguments[0].value;
          context.report({
            node,
            messageId: 'preferTypedArrayNew',
            data: { expr: `new Array(${n})`, n },
          });
        }
      },

      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'Array' &&
          node.arguments.length === 1 &&
          isNumericLiteral(node.arguments[0])
        ) {
          const n = node.arguments[0].value;
          context.report({
            node,
            messageId: 'preferTypedArrayNew',
            data: { expr: `Array(${n})`, n },
          });
        }
      },
    };
  },
};
