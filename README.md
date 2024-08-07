# Cloudwatch Logs Management


This set of lambdas provides support to:
 - Set retention/expiry of cloudwatch log groups
 - Provide a lambda that forwards logs from lambdas to Kinesis ELK
 - Automatically seek out lambdas and ECS task definitions and configure log forwarding to ELK

## Features
### Retention/expiry of Cloudwatch Logs Groups
One of the lambdas runs once a day and sets the retention time on all cloudwatch log groups. Typically we forget to set these so now we can forget about forgetting.

### Shipping lambda logs to ELK
Cloudwatch log groups created by Lambda (with prefix `/aws/lambda`) are automatically configured to forward to ELK by these lambdas.

Your lambda can:
 - output plain text (we put this into the `message` field)
 - output a JSON object (we forward all fields onto Logstash as is)

We add some special fields:
 - `cloudwatchLogGroup`: the name of the source log group
 - `cloudwatchId`: the ID of the log entry in cloudwatch
 - `@timestamp`: this is either sourced from `timestamp` in the incoming JSON document or comes from the time of the log event from cloudwatch
 - **Lambda tags**: when we configure forwarding we lookup the tags for each lambda and attach these to every log event - this is a good way of adding fields like `Stack`, `Stage` and `App` - setting the CFN parameter `OptionLowerFirstCharOfTags` to true will mean that the initial character of the tag keys are lowercased (which helps in the Guardian environment as we use `App` in tags but `app` in ELK)
 - `overwrittenFields.<fieldName>`: if the fields above clash with fields in an incoming JSON document then we will move the original fields into a field with this prefix

### Scala lambdas
The simplest way to get a Scala lambda to output is to use the built in Log4J support.

You should have a log4j.properties file which looks like this:
```
log=.
log4j.rootLogger=INFO,LAMBDA

# You might want this if using WS
#log4j.logger.io.netty=WARN,LAMBDA

# Define the LAMBDA appender
log4j.appender.LAMBDA=com.amazonaws.services.lambda.runtime.log4j.LambdaAppender
# Configure for JSON output
log4j.appender.LAMBDA.layout=net.logstash.log4j.JSONEventLayoutV1
```

That will require the following dependencies (`slf4j-log4j12` forwards logs to the log4j framework):
```
"com.amazonaws" % "aws-lambda-java-log4j" % "1.0.0",
"org.slf4j" % "slf4j-log4j12" % "1.7.21",
"net.logstash.log4j" % "jsonevent-layout" % "1.7",
```

## Deployment
> **Note**
> This stack is maintained by [@guardian/devx-operations](https://github.com/orgs/guardian/teams/devx-operations), who would be happy to help with any issues.

This service is deployed via Riff-Raff, see `tools::cloudwatch-logs-management`.

To deploy this service into a new account:
  1. Prepare your account. The following SSM parameters need to exist:
     - `/account/services/artifact.bucket`
     - `/account/services/logging.stream`
  2. Raise a PR, adding your [deployment-stack](https://riffraff.gutools.co.uk/deployinfo/data?key=credentials%3Aaws-cfn-role) to [`packages/cdk/bin/cdk.ts`](packages/cdk/bin/cdk.ts):
     - For deployment-stacks with logs that contain PII data, add use the `retentionOnlyStacks` array. 
     - For all other deployment-stacks, use the `retentionAndTransferStacks` array.
  3. Merge the PR; Riff-Raff is configured to continuously deploy this service
  4. In order for shipped logs appear in Kibana, add the Kinesis stream source from the `aws-account-setup` infrastructure stack to this [file](https://github.com/guardian/deploy-tools-platform/blob/main/elk/src/source.config.ts).

## Development
### Requirements
  - [NVM](https://github.com/creationix/nvm)
  - [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)

The above requirements are in the supplied Brewfile and installed via `scripts/setup.sh`.

### Setup
  - `scripts/setup.sh`
  - `nvm use`
  - `npm run build`

## Testing Changes and Observability
Due to the nature of this project, there is no pre-production environment available for testing changes. Consequently, we recommend using Riff-Raff to deploy your branch to an individual account in order to validate your changes in production. In order to do this, select `Preview` from the deployment page (instead of `Deploy Now`). Next `Deselect all` and then manually select all deployment tasks for a specific account. Once you’ve done this you can `Preview with selections`, check the list of tasks and then `Deploy`.

Once you have confirmed that the change works as expected, the PR can be merged. This will automatically roll the change out across all relevant AWS accounts via Riff-Raff. If the change adds or removes a feature, significantly alters AWS resources or is considered to be especially risky, you might also want to inform the teams who own the affected AWS accounts via Chat/email. 

[For safety reasons](https://github.com/guardian/cloudwatch-logs-management/pull/112), the lambda responsible for shipping log entries does not send any logs to CloudWatch by default. If teams report problems with their lambda logs (e.g. lambda logs are not appearing in Central ELK) or the metrics for this lambda indicate a high number of errors, you can manually enable logs in a specific account by temporarily removing the `DisableCloudWatchLoggingPolicy` from this lambda.
