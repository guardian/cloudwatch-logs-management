Cloudwatch Logs Management
==========================

This set of lambdas provides support to:
 - Set retention/expiry of cloudwatch log groups
 - Provide a lambda that forwards logs from lambdas to Kinesis ELK
 - Automatically seek out lambdas and configure log forwarding to ELK

Features
--------

### Retention/expiry of Cloudwatch Logs Groups
One of the lambdas runs once a day and sets the retention time on all cloudwatch log groups. Typically we forget to set these so now we can forget about forgetting.

### Shipping lambda logs to ELK
Cloudwatch log groups created by Lambda (with prefix `/aws/lambda`) are automatically configured to forward to ELK by these lambdas.

You lambda can:
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

Deployment
----------

This is deployed via riff-raff. In order to add a new account and deploy for the first time you should:
 1. Ensure you have an S3 bucket in the target account to store the code for the lambda - this is typically your "dist" bucket
 1. The name of this bucket needs to be available in SSM under the key `/account/services/artifact.bucket`
 1. The ARN of the target kinesis stream needs to be available in SSM under the key `/account/services/logging.stream`
 1. Add your stack name to the `stacks` section of `riff-raff.yaml`
 1. Use riff-raff to upload the artifact to the dist bucket in your account (use preview and select just the appropriate upload tasks)
 1. Manually deploy the cloudformation template (at `template.yaml`) for the first time, filling in parameters as desired (retention days etc - at the Guardian I recommend that you set `OptionLowerFirstCharOfTags` to true)
 1. Test that you can do a full deploy so you know future updates will work

Development
-----------

### Requirements

* [NVM](https://github.com/creationix/nvm)
* [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)

The above requirements are in the supplied Brewfile and installed via `scripts/setup.sh`.

### Setup

* `scripts/setup.sh`
* `nvm use`
* `npm run build`
