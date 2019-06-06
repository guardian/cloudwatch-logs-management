#!/usr/bin/env bash
tsc
cp package.json dist/package.json
npm install --prefix dist --production