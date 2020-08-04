#!/bin/sh
#### vars
_REPO_AUTHOR="blubbll"
_REPO_NAME="deno-page"
_DENO_FLAGS="--allow-read --allow-net --allow-env --allow-run"
#### defaults probably
_APP_PATH="/data/app"
_ENTRY_FILE="index"
_REPO="https://github.com/$_REPO_AUTHOR/$_REPO_NAME.git"
#### dynamics
_PATH=$_APP_PATH/$_REPO_NAME
#### action
# clear cache
rm -r $_PATH
# clone repo
git clone $_REPO $_PATH
# make script runnable...
#mv $_PATH/$_ENTRY_FILE.ts.js $_PATH/$_ENTRY_FILE.ts
# ...go to path...
cd $_PATH
# ...and run it
deno run $_DENO_FLAGS $_PATH/$_ENTRY_FILE.ts.js