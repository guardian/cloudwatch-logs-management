#!/bin/bash

set -e

setupNodeVersion() {
  # source NVM on teamcity
  if [ -e "${NVM_DIR}/nvm.sh" ]; then
      . ${NVM_DIR}/nvm.sh
  else
      . $(brew --prefix nvm)/nvm.sh
  fi
  nvm install
  nvm use
}

injectBuildInfo() {
  COMMIT=$(git rev-parse HEAD)
  BUILD="${BUILD_NUMBER:-DEV}"
  echo "// prettier-ignore" > packages/app/src/build-info.ts
  echo "export const BUILD_INFO = { 'ShippedBy-revision': '${COMMIT}', 'ShippedBy-buildNumber': '${BUILD}' };" >> packages/app/src/build-info.ts
}

setupNodeVersion
injectBuildInfo

npm ci
npm run lint
npm run test --workspaces
npm run synth --workspace=cdk
npm run build --workspace=app
npm run riffRaffUpload
