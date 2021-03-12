#!/usr/bin/env bash

set -e

BUILD_DIR=$(dirname $0)
ROOT_DIR=$BUILD_DIR/..

checkNodeVersion() {
  runningNodeVersion=$(node -v)
  requiredNodeVersion=$(cat "$ROOT_DIR/.nvmrc")

  if [ "$runningNodeVersion" != "$requiredNodeVersion" ]; then
    echo "Using wrong version of Node. Required ${requiredNodeVersion}. Running ${runningNodeVersion}."
    exit 1
  fi
}

checkNodeVersion
pushd $ROOT_DIR
brew bundle
npm install
popd
