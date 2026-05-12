'use strict';

/**
 * xn/class-transition
 *
 * Flags new properties assigned to `this` outside the constructor.
 *
 * Why: V8 builds a hidden class for each object at construction time. Every
 * property added after construction causes a hidden-class transition, forking
 * the chain and potentially producing polymorphic ICs. The fix is to declare
 * ALL properties (even as `null`/`0`/`false`) inside the constructor so V8
 * sees a stable shape from the moment the object is created.
 *
 * This rule flags:
 *   - `this.x = ...` assignments inside class methods OTHER than `constructor`.
 *   - Only flags assignments to properties NOT already declared in the
 *     constructor (to avoid duplicate reports for legitimate updates).
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow adding new properties to `this` outside the constructor — causes V8 hidden class transitions',
      category: 'Performance',
      recommended: true,
      url: 'https://github.com/cheathwood/xn#xn-class-transition',
    },
    schema: [],
    messages: {
      classTransition:
        '`this.{{prop}}` is assigned outside the constructor. ' +
        'Declare all properties in the constructor (even as `null`) to prevent hidden class transitions.',
    },
  },

  create(context) {
    // Stack of { isConstructor, constructorProps } per class body we are inside
    const classStack = [];

    function getConstructorProps(classBody) {
      const props = new Set();
      const ctor = classBody.body.find(
        (m) => m.kind === 'constructor'
      );
      if (!ctor) return props;

      // Walk the constructor body for `this.x = ...` assignments
      function walk(node) {
        if (!node || typeof node !== 'object') return;
        if (
          node.type === 'AssignmentExpression' &&
          node.left &&
          node.left.type === 'MemberExpression' &&
          node.left.object.type === 'ThisExpression' &&
          !node.left.computed
        ) {
          props.add(node.left.property.name);
        }
        for (const key of Object.keys(node)) {
          if (key === 'parent') continue;
          const child = node[key];
          if (Array.isArray(child)) child.forEach(walk);
          else if (child && typeof child === 'object' && child.type) walk(child);
        }
      }
      walk(ctor.value.body);
      return props;
    }

    return {
      ClassBody(node) {
        classStack.push({
          constructorProps: getConstructorProps(node),
          // will be set per-method
        });
      },

      'ClassBody:exit'() {
        classStack.pop();
      },

      MethodDefinition(node) {
        if (classStack.length === 0) return;
        classStack[classStack.length - 1].currentMethodIsConstructor =
          node.kind === 'constructor';
      },

      AssignmentExpression(node) {
        if (classStack.length === 0) return;
        const frame = classStack[classStack.length - 1];
        if (frame.currentMethodIsConstructor) return;

        const { left } = node;
        if (
          left.type === 'MemberExpression' &&
          left.object.type === 'ThisExpression' &&
          !left.computed
        ) {
          const prop = left.property.name;
          if (!frame.constructorProps.has(prop)) {
            context.report({
              node,
              messageId: 'classTransition',
              data: { prop },
            });
          }
        }
      },
    };
  },
};
