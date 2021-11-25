Cloudwatch Logs Management
==========================

This set of lambdas provides support to:
 - Set retention/expiry of cloudwatch log groups
 - Provide a lambda that forwards logs from lambdas to Kinesis ELK
 - Automatically seek out lambdas and ECS task definitions and configure log forwarding to ELK

Features
--------

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

Deployment
----------

This is deployed via riff-raff. In order to add a new account and deploy for the first time you should:

Prerequisites:

 1. Ensure that the riff-raff user in the target account has the permissions listed below
 1. Ensure you have an S3 bucket in the target account to store the code for the lambda - this is typically your "dist" bucket
 1. Find the name of the Kinesis stream you are using to send data to ELK
 1. If the kinesis stream is not owned by your target account, find the name of the role used to permit enqueing to that stream

Target account actions:

 1. The name of this bucket needs to be available in SSM under the key `/account/services/artifact.bucket`
 1. The ARN of the target kinesis stream needs to be available in SSM under the key `/account/services/logging.stream`

This project actions:

 1. Add your stack name to the `stacks` section of `riff-raff.yaml`
 1. Deploy this project - this will deploy [a new CloudFormation stack](./template.yaml) to your account
 1. If you want to change the retention or need to add a role to assume when writing to the Kinesis stream you can manually change the settings in the stack after this initial deploy

### Riff-Raff permissions

Your riff-raff user will required the following permissions:

 - s3:*
 - iam:*
 - cloudformation:*
 - lambda:*
 - events:DescribeRule
 - events:PutRule
 - ssm:GetParameter*

This can be simply added as a single policy:

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "CloudwatchLogsManagement",
            "Effect": "Allow",
            "Action": [
                "s3:*",
                "iam:*",
                "cloudformation:*",
                "lambda:*",
                "events:DescribeRule",
                "events:PutRule",
                "ssm:GetParameter*"
            ],
            "Resource": "*"
        }
    ]
}
```

and attached to the riffraff user with the following command:

```
aws --profile $PROFILE --region $REGION iam attach-user-policy --user-name riffraff --policy-arn $POLICY_ARN 
```

### Bucket Parameter

List buckets:
```
aws --profile $PROFILE --region $REGION s3 ls
```

Create parameter:
```
aws --profile $PROFILE --region $REGION ssm put-parameter --name '/account/services/artifact.bucket' --value $VALUE --type String
```

# Kinesis parameter:

Assuming your elk kinesis stream is in the same account, you can use the following commands.  If not, ask which ARN you should use for
the third command below.

List streams:
```
aws --profile $PROFILE --region $REGION kinesis list-streams
```

Get stream ARN:
```
aws --profile $PROFILE --region $REGION kinesis describe-stream --stream-name $NAME | jq -r .StreamDescription.StreamARN
```

Create parameter:
```
aws --profile $PROFILE --region $REGION ssm put-parameter --name '/account/services/logging.stream' --value $VALUE --type String
```


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
