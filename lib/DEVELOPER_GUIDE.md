# Developer Guide (Library)

This guide covers contributing to the universal-query-translator library.

## Repo layout

- src/
  - query-parser.ts: Universal query parsing
  - query-translator.ts: Translators (SQL primary, Redis plan)
  - connection-manager.ts: Runtime execution using external clients
  - types.ts: Zod schemas and TS types
- __tests__/: Parser/translator tests
- dist/: Build output

## Development

```bash
cd lib
npm install
npm run build
npm run test
```

Recommended workflow:
- Add/adjust tests in __tests__/
- Update parser/translator to satisfy new behavior
- Keep exported APIs typed and stable (avoid any in public surfaces)

## Coding standards
- Use explicit, descriptive names
- Handle error and edge cases first (early returns)
- Keep parser tolerant to whitespace/multiline
- Avoid deep nesting; prefer small helpers
- Match existing formatting

## Adding features
- Update Zod schemas in types.ts
- Extend parser with small, focused helpers
- Extend translators conservatively; SQL is primary
- For non-SQL targets, prefer emitting SQL where applicable or structured plans
- Update tests across relevant targets

## Versioning
- Semantic versioning
- Breaking changes require major version bump and migration notes

## Publishing (later)
- Ensure dist/ is built
- Ensure README.md and this guide are up to date
- Tag and publish from the lib/ package folder


