Logs Maintenance Lambda
=======================

This SAM stack provides support to:
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

You'll need a S3 bucket in the target account to store the code for the lambda. For example, `composer-dist` in the Composer account.

The first time you deploy, create the package and then deploy `dist/cfn.yaml` directly from the UI so you can add in the parameters.

```
sam package --output-template-file dist/cfn.yaml --s3-bucket <DIST_BUCKET> --profile <AWS_CREDENTIALS_PROFILE>
```

Subsequent deploys that don't affect Cloudformation parameters can be run from the command line:

```
sam package --output-template-file dist/cfn.yaml --s3-bucket <DIST_BUCKET> --profile <AWS_CREDENTIALS_PROFILE>
aws cloudformation deploy --capabilities CAPABILITY_IAM --template-file dist/cfn.yaml --stack-name <STACK_NAME> --profile <AWS_CREDENTIALS_PROFILE> --region <AWS_REGION>
```
