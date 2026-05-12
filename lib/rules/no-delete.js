'use strict';

/**
 * xn/no-delete
 *
 * Disallows the `delete` operator on object properties.
 *
 * Why: `delete obj.prop` causes V8 to transition the object out of its current
 * hidden class into a new (slower) one, or into dictionary mode entirely.
 * Once in dictionary mode the object loses all fast-property optimisations and
 * inline-cache hits, and can never recover within the same process.
 *
 * Fix: set the property to `null` or `undefined` instead of deleting it, so
 * the hidden class (and therefore the IC chain) stays intact.
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow delete operator — shatters V8 hidden classes',
      category: 'Performance',
      recommended: true,
      url: 'https://github.com/cheathwood/xn#xn-no-delete',
    },
    schema: [],
    messages: {
      noDelete:
        '`delete obj.{{prop}}` shatters the V8 hidden class. ' +
        'Set to `null` or `undefined` instead to keep the object shape stable.',
    },
  },

  create(context) {
    return {
      UnaryExpression(node) {
        if (node.operator !== 'delete') return;

        const arg = node.argument;
        const prop =
          arg.type === 'MemberExpression'
            ? arg.computed
              ? '[dynamic]'
              : arg.property.name
            : '(expression)';

        context.report({
          node,
          messageId: 'noDelete',
          data: { prop },
        });
      },
    };
  },
};
