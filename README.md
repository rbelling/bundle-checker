[![Build Status](https://travis-ci.org/rbelling/bundle-checker.png)](https://travis-ci.org/rbelling/bundle-checker)

# bundle-checker

> CLI tool that generates stats on bundle files

## Develop and test locally the CLI

```bash
$ yarn pack
$ ./bin/run hello
```

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

## Result posted as PR comment

```bash
$ npx bundle-checker --prComment
```

use `--prComment` to comment on the PR with the bundle check results.
Travis already provied `TRAVIS_PULL_REQUEST`, `TRAVIS_PULL_REQUEST_SLUG`, you need to provide `GITHUB_TOKEN` as env variable.
