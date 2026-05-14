'use strict';

const rules = {
  // Object shape & hidden classes
  'no-delete':            require('./rules/no-delete'),
  'prefer-class':         require('./rules/prefer-class'),
  'class-transition':     require('./rules/class-transition'),
  'no-proto-mutation':    require('./rules/no-proto-mutation'),

  // ICs & deopts
  'ic-poly':              require('./rules/ic-poly'),
  'deopt':                require('./rules/deopt'),
  'no-arguments':         require('./rules/no-arguments'),

  // Arrays & element kinds
  'no-sparse-array':      require('./rules/no-sparse-array'),
  'array-type-consistency': require('./rules/array-type-consistency'),
  'prefer-typed-array':   require('./rules/prefer-typed-array'),
  'no-array-hole':        require('./rules/no-array-hole'),

  // Memory & GC
  'no-closure-in-loop':   require('./rules/no-closure-in-loop'),
  'no-object-in-loop':    require('./rules/no-object-in-loop'),
};

const recommendedRules = Object.fromEntries(
  Object.entries(rules).map(([name, rule]) => [
    `xn/${name}`,
    rule.meta.type === 'problem' ? 'error' : 'warn',
  ])
);

const strictRules = Object.fromEntries(
  Object.keys(rules).map((name) => [`xn/${name}`, 'error'])
);

const plugin = { rules, configs: {} };

plugin.configs = {
  recommended: {
    plugins: { xn: plugin },
    rules: recommendedRules,
  },
  strict: {
    plugins: { xn: plugin },
    rules: strictRules,
  },
};

module.exports = plugin;
