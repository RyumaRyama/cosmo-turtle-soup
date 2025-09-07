import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";

export const handler = async (event) => {
  // データ取得
  const body = JSON.parse(event.body);
  console.log(body);
  const watchword = body.watchword;
  const question_id = body.question_id;
  const judgment = body.judgment;

  const judgmentItem = {
    watchword: watchword,
    questionId: question_id,
    judgment: judgment,
  }

  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  const putCommand = new PutCommand({
    TableName: process.env.QUESTION_JUDGMENT_TABLE_NAME,
    Item: {
      connectionId: event.requestContext.connectionId,
      ...judgmentItem,
    },
  });

  try {
    await docClient.send(putCommand)
  } catch (err) {
    console.log(err)
    return {
      statusCode: 500
    };
  }

  console.log("Saved judgment:", judgmentItem);
  console.log(JSON.stringify(judgmentItem));

  // 投票通知
  const scanCommand = new ScanCommand({
    TableName: process.env.WEBSOCKET_TABLE_NAME
  })

  let connections;
  try {
    connections = await docClient.send(scanCommand);
  } catch (err) {
    console.log(err)
    return {
      statusCode: 500,
    };
  }
  const callbackAPI = new ApiGatewayManagementApiClient({
    apiVersion: '2018-11-29',
    endpoint: 'https://' + event.requestContext.domainName + '/' + event.requestContext.stage,
  });
  const sendJudgments = connections.Items.map(async ({ connectionId }) => {
    if (connectionId === event.requestContext.connectionId) {
      return;
    }
    try {
      await callbackAPI.send(new PostToConnectionCommand(
        { ConnectionId: connectionId, Data: JSON.stringify(judgmentItem), }
      ));
    } catch (e) {
      console.log(e);
    }
  });

  try {
    await Promise.all(sendJudgments);
  } catch (e) {
    console.log(e);
    return {
      statusCode: 500,
    };
  }

  return {
    statusCode: 200,
  };
};
