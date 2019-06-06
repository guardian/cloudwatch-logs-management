#!/usr/bin/env bash
set -e
BUILD_DIR=$(dirname $0)
pushd $BUILD_DIR/..
brew bundle
. $(brew --prefix nvm)/nvm.sh
nvm install
nvm use
npm install
popd