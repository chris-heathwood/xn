'use strict';

/**
 * xn/no-arguments
 *
 * Disallows use of the `arguments` object.
 *
 * Why: The `arguments` object is a special array-like object that V8 must
 * allocate and materialise on every call to a non-arrow function that references
 * it. Its presence:
 *   - Prevents certain inlining decisions in TurboFan
 *   - Forces V8 to treat the function's parameter list as "arguments-aliased"
 *     which disables some register optimisations
 *   - Causes an extra heap allocation per call
 *
 * Fix: Use rest parameters (`...args`) which are a plain Array, interoperate
 * with all Array methods, and have none of the above penalties.
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow `arguments` object — use rest parameters instead',
      category: 'Performance',
      recommended: true,
      url: 'https://github.com/cheathwood/eslint-plugin-extreme-node#xn-no-arguments',
    },
    schema: [],
    messages: {
      noArguments:
        '`arguments` object forces V8 to materialise a special aliased object and inhibits ' +
        'inlining. Use rest parameters (`...args`) instead.',
    },
  },

  create(context) {
    return {
      Identifier(node) {
        if (node.name !== 'arguments') return;

        // Only flag inside non-arrow functions (arrow fns don't have their own
        // `arguments` so using the name there refers to the outer scope)
        const scope = context.getScope();
        let current = scope;
        while (current) {
          if (
            current.block &&
            (current.block.type === 'FunctionDeclaration' ||
              current.block.type === 'FunctionExpression')
          ) {
            context.report({ node, messageId: 'noArguments' });
            return;
          }
          current = current.upper;
        }
      },
    };
  },
};
