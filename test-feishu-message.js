// 测试飞书消息格式
const testMessage = {
  "msg_type": "post",
  "content": {
    "post": {
      "zh_cn": {
        "title": "测试标题",
        "content": [
          [
            {"tag": "text", "text": "这是第一行"}
          ],
          [
            {"tag": "text", "text": "这是第二行"}
          ]
        ]
      }
    }
  }
};

console.log("飞书富文本消息格式:");
console.log(JSON.stringify(testMessage, null, 2));
