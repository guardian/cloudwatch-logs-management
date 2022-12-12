#!/bin/bash

set -e

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
ROOT_DIR="${DIR}/.."

injectBuildInfo() {
  COMMIT=$(git rev-parse HEAD)
  BUILD="${GITHUB_RUN_NUMBER:-DEV}"
  echo "// prettier-ignore" > "${ROOT_DIR}/packages/app/src/build-info.ts"
  echo "export const BUILD_INFO = { 'ShippedBy-revision': '${COMMIT}', 'ShippedBy-buildNumber': '${BUILD}' };" >> "${ROOT_DIR}/packages/app/src/build-info.ts"
}

injectBuildInfo

npm ci
npm run lint
npm run test --workspaces
npm run synth --workspace=cdk
npm run build --workspace=app

# @guardian/node-riffraff-artifact expects `riff-raff.yaml` to exist in CWD
# move generated file
mv "${ROOT_DIR}/packages/cdk/cdk.out/riff-raff.yaml" .

npm run riffRaffUpload
