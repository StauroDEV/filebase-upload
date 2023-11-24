// ex. scripts/build_npm.ts
import { build, emptyDir } from 'https://deno.land/x/dnt@0.39.0/mod.ts'

await emptyDir('./npm')

await build({
  packageManager: 'pnpm',
  entryPoints: ['./mod.ts'],
  outDir: './npm',
  scriptModule: false,
  shims: { deno: 'dev', weakRef: 'dev' },
  test: true,
  compilerOptions: {
    lib: ['DOM', 'ES2021.String'],
    target: 'ES2022',
  },
  package: {
    name: '@stauro/filebase-upload',
    version: Deno.args[0],
    description: 'Minimal library to upload files on Filebase S3 API. Partially based on AWS SDK v3.',
    license: 'Apache-2.0',
    repository: {
      type: 'git',
      url: 'git+https://github.com/stauroDEV/filebase-upload.git',
    },
    bugs: {
      url: 'https://github.com/stauroDEV/filebase-upload/issues',
    },
    devDependencies: {
      '@types/node': 'latest',
      '@types/aws4': 'latest',
    },
    files: ['esm'],
    publishConfig: {
      access: 'public',
    },
  },
  postBuild() {
    // steps to run after building and before running the tests
    Deno.copyFileSync('LICENSE', 'npm/LICENSE')
    Deno.copyFileSync('README.md', 'npm/README.md')
  },
})
