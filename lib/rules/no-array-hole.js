'use strict';

/**
 * xn/no-array-hole
 *
 * Disallows operations that introduce holes into arrays.
 *
 * Why: PACKED arrays are faster than HOLEY arrays in V8. Every element access
 * on a HOLEY array requires an additional hole check and potential prototype
 * chain walk. Once an array has holes it will never be upgraded back to PACKED.
 *
 * Detected patterns:
 *   1. `arr.length = n`         — truncation or extension can introduce holes
 *   2. `delete arr[i]`          — leaves a hole at that index
 *   3. `new Array(n)` / `Array(n)` with a numeric argument — creates a holey
 *      pre-sized array (all slots are holes until filled)
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow operations that create holes in arrays — forces V8 HOLEY elements kind',
      category: 'Performance',
      recommended: true,
      url: 'https://github.com/cheathwood/xn#xn-no-array-hole',
    },
    schema: [],
    messages: {
      deleteElement:
        '`delete arr[i]` leaves a hole in the array, forcing V8 into slow HOLEY elements mode. ' +
        'Set the element to `undefined` or `null` and track length separately.',
      lengthAssign:
        'Assigning to `.length` can introduce holes (if extending) or create a HOLEY array. ' +
        'Prefer explicit element management.',
      newArrayN:
        '`{{expr}}` creates a holey pre-sized array. V8 starts in HOLEY_SMI_ELEMENTS mode. ' +
        'For numeric data prefer `new Float64Array(n)`. Otherwise fill immediately: `new Array(n).fill(null)`.',
    },
  },

  create(context) {
    function isNumericLiteral(node) {
      if (!node) return false;
      if (node.type === 'Literal') return typeof node.value === 'number';
      if (node.type === 'UnaryExpression') return isNumericLiteral(node.argument);
      return false;
    }

    return {
      // delete arr[i]
      UnaryExpression(node) {
        if (node.operator !== 'delete') return;
        const arg = node.argument;
        if (arg.type === 'MemberExpression' && arg.computed) {
          context.report({ node, messageId: 'deleteElement' });
        }
      },

      // arr.length = n
      AssignmentExpression(node) {
        const { left } = node;
        if (
          left.type === 'MemberExpression' &&
          !left.computed &&
          left.property.type === 'Identifier' &&
          left.property.name === 'length'
        ) {
          context.report({ node, messageId: 'lengthAssign' });
        }
      },

      // new Array(n) / Array(n)
      NewExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'Array' &&
          node.arguments.length === 1 &&
          isNumericLiteral(node.arguments[0])
        ) {
          context.report({
            node,
            messageId: 'newArrayN',
            data: { expr: `new Array(${node.arguments[0].value})` },
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
          context.report({
            node,
            messageId: 'newArrayN',
            data: { expr: `Array(${node.arguments[0].value})` },
          });
        }
      },
    };
  },
};
