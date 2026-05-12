'use strict';

const { RuleTester } = require('eslint');

const tester = new RuleTester({
  parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
});

// ─── no-delete ───────────────────────────────────────────────────────────────
tester.run('xn/no-delete', require('../lib/rules/no-delete'), {
  valid: [
    { code: 'obj.prop = null;' },
    { code: 'obj.prop = undefined;' },
  ],
  invalid: [
    {
      code: 'delete obj.prop;',
      errors: [{ messageId: 'noDelete' }],
    },
    {
      code: 'delete obj["key"];',
      errors: [{ messageId: 'noDelete' }],
    },
  ],
});

// ─── prefer-class ────────────────────────────────────────────────────────────
tester.run('xn/prefer-class', require('../lib/rules/prefer-class'), {
  valid: [
    { code: 'class Session { constructor() { this.id = null; this.ts = 0; } }' },
    { code: 'function single() { return { x: 1 }; }' }, // only 1 prop, below default threshold
    { code: 'function multi() { if (x) return { a: 1, b: 2 }; return { a: 1, b: 2, c: 3 }; }' }, // multiple returns
  ],
  invalid: [
    {
      code: 'function makeEvent() { return { type: null, ts: 0, userId: null }; }',
      errors: [{ messageId: 'preferClass' }],
    },
    {
      code: 'const make = () => ({ type: null, ts: 0, userId: null });',
      errors: [{ messageId: 'preferClass' }],
    },
  ],
});

// ─── class-transition ────────────────────────────────────────────────────────
tester.run('xn/class-transition', require('../lib/rules/class-transition'), {
  valid: [
    {
      code: `
        class Evt {
          constructor() { this.type = null; this.ts = 0; }
          update() { this.type = 'click'; this.ts = Date.now(); }
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        class Evt {
          constructor() { this.type = null; }
          enrich() { this.extra = {}; }
        }
      `,
      errors: [{ messageId: 'classTransition' }],
    },
  ],
});

// ─── no-proto-mutation ───────────────────────────────────────────────────────
tester.run('xn/no-proto-mutation', require('../lib/rules/no-proto-mutation'), {
  valid: [
    { code: 'class Foo extends Bar {}' },
    { code: 'const obj = Object.create(proto);' },
  ],
  invalid: [
    {
      code: 'Object.setPrototypeOf(obj, proto);',
      errors: [{ messageId: 'setPrototypeOf' }],
    },
    {
      code: 'obj.__proto__ = proto;',
      errors: [{ messageId: 'dunderProto' }],
    },
  ],
});

// ─── deopt ───────────────────────────────────────────────────────────────────
tester.run('xn/deopt', require('../lib/rules/deopt'), {
  valid: [
    { code: 'function fn(...args) { return args.length; }' },
    { code: 'function fn(a, b) { const x = a; return x + b; }' },
  ],
  invalid: [
    {
      code: 'function fn() { return arguments.length; }',
      errors: [{ messageId: 'argumentsObject' }],
    },
    {
      code: 'eval("x + 1");',
      errors: [{ messageId: 'evalUsage' }],
    },
    {
      code: 'new Function("a", "return a + 1");',
      errors: [{ messageId: 'evalUsage' }],
    },
    {
      code: 'for (const k in obj) { use(k); }',
      errors: [{ messageId: 'forIn' }],
    },
    {
      code: 'with (obj) { x = 1; }',
      parserOptions: { ecmaVersion: 2020, sourceType: 'script' },
      errors: [{ messageId: 'withStatement' }],
    },
    {
      code: 'function fn(a) { a = a || 0; return a; }',
      errors: [{ messageId: 'paramReassign' }],
    },
  ],
});

// ─── no-sparse-array ─────────────────────────────────────────────────────────
tester.run('xn/no-sparse-array', require('../lib/rules/no-sparse-array'), {
  valid: [
    { code: 'const a = [1, 2, 3];' },
    { code: 'const a = [1, undefined, 3];' },
  ],
  invalid: [
    {
      code: 'const a = [1,,3];',
      errors: [{ messageId: 'noSparseArray' }],
    },
  ],
});

// ─── array-type-consistency ──────────────────────────────────────────────────
tester.run('xn/array-type-consistency', require('../lib/rules/array-type-consistency'), {
  valid: [
    { code: 'const a = [1, 2, 3];' },
    { code: 'const a = [1.0, 2.5, 3.14];' },
    { code: 'const a = ["a", "b", "c"];' },
  ],
  invalid: [
    {
      code: 'const a = [1, "two", 3];',
      errors: [{ messageId: 'mixedTypes' }],
    },
    {
      code: 'const a = [1, true, 3];',
      errors: [{ messageId: 'mixedTypes' }],
    },
    {
      code: 'const a = [1, { x: 2 }, 3];',
      errors: [{ messageId: 'mixedTypes' }],
    },
  ],
});

// ─── prefer-typed-array ──────────────────────────────────────────────────────
tester.run('xn/prefer-typed-array', require('../lib/rules/prefer-typed-array'), {
  valid: [
    { code: 'const a = new Float64Array([1, 2, 3]);' },
    { code: 'const a = [1, "two"];' }, // mixed, handled by array-type-consistency
    { code: 'const a = [x, y, z];' }, // dynamic, can\'t determine
  ],
  invalid: [
    {
      code: 'const a = [1.0, 2.5, 3.14];',
      errors: [{ messageId: 'preferTypedArrayLiteral' }],
    },
    {
      code: 'const buf = new Array(1024);',
      errors: [{ messageId: 'preferTypedArrayNew' }],
    },
  ],
});

// ─── no-array-hole ───────────────────────────────────────────────────────────
tester.run('xn/no-array-hole', require('../lib/rules/no-array-hole'), {
  valid: [
    { code: 'arr[i] = null;' },
    { code: 'const a = [1, 2, 3];' },
  ],
  invalid: [
    {
      code: 'delete arr[i];',
      errors: [{ messageId: 'deleteElement' }],
    },
    {
      code: 'arr.length = 0;',
      errors: [{ messageId: 'lengthAssign' }],
    },
    {
      code: 'const a = new Array(100);',
      errors: [{ messageId: 'newArrayN' }],
    },
  ],
});

// ─── no-arguments ────────────────────────────────────────────────────────────
tester.run('xn/no-arguments', require('../lib/rules/no-arguments'), {
  valid: [
    { code: 'function fn(...args) { return args.length; }' },
  ],
  invalid: [
    {
      code: 'function fn() { return arguments.length; }',
      errors: [{ messageId: 'noArguments' }],
    },
  ],
});

// ─── no-closure-in-loop ──────────────────────────────────────────────────────
tester.run('xn/no-closure-in-loop', require('../lib/rules/no-closure-in-loop'), {
  valid: [
    { code: 'const fn = () => {}; for (let i = 0; i < 10; i++) { fn(i); }' },
    { code: 'for (let i = 0; i < 10; i++) { (function() { return i; })(); }' }, // IIFE
  ],
  invalid: [
    {
      code: 'for (let i = 0; i < 10; i++) { const fn = () => i; }',
      errors: [{ messageId: 'closureInLoop' }],
    },
    {
      code: 'while (true) { arr.forEach(function(x) { process(x); }); }',
      errors: [{ messageId: 'closureInLoop' }],
    },
  ],
});

// ─── no-object-in-loop ───────────────────────────────────────────────────────
tester.run('xn/no-object-in-loop', require('../lib/rules/no-object-in-loop'), {
  valid: [
    { code: 'const evt = new Event(); for (let i = 0; i < n; i++) { evt.reset(); }' },
    { code: 'for (let i = 0; i < n; i++) { const buf = new Float64Array(4); }' }, // TypedArray ok
  ],
  invalid: [
    {
      code: 'for (let i = 0; i < n; i++) { const evt = new Event(); }',
      errors: [{ messageId: 'newInLoop' }],
    },
    {
      code: 'for (let i = 0; i < n; i++) { const obj = { x: i, y: 0 }; }',
      errors: [{ messageId: 'literalInLoop' }],
    },
  ],
});

console.log('✅ All xn rule tests passed');
