# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test           # run all tests once
npm run test:watch # run tests in watch mode
```

To run a single rule's tests, there's no per-rule test file — all tests live in `tests/rules.test.js`. Filter via Jest's `-t` flag:

```bash
npx jest -t "xn/no-delete"
```

## Architecture

This is an ESLint plugin (`eslint-plugin-xn`) that enforces V8/Node.js JIT-friendliness. All rules target static patterns that cause V8 hidden class transitions, IC (inline cache) pollution, or excess GC pressure.

**Entry point:** `lib/index.js` registers all rules and builds two configs:
- `recommended` — `problem` rules → `error`, `suggestion` rules → `warn`
- `strict` — all rules → `error`

The `meta.type` field on each rule (`'problem'` or `'suggestion'`) controls its severity in the `recommended` config — this is the only distinction between the two severity tiers.

**Rule structure** (`lib/rules/<name>.js`): every rule exports a standard ESLint rule object with `meta` (type, docs, messages, schema) and `create(context)`. Rules use AST visitor patterns; none require options or schema entries unless configurable (e.g. `prefer-class` has a property-count threshold).

**Tests** (`tests/rules.test.js`): a single file using ESLint's `RuleTester`. Each rule has `valid` (no error expected) and `invalid` (error with specific `messageId`) cases. Adding a new rule requires both a rule file and test cases in this file.

## Rule categories

| Category | Rules |
|---|---|
| Object shape / hidden classes | `no-delete`, `prefer-class`, `class-transition`, `no-proto-mutation` |
| ICs & deopts | `ic-poly`, `deopt`, `no-arguments` |
| Arrays & element kinds | `no-sparse-array`, `array-type-consistency`, `prefer-typed-array`, `no-array-hole` |
| Memory & GC | `no-closure-in-loop`, `no-object-in-loop` |

The `deopt` rule is a catch-all for several V8 deoptimisation triggers: `arguments`, `eval`/`new Function`, `for...in`, `with`, and parameter reassignment.
