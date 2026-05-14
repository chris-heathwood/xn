'use strict';

/**
 * xn/prefer-class
 *
 * Flags factory functions that return shaped object literals.
 *
 * Why: Object literals returned from factory functions may produce objects with
 * the same shape, but V8 does not always unify their hidden classes across call
 * sites. Using a `class` (or a constructor function) guarantees a single hidden
 * class per shape, enabling monomorphic ICs and better TurboFan optimisation.
 *
 * This rule flags:
 *   - Functions/arrow functions whose SOLE return value is an object literal
 *     with at least `minProperties` (default 2) properties.
 *
 * It does NOT flag:
 *   - Functions that return different shapes conditionally (already polymorphic).
 *   - Class constructors / methods.
 *   - Single-property objects (likely not a performance-sensitive shape).
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer classes over factory functions returning shaped objects — ensures a stable V8 hidden class',
      category: 'Performance',
      recommended: true,
      url: 'https://github.com/cheathwood/eslint-plugin-extreme-node#xn-prefer-class',
    },
    schema: [
      {
        type: 'object',
        properties: {
          minProperties: { type: 'integer', minimum: 1, default: 2 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferClass:
        'Factory function returns a shaped object literal ({{count}} properties). ' +
        'Use a `class` to guarantee a single V8 hidden class across all call sites.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const minProperties = options.minProperties ?? 2;

    function isInsideClass(node) {
      let current = node.parent;
      while (current) {
        if (
          current.type === 'ClassDeclaration' ||
          current.type === 'ClassExpression'
        )
          return true;
        current = current.parent;
      }
      return false;
    }

    function checkFunction(node) {
      if (isInsideClass(node)) return;

      // Collect all ReturnStatement nodes that are direct children of this fn
      const body = node.body;
      if (!body || body.type !== 'BlockStatement') {
        // Arrow with expression body — check the expression directly
        if (node.body && node.body.type === 'ObjectExpression') {
          const count = node.body.properties.length;
          if (count >= minProperties) {
            context.report({ node, messageId: 'preferClass', data: { count } });
          }
        }
        return;
      }

      const returns = [];
      // Walk the function body recursively, without descending into nested fns
      function collectReturns(node) {
        if (!node || typeof node !== 'object') return;
        if (
          node !== body &&
          (node.type === 'FunctionDeclaration' ||
            node.type === 'FunctionExpression' ||
            node.type === 'ArrowFunctionExpression')
        )
          return;
        if (node.type === 'ReturnStatement' && node.argument) {
          returns.push(node.argument);
          return;
        }
        for (const key of Object.keys(node)) {
          if (key === 'parent') continue;
          const child = node[key];
          if (Array.isArray(child)) child.forEach(collectReturns);
          else if (child && typeof child === 'object' && child.type)
            collectReturns(child);
        }
      }
      collectReturns(body);

      // Only flag if there is exactly one return and it is an ObjectExpression
      if (
        returns.length === 1 &&
        returns[0].type === 'ObjectExpression'
      ) {
        const count = returns[0].properties.length;
        if (count >= minProperties) {
          context.report({ node, messageId: 'preferClass', data: { count } });
        }
      }
    }

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
    };
  },
};
