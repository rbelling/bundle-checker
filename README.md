[![Build Status](https://travis-ci.org/rbelling/bundle-checker.png)](https://travis-ci.org/rbelling/bundle-checker)
[![NPM Version](https://img.shields.io/npm/v/bundle-checker.svg)](https://www.npmjs.com/package/bundle-checker)
[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)

# bundle-checker

> Compare the size of build files in two git branches.

![bundle-chercker](https://user-images.githubusercontent.com/6695231/56052681-fa9b7a80-5d49-11e9-9272-0df40920b14e.gif)

Summary:
- [Usage](#Usage)
- [Post result as PR comment](#Post-result-as-PR-comment)
- [Develop and test locally the CLI](#Develop-and-test-locally-the-CLI)

## Usage

```bash
$ npx bundle-checker compare \
        --gitRepository='https://github.com/ramda/ramda.git' \
        --installScript='yarn' \
        --buildScript='yarn build:es' \
        --currentBranch='CrossEye-patch-1' \
        --distPath='dist' \
        --targetBranch='master' \
        --targetFilesPattern='**/*.js,**/*.css'
```

All parameters are optionals, defaults:

| Parameter | Default |
| ------------- | ------------- |
| buildScript | npm run build |
| currentBranch | current branch detected |
| distPath | dist |
| gitRepository | repo where command is run |
| installScript | npm install |
| prComment | false |
| targetBranch | master |
| targetFilesPattern | &ast;&ast;/&ast;.js,&ast;&ast;/&ast;.css |


## Post result as PR comment

Add `--prComment` to post the results as pr Comment after a CI job.

```bash
$ npx bundle-checker --prComment
```

The command needs 3 env variable set:

| var | Desc |
| ------------- | ------------- |
| _TRAVIS_PULL_REQUEST_ | Number of pull request |
| _TRAVIS_PULL_REQUEST_SLUG_ | _nodejs/node_ |
| _GITHUB_TOKEN_ | secret to be setup |

> Travis will obviously provide `TRAVIS_PULL_REQUEST`, `TRAVIS_PULL_REQUEST_SLUG` for you already.

## Develop and test locally the CLI

```bash
$ yarn pack
$ ./bin/run compare
```

> cli scaffoling built with https://github.com/oclif/oclif
