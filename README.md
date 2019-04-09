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

## Danger.js integration

This repository uses Danger.JS to automate some checks in the CI environment (see `.travis.yml`), as well as posting a recap comment on the PR itself.
Danger requires a github token `DANGER_GITHUB_API_TOKEN` to be setup in the travis settings for this repository.

Please see this [danger.js setup guide](https://medium.com/@ivan.ha/integrate-danger-js-in-5-minutes-55515bc5355d) for more information.
