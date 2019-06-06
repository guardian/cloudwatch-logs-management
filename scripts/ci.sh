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

# create riff-raff dir
RIFF_RAFF_ARTIFACT_DIR=$SCRIPT_DIR/../riff-raff-artifact
rm -rf ${RIFF_RAFF_ARTIFACT_DIR} || true
mkdir -p ${RIFF_RAFF_ARTIFACT_DIR}/cloudwatch-logs-management

# source NVM on teamcity
. ${NVM_DIR}/nvm.sh
nvm install
nvm use

# install deps and build app
npm install
npm run build

# bundle lambda code
(
    cd ${SCRIPT_DIR}/../dist
    zip -r ${RIFF_RAFF_ARTIFACT_DIR}/cloudwatch-logs-management/lambda.zip *
)

cp ${SCRIPT_DIR}/../template.yaml ${RIFF_RAFF_ARTIFACT_DIR}/cloudwatch-logs-management/template.yaml
cp ${SCRIPT_DIR}/../riff-raff.yaml ${RIFF_RAFF_ARTIFACT_DIR}/riff-raff.yaml

# publish from teamcity
echo "##teamcity[publishArtifacts '${RIFF_RAFF_ARTIFACT_DIR} => .']"