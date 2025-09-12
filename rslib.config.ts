import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      output: {
        distPath: {
          root: './dist/',
        },
      },
      bundle: true,
      dts: false,
      format: 'cjs',
    },
  ],
});
