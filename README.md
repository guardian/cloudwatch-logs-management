Cloudwatch Logs Management
==========================

This set of lambdas provides support to:
 - Set retention/expiry of cloudwatch log groups
 - Provide a lambda that forwards logs from lambdas to Kinesis ELK
 - Automatically seek out lambdas and configure log forwarding to ELK

Requirements
------------

* [NVM](https://github.com/creationix/nvm)
* [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)

The above requirements are in the supplied Brewfile and installed via `scripts/setup.sh`.

Setup
-----

* `scripts/setup.sh`
* `nvm use`
* `npm run build`

Deploy
------

This is deployed via riff-raff. In order to add a new account and deploy for the first time you should:
 1. Ensure you have an S3 bucket in the target account to store the code for the lambda - this is typically your "dist" bucket
 1. The name of this bucket needs to be available in SSM under the key `/account/services/artifact.bucket`
 1. Add your stack name to the `stacks` section of `riff-raff.yaml`
 1. Use riff-raff to upload the artifact to the dist bucket in your account (use preview and select just the appropriate upload task)
 1. Manually deploy the cloudformation template (at `template.yaml`) for the first time, filling in parameters as desired
 1. Test that you can do a full deploy