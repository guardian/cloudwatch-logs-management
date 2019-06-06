#!/bin/bash -x
# This script will build the SAM app and push into the appropriate bucket
# It will then try to push the resulting cloudformation into a riff-raff build

set -e

if [ -z "${DEPLOY_TOOLS_DIST_BUCKET}" ]; then
    echo "Env var DEPLOY_TOOLS_DIST_BUCKET not set so don't know where to upload SAM build"
    exit 1
fi

SCRIPT_DIR=$(dirname $0)
pushd $SCRIPT_DIR/..

function cleanup {
    popd
}
trap cleanup EXIT

# where is NVM on teamcity???
# nvm.sh
nvm install
nvm use
npm install
npm run build
sam package --output-template-file dist/cfn.yaml --s3-bucket ${DEPLOY_TOOLS_DIST_BUCKET}

# build riff-raff package
RIFF_RAFF_ARTIFACT_DIR=$SCRIPT_DIR/../riff-raff-artifact
rm -rf ${RIFF_RAFF_ARTIFACT_DIR} || true
mkdir -p ${RIFF_RAFF_ARTIFACT_DIR}/cloudwatch-logs-management
cp ${SCRIPT_DIR}/../dist/cfn.yaml ${RIFF_RAFF_ARTIFACT_DIR}/cloudwatch-logs-management/cfn.yaml
cp ${SCRIPT_DIR}/../riff-raff.yaml ${RIFF_RAFF_ARTIFACT_DIR}/riff-raff.yaml

# publish from teamcity
echo "##teamcity[publishArtifacts '${RIFF_RAFF_ARTIFACT_DIR} => .']"