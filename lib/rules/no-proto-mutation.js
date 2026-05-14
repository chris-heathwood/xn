'use strict';

/**
 * xn/no-proto-mutation
 *
 * Disallows runtime prototype mutation.
 *
 * Why: Changing an object's prototype at runtime is one of the most destructive
 * operations for V8 optimisation. It:
 *   - Invalidates every inline cache that has ever observed the object
 *   - Forces the object (and every IC that references it) to be re-optimised
 *   - Can trigger a global deoptimisation of all functions that touched it
 *   - Prevents the object from ever being in a "stable map" state again
 *
 * Detected patterns:
 *   - `Object.setPrototypeOf(obj, proto)`
 *   - `obj.__proto__ = proto`
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow runtime prototype mutation — invalidates all V8 inline caches',
      category: 'Performance',
      recommended: true,
      url: 'https://github.com/cheathwood/eslint-plugin-extreme-node#xn-no-proto-mutation',
    },
    schema: [],
    messages: {
      setPrototypeOf:
        '`Object.setPrototypeOf()` mutates an object\'s prototype at runtime, ' +
        'invalidating all V8 inline caches that have seen this object. ' +
        'Set the prototype at construction time via `class` or `Object.create()`.',
      dunderProto:
        'Assigning to `__proto__` mutates the prototype at runtime and invalidates V8 ICs. ' +
        'Set the prototype at construction time via `class` or `Object.create()`.',
    },
  },

  create(context) {
    return {
      // Object.setPrototypeOf(...)
      CallExpression(node) {
        const { callee } = node;
        if (
          callee.type === 'MemberExpression' &&
          !callee.computed &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'Object' &&
          callee.property.name === 'setPrototypeOf'
        ) {
          context.report({ node, messageId: 'setPrototypeOf' });
        }
      },

      // obj.__proto__ = ...
      AssignmentExpression(node) {
        const { left } = node;
        if (
          left.type === 'MemberExpression' &&
          !left.computed &&
          left.property.type === 'Identifier' &&
          left.property.name === '__proto__'
        ) {
          context.report({ node, messageId: 'dunderProto' });
        }
      },
    };
  },
};
