import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";

export const handler = async (event) => {
  // データ取得
  const body = JSON.parse(event.body);
  const watchword = body.watchword;

  const getCommand = new GetCommand({
    TableName: process.env.WEBSOCKET_UMIGAME_TABLE_NAME,
    Key: {
      watchword: watchword,
    },
  });

  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  let umigame;

  try {
    const response = await docClient.send(getCommand);

    // データが存在する場合
    if (response.Item) {
      console.log("取得成功:", response.Item);
      umigame = response.Item;
    } else {
      // データが存在しない場合
      console.log("データが見つかりませんでした。");
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Not Found" }),
      };
    }
  } catch (error) {
    console.error("エラー:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }


  // 問題通知
  const callbackAPI = new ApiGatewayManagementApiClient({
    apiVersion: '2018-11-29',
    endpoint: 'https://' + event.requestContext.domainName + '/' + event.requestContext.stage,
  });

  const sendUmigame = async () => {
    try {
      await callbackAPI.send(new PostToConnectionCommand(
        { ConnectionId: event.requestContext.connectionId, Data: JSON.stringify(umigame), }
      ));
    } catch (e) {
      console.log(e);
    }
  };

  try {
    await sendUmigame();
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
