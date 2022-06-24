#!/bin/bash

set -e

# source NVM on teamcity
if [ -e "${NVM_DIR}/nvm.sh" ]; then
    . ${NVM_DIR}/nvm.sh
else
    . $(brew --prefix nvm)/nvm.sh
fi
nvm install
nvm use

# install deps, run tests and build app
npm ci
npm run test
npm run lint

COMMIT=$(git rev-parse HEAD)
BUILD="${BUILD_NUMBER:-DEV}"
echo "export const BUILD_INFO = { 'ShippedBy-revision': '${COMMIT}', 'ShippedBy-buildNumber': '${BUILD}' };"  > src/build-info.ts

npm run build
npm run riffRaffUpload
