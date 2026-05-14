'use strict';

/**
 * xn/deopt
 *
 * Flags well-known patterns that cause V8 to deoptimise (bail out of compiled
 * code back to the interpreter) or that permanently prevent TurboFan from
 * optimising a function.
 *
 * Detected patterns:
 *   1. `arguments` object usage  — disables some opts; prefer rest params
 *   2. `eval()` / `new Function()` — black box; kills scope analysis
 *   3. `for...in` on non-trivial objects — slow enumeration path
 *   4. `try/catch` wrapping a call in what appears to be a hot path
 *   5. `with` statement — kills all scope optimisation
 *   6. Reassigning function parameters — prevents some V8 optimisations
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Flag patterns that cause V8 deoptimisation',
      category: 'Performance',
      recommended: true,
      url: 'https://github.com/cheathwood/eslint-plugin-extreme-node#xn-deopt',
    },
    schema: [],
    messages: {
      argumentsObject:
        '`arguments` object prevents some V8 optimisations. Use rest parameters (`...args`) instead.',
      evalUsage:
        '`{{fn}}` is a black box to V8 and prevents scope/type analysis. Avoid in hot paths.',
      forIn:
        '`for...in` uses a slow enumeration path in V8. Prefer `Object.keys()` + `for...of` or a `Map`.',
      tryCatchHot:
        '`try/catch` around function calls can prevent V8 from inlining the called function. ' +
        'Move non-throwing logic outside the try block.',
      withStatement:
        '`with` statement disables all V8 scope optimisations in the enclosing function.',
      paramReassign:
        'Reassigning parameter `{{name}}` prevents certain V8 optimisations. Use a local variable instead.',
    },
  },

  create(context) {
    // Track function parameter names per function scope
    const paramStack = [];

    function enterFunction(node) {
      const params = new Set(
        node.params
          .filter((p) => p.type === 'Identifier')
          .map((p) => p.name)
      );
      paramStack.push(params);
    }

    function exitFunction() {
      paramStack.pop();
    }

    return {
      FunctionDeclaration: enterFunction,
      FunctionExpression: enterFunction,
      ArrowFunctionExpression: enterFunction,
      'FunctionDeclaration:exit': exitFunction,
      'FunctionExpression:exit': exitFunction,
      'ArrowFunctionExpression:exit': exitFunction,

      // 1. arguments object
      Identifier(node) {
        if (node.name === 'arguments') {
          context.report({ node, messageId: 'argumentsObject' });
        }
      },

      // 2. eval / new Function
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type === 'Identifier' && callee.name === 'eval') {
          context.report({ node, messageId: 'evalUsage', data: { fn: 'eval' } });
        }
        if (
          callee.type === 'MemberExpression' &&
          !callee.computed &&
          callee.property.name === 'eval'
        ) {
          context.report({ node, messageId: 'evalUsage', data: { fn: '(indirect eval)' } });
        }
      },

      NewExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'Function'
        ) {
          context.report({
            node,
            messageId: 'evalUsage',
            data: { fn: 'new Function()' },
          });
        }
      },

      // 3. for...in
      ForInStatement(node) {
        context.report({ node, messageId: 'forIn' });
      },

      // 4. try/catch with calls inside the catch or wrapping calls
      TryStatement(node) {
        if (!node.handler) return;
        // Check if the try block contains CallExpressions (hot path heuristic)
        const tryBody = node.block.body;
        const hasCall = tryBody.some(
          (stmt) =>
            stmt.type === 'ExpressionStatement' &&
            (stmt.expression.type === 'CallExpression' ||
              stmt.expression.type === 'AwaitExpression')
        );
        if (hasCall) {
          context.report({ node, messageId: 'tryCatchHot' });
        }
      },

      // 5. with
      WithStatement(node) {
        context.report({ node, messageId: 'withStatement' });
      },

      // 6. parameter reassignment
      AssignmentExpression(node) {
        if (paramStack.length === 0) return;
        const currentParams = paramStack[paramStack.length - 1];
        const { left } = node;
        if (left.type === 'Identifier' && currentParams.has(left.name)) {
          context.report({
            node,
            messageId: 'paramReassign',
            data: { name: left.name },
          });
        }
      },
    };
  },
};
