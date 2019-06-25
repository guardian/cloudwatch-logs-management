#!/usr/bin/env bash
set -e
tsc
cp package.json dist/package.json
npm install --prefix dist --production
