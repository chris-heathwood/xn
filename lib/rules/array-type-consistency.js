'use strict';

/**
 * xn/array-type-consistency
 *
 * Warns when an array literal mixes types that would downgrade V8's internal
 * elements kind.
 *
 * V8 elements kind ladder (fastest → slowest):
 *   PACKED_SMI_ELEMENTS       — all small integers, no holes
 *   PACKED_DOUBLE_ELEMENTS    — all numbers (int or float), no holes
 *   PACKED_ELEMENTS           — any values, no holes
 *   HOLEY_SMI_ELEMENTS        — small integers with holes
 *   HOLEY_DOUBLE_ELEMENTS     — numbers with holes
 *   HOLEY_ELEMENTS            — anything with holes
 *
 * Once an array is downgraded it never upgrades. Mixing strings, objects, or
 * booleans with numbers forces PACKED_ELEMENTS from the start.
 *
 * This rule flags array literals that contain mixed value kinds, e.g.:
 *   [1, 'two', 3]        — number + string
 *   [1, true, 3]         — number + boolean
 *   [1.0, 2, { x: 3 }]  — number + object
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn on mixed-type array literals — degrades V8 elements kind from SMI/double to generic',
      category: 'Performance',
      recommended: true,
      url: 'https://github.com/cheathwood/xn#xn-array-type-consistency',
    },
    schema: [],
    messages: {
      mixedTypes:
        'Array literal contains mixed value types ({{types}}). ' +
        'V8 will use slow generic PACKED_ELEMENTS instead of the faster SMI or double elements kind.',
    },
  },

  create(context) {
    function kindOf(element) {
      if (!element) return 'hole';
      switch (element.type) {
        case 'Literal':
          if (element.value === null) return 'null';
          if (typeof element.value === 'number') return 'number';
          if (typeof element.value === 'string') return 'string';
          if (typeof element.value === 'boolean') return 'boolean';
          return 'literal';
        case 'TemplateLiteral': return 'string';
        case 'ObjectExpression': return 'object';
        case 'ArrayExpression': return 'array';
        case 'UnaryExpression':
          // -1, +1 etc
          if (['-', '+'].includes(element.operator)) return 'number';
          return 'other';
        default:
          return 'dynamic'; // can't determine statically
      }
    }

    return {
      ArrayExpression(node) {
        if (node.elements.length < 2) return;

        const kinds = new Set();
        for (const el of node.elements) {
          const k = kindOf(el);
          if (k === 'dynamic') return; // can't analyse, skip
          if (k !== 'hole') kinds.add(k);
        }

        // Mixed if there are kinds that cross the number/non-number boundary
        const hasNumber = kinds.has('number');
        const hasNonNumber = [...kinds].some((k) => k !== 'number');

        if (hasNumber && hasNonNumber) {
          context.report({
            node,
            messageId: 'mixedTypes',
            data: { types: [...kinds].join(', ') },
          });
        }
      },
    };
  },
};
