// 运动类型配置
const SPORT_TYPES = {
  rope_skipping: {
    name: '跳绳',
    calorieFactor: 0.1,  // 每个消耗0.1卡路里
    unit: '个'
  },
  jumping_jacks: {
    name: '开合跳',
    calorieFactor: 0.08,
    unit: '个'
  },
  push_ups: {
    name: '俯卧撑',
    calorieFactor: 0.15,
    unit: '个'
  },
  sit_ups: {
    name: '仰卧起坐',
    calorieFactor: 0.12,
    unit: '个'
  },
  squats: {
    name: '深蹲',
    calorieFactor: 0.1,
    unit: '个'
  }
};

module.exports = SPORT_TYPES;