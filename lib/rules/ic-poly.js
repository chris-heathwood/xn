'use strict';

/**
 * xn/ic-poly
 *
 * Detects call sites that pass objects of different class shapes to the same
 * function within the same file, which creates polymorphic inline caches (ICs).
 *
 * Why: V8's ICs are fastest when a given call site always sees the same object
 * shape (monomorphic). Once two or more shapes appear at the same call site the
 * IC becomes polymorphic (2–4 shapes) or megamorphic (5+ shapes), slowing every
 * subsequent call.
 *
 * What this rule can detect statically (within a file):
 *   - A function called with `new DifferentClass()` at multiple sites.
 *   - A function called with plain object literals of differing key sets.
 *
 * Limitations:
 *   - Cross-file flow is not tracked.
 *   - Variables passed by reference can't be typed without full type inference.
 *   - This is a best-effort heuristic; runtime profiling is the ground truth.
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn when a function is called with objects of different shapes — creates polymorphic V8 ICs',
      category: 'Performance',
      recommended: true,
      url: 'https://github.com/cheathwood/eslint-plugin-extreme-node#xn-ic-poly',
    },
    schema: [],
    messages: {
      icPoly:
        '`{{fn}}` is called with objects of different shapes ({{shapes}}). ' +
        'Polymorphic call sites slow V8 inline caches. Use a single unified shape.',
    },
  },

  create(context) {
    // Map of callee name -> Set of shape strings seen at call sites
    const callSiteShapes = new Map();

    function shapeOf(argNode) {
      if (argNode.type === 'NewExpression') {
        const callee = argNode.callee;
        if (callee.type === 'Identifier') return `new:${callee.name}`;
        if (callee.type === 'MemberExpression' && !callee.computed)
          return `new:${callee.object.name}.${callee.property.name}`;
        return 'new:unknown';
      }
      if (argNode.type === 'ObjectExpression') {
        const keys = argNode.properties
          .filter((p) => p.type === 'Property' && !p.computed)
          .map((p) => p.key.name || p.key.value)
          .sort()
          .join(',');
        return `literal:{${keys}}`;
      }
      return null; // can't determine shape statically
    }

    function calleeName(node) {
      if (node.type === 'Identifier') return node.name;
      if (node.type === 'MemberExpression' && !node.computed)
        return `${node.object.name}.${node.property.name}`;
      return null;
    }

    return {
      CallExpression(node) {
        const fn = calleeName(node.callee);
        if (!fn) return;

        for (const arg of node.arguments) {
          const shape = shapeOf(arg);
          if (!shape) continue;

          if (!callSiteShapes.has(fn)) {
            callSiteShapes.set(fn, new Set());
          }
          callSiteShapes.get(fn).add(shape);
        }
      },

      'Program:exit'() {
        for (const [fn, shapes] of callSiteShapes.entries()) {
          if (shapes.size > 1) {
            // Find the first call site for this fn to attach the report to
            const sourceCode = context.getSourceCode();
            const tokens = sourceCode.ast.body;

            // Report on the program node as a fallback (we can't easily
            // re-find the exact node after the walk, so we report on the
            // Program and include full context in the message)
            context.report({
              node: sourceCode.ast,
              messageId: 'icPoly',
              data: {
                fn,
                shapes: [...shapes].join(' | '),
              },
            });
          }
        }
      },
    };
  },
};
