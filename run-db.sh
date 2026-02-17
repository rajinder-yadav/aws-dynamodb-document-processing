#!/bin/bash
cd /opt/local/apps/dynamodb/
java --enable-native-access=ALL-UNNAMED -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb -dbPath /home/vscode/data

# Install DynamoDB Admin GUI
# pnpm i -g dynamodb-admin
#
# Run: dynamodb-admin 