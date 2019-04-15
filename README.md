[![Build Status](https://travis-ci.org/rbelling/bundle-checker.png)](https://travis-ci.org/rbelling/bundle-checker)
[![NPM Version](https://img.shields.io/npm/v/bundle-checker.svg)](https://www.npmjs.com/package/bundle-checker)
[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

# bundle-checker 🔎📦

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
        --targetBranch='master' \
        --buildFilesPatterns='build/**/*.js,build/**/*.css'
```

All parameters are optionals, defaults:

| Parameter          | Default                            |
| ------------------ | ---------------------------------- |
| buildScript        | npm run build                      |
| currentBranch      | current branch detected            |
| gitRepository      | repo where command is run          |
| installScript      | npm install                        |
| prComment          | false                              |
| targetBranch       | master                             |
| buildFilesPatterns | build/\*\*/\*.js,build/\*\*/\*.css |

## Post result as PR comment

Add `--prComment` to post the results as pr Comment after a CI job.

```bash
$ npx bundle-checker --prComment
```

The command needs 3 env variable set:



| var                        | Desc                   |
| -------------------------- | ---------------------- |
| _PULL_REQUEST_NUMBER_      | Number of pull request |
| _PULL_REQUEST_SLUG_        | e.g. _facebook/react_  |
| _GITHUB_TOKEN_             | secret to be setup     |

> If you're working with Travis, no need to setup env variables `PULL_REQUEST_NUMBER` or `PULL_REQUEST_SLUG`. 
Those are read from `TRAVIS_PULL_REQUEST` and `TRAVIS_PULL_REQUEST_SLUG` automatically.

## Develop and test locally the CLI

```bash
$ yarn pack
$ ./bin/run compare
```

> cli scaffoling built with https://github.com/oclif/oclif
