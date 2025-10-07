// 测试时间解析功能
const testCases = [
  '下午五点',
  '下午5点',
  '上午九点',
  '晚上八点',
  '明天下午三点',
  '后天上午10点',
  '今天中午12点',
  '清晨6点',
  '傍晚6点',
];

console.log('时间解析测试用例：');
console.log('='.repeat(50));

testCases.forEach(testCase => {
  console.log(`\n输入: "${testCase}"`);

  const isPM = testCase.includes('下午') || testCase.includes('晚上') || testCase.includes('傍晚');
  const isAM = testCase.includes('上午') || testCase.includes('早上') || testCase.includes('清晨');
  const isNoon = testCase.includes('中午');

  const timeMatch = testCase.match(/(\d{1,2})[点:：](\d{1,2})?/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;

    console.log(`  原始小时: ${hours}`);
    console.log(`  时间段标识: PM=${isPM}, AM=${isAM}, Noon=${isNoon}`);

    if (isPM && hours < 12) {
      hours += 12;
    } else if (isNoon && hours === 12) {
      hours = 12;
    } else if (isAM && hours === 12) {
      hours = 0;
    }

    console.log(`  解析结果: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
  } else {
    console.log('  未匹配到时间');
  }
});

console.log('\n' + '='.repeat(50));
