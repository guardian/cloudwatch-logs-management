#!/bin/bash
# This script will build the SAM app and push into the appropriate bucket
# It will then try to push the resulting cloudformation into a riff-raff build

set -e

if [ -z "${DEPLOY_TOOLS_DIST_BUCKET}" ]; then
    echo "Env var DEPLOY_TOOLS_DIST_BUCKET not set so don't know where to upload lambda build"
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

function sub {
    mkdir -p $(dirname $2)
    sed -e "s/%DEPLOY_TOOLS_DIST_BUCKET%/${DEPLOY_TOOLS_DIST_BUCKET}/" ${1} > ${2}
}

sub ${SCRIPT_DIR}/../template.yaml ${RIFF_RAFF_ARTIFACT_DIR}/cloudwatch-logs-management-cfn/template.yaml
sub ${SCRIPT_DIR}/../riff-raff.yaml ${RIFF_RAFF_ARTIFACT_DIR}/riff-raff.yaml

# publish from teamcity
echo "##teamcity[publishArtifacts '${RIFF_RAFF_ARTIFACT_DIR} => .']"