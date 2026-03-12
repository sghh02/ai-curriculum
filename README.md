# ai-curriculum

## Validate

```bash
node scripts/validate-index.mjs
```

The validation script also checks template constant key consistency between chapter placeholders and `index.json` resources.


## Resolve template constants

```bash
node scripts/resolve-template-constants.mjs
```

By default, resolved markdown is generated under `dist/chapters/`.
You can pass a custom output directory (relative to repo root):

```bash
node scripts/resolve-template-constants.mjs out
```
