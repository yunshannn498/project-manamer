// 简单测试本地解析器
const text1 = "把写文档调整到明天";
const text2 = "修改写文档改成明天";

const detectIntent = (text) => {
  const lowerText = text.toLowerCase();
  const editPatterns = [
    /修改|更改|调整|编辑/,
    /改成|变成|换成/,
    /从.+[到改]/,
    /设置成|设为/,
    /延期|推迟|提前/,
  ];

  for (const pattern of editPatterns) {
    if (pattern.test(lowerText)) {
      return 'edit';
    }
  }
  return 'create';
};

console.log('测试1:', text1, '->', detectIntent(text1));
console.log('测试2:', text2, '->', detectIntent(text2));
