'use strict';

/**
 * xn/no-sparse-array
 *
 * Disallows sparse array literals.
 *
 * Why: Sparse arrays (e.g. `[1,,3]`) force V8 into a HOLEY elements kind.
 * HOLEY arrays are slower than PACKED arrays for every subsequent operation
 * because V8 must check for holes on each element access and may fall back to
 * prototype chain lookup for the missing indices.
 *
 * Fix: Use explicit `undefined` or restructure to avoid holes.
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow sparse arrays — forces V8 HOLEY elements kind',
      category: 'Performance',
      recommended: true,
      url: 'https://github.com/cheathwood/xn#xn-no-sparse-array',
    },
    schema: [],
    messages: {
      noSparseArray:
        'Sparse array literal forces V8 into slow HOLEY elements mode. ' +
        'Use explicit `undefined` for missing elements or avoid holes entirely.',
    },
  },

  create(context) {
    return {
      ArrayExpression(node) {
        // ESLint represents holes as `null` in node.elements
        const hasHoles = node.elements.some((el) => el === null);
        if (hasHoles) {
          context.report({ node, messageId: 'noSparseArray' });
        }
      },
    };
  },
};
