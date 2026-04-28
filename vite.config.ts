import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  pack: {
    target: 'node24',
    banner: '#!/usr/bin/env node',
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    sortImports: true,
    sortPackageJson: true,
    printWidth: 80,
    semi: false,
    singleQuote: true,
    tabWidth: 2,
  },
})
