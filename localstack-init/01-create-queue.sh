#!/bin/sh
awslocal sqs create-queue --queue-name my-queue

echo "SQS Queue created!"