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
        --targetBranch='master'
```
