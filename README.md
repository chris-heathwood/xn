# eslint-plugin-xn

**Extreme Node** — ESLint rules for V8/Node.js performance optimisation.

Targets the patterns that matter most for long-running, type-stable, numeric-heavy
Node.js services where V8's JIT (Maglev + TurboFan) is doing serious work.

---

## Install

```bash
npm install --save-dev eslint-plugin-xn
```

## Usage

```js
// .eslintrc.js
module.exports = {
  plugins: ['xn'],
  extends: ['plugin:xn/recommended'],
};
```

Or enable rules individually:

```js
module.exports = {
  plugins: ['xn'],
  rules: {
    'xn/no-delete':              'error',
    'xn/class-transition':       'error',
    'xn/no-proto-mutation':      'error',
    'xn/no-sparse-array':        'error',
    'xn/no-array-hole':          'error',
    'xn/no-arguments':           'warn',
    'xn/prefer-class':           'warn',
    'xn/array-type-consistency': 'warn',
    'xn/prefer-typed-array':     'warn',
    'xn/no-closure-in-loop':     'warn',
    'xn/no-object-in-loop':      'warn',
    'xn/ic-poly':                'warn',
    'xn/deopt':                  'warn',
  },
};
```

---

## Rules

### Object Shape & Hidden Classes

| Rule | Type | Why |
|---|---|---|
| `xn/no-delete` | error | `delete obj.prop` shatters the V8 hidden class, potentially moving the object to slow dictionary mode permanently |
| `xn/prefer-class` | warn | Factory functions returning object literals may produce objects with different hidden classes across call sites |
| `xn/class-transition` | error | Adding a new property to `this` outside the constructor causes a hidden class transition, forking the IC chain |
| `xn/no-proto-mutation` | error | `Object.setPrototypeOf` / `__proto__ =` invalidates every inline cache that has ever observed the object |

### Inline Caches & Deopts

| Rule | Type | Why |
|---|---|---|
| `xn/ic-poly` | warn | Calling a function with objects of different shapes creates polymorphic ICs (2–4 shapes) or megamorphic (5+) |
| `xn/deopt` | warn | Flags `arguments`, `eval`, `for...in`, `with`, `try/catch` around calls, parameter reassignment |
| `xn/no-arguments` | warn | `arguments` forces heap allocation per call and inhibits TurboFan inlining |

### Arrays & Element Kinds

V8 tracks array element kinds on a lattice — once downgraded, never upgraded:

```
PACKED_SMI → PACKED_DOUBLE → PACKED → HOLEY_SMI → HOLEY_DOUBLE → HOLEY
```

| Rule | Type | Why |
|---|---|---|
| `xn/no-sparse-array` | error | Sparse arrays (`[1,,3]`) start in HOLEY mode |
| `xn/array-type-consistency` | warn | Mixing numbers with strings/objects forces PACKED_ELEMENTS (slowest non-holey kind) |
| `xn/prefer-typed-array` | warn | Plain numeric arrays have GC overhead; TypedArrays are unboxed contiguous memory |
| `xn/no-array-hole` | error | `delete arr[i]` / `arr.length = n` introduce holes; `new Array(n)` starts holey |

### Memory & GC

| Rule | Type | Why |
|---|---|---|
| `xn/no-closure-in-loop` | warn | Each iteration allocates a new function object on the heap |
| `xn/no-object-in-loop` | warn | Each iteration allocates a new object; consider object pooling |

---

## Configs

### `plugin:xn/recommended`
`problem` rules → `error`, `suggestion` rules → `warn`.

### `plugin:xn/strict`
All rules → `error`.

---

## What these rules can't catch (use runtime tooling instead)

- **Megamorphic call sites** across files — use `--trace-ic` or [deoptigate](https://github.com/nicolo-ribaudo/deoptigate)
- **OSR (on-stack replacement) failures** — pure runtime
- **TurboFan inlining budget exhaustion** — V8 internal heuristic
- **GC pause timing** — use [Node Clinic](https://clinicjs.org/) or `--trace-gc`

---

## Running tests

```bash
npm test
```
