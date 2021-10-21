#!/bin/bash
# This script will build the SAM app and push into the appropriate bucket
# It will then try to push the resulting cloudformation into a riff-raff build

set -e

echo $BASH_SOURCE
SCRIPT_DIR=$(dirname ${BASH_SOURCE})
pushd ${SCRIPT_DIR}/..
PROJECT_DIR=$(pwd)

function cleanup {
    popd
}
trap cleanup EXIT

# create riff-raff dir
RIFF_RAFF_ARTIFACT_DIR=${PROJECT_DIR}/riff-raff-artifact
rm -rf ${RIFF_RAFF_ARTIFACT_DIR} || true
pwd
mkdir -p ${RIFF_RAFF_ARTIFACT_DIR}/cloudwatch-logs-management

set +x
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
npm run build
set -x
# bundle lambda code
(
    cd ${PROJECT_DIR}/dist
    zip -r ${RIFF_RAFF_ARTIFACT_DIR}/cloudwatch-logs-management/lambda.zip *
)

mkdir -p ${RIFF_RAFF_ARTIFACT_DIR}/cloudwatch-logs-management-cfn
cp ${PROJECT_DIR}/template.yaml ${RIFF_RAFF_ARTIFACT_DIR}/cloudwatch-logs-management-cfn/template.yaml
cp ${PROJECT_DIR}/riff-raff.yaml ${RIFF_RAFF_ARTIFACT_DIR}/riff-raff.yaml

# publish from teamcity
echo "##teamcity[publishArtifacts '${RIFF_RAFF_ARTIFACT_DIR} => .']"
