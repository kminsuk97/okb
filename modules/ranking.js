// modules/ranking.js
// 메신저봇R 랭킹 시스템 (일일 채팅, 포인트, 레벨 랭킹)

// 전역 Replier 객체 (common.js에서 주입받음)
var globalReplier = null;

// 데이터 저장 경로
var DATA_DIR = "/sdcard/DataBase/";

// Replier 객체 설정 (common.js에서 호출)
function setReplier(replier) {
  globalReplier = replier;
}

// 오늘 날짜 키 생성 (YYYY-MM-DD)
function getTodayKey() {
  var today = new Date();
  var year = today.getFullYear();
  var month = String(today.getMonth() + 1).padStart(2, '0');
  var day = String(today.getDate()).padStart(2, '0');
  return year + "-" + month + "-" + day;
}

// 방별 랭킹 데이터 로드
function loadRankingData(room) {
  try {
    var fileName = "ranking_" + room + ".json";
    var filePath = DATA_DIR + fileName;
    
    var data = FileStream.read(filePath);
    if (data && data !== "") {
      return JSON.parse(data);
    }
    
    return { 
      dailyRankings: {},
      dailyRewards: {},
      roomStats: {
        totalDays: 0,
        totalRewards: 0
      }
    };
  } catch (error) {
    return { 
      dailyRankings: {},
      dailyRewards: {},
      roomStats: {
        totalDays: 0,
        totalRewards: 0
      }
    };
  }
}

// 방별 랭킹 데이터 저장
function saveRankingData(room, data) {
  try {
    var fileName = "ranking_" + room + ".json";
    var filePath = DATA_DIR + fileName;
    var jsonData = JSON.stringify(data, null, 2);
    
    FileStream.write(filePath, jsonData);
    return true;
  } catch (error) {
    return false;
  }
}

// 일일 채팅 랭킹 생성
function generateDailyChatRanking(room, activityData) {
  var todayKey = getTodayKey();
  var dailyStats = activityData.dailyStats[todayKey] || {};
  var ranking = [];
  
  for (var userId in dailyStats) {
    if (dailyStats.hasOwnProperty(userId)) {
      ranking.push({
        userId: userId,
        chatCount: dailyStats[userId]
      });
    }
  }
  
  // 채팅 수 순으로 정렬
  ranking.sort(function(a, b) {
    return b.chatCount - a.chatCount;
  });
  
  return ranking.slice(0, 20); // 상위 20명
}

// 포인트 랭킹 생성
function generatePointRanking(room, pointData) {
  var ranking = [];
  
  for (var userId in pointData.users) {
    if (pointData.users.hasOwnProperty(userId)) {
      ranking.push({
        userId: userId,
        points: pointData.users[userId].points || 0
      });
    }
  }
  
  // 포인트 순으로 정렬
  ranking.sort(function(a, b) {
    return b.points - a.points;
  });
  
  return ranking.slice(0, 20); // 상위 20명
}

// 레벨 랭킹 생성
function generateLevelRanking(room, activityData) {
  var ranking = [];
  
  for (var userId in activityData.users) {
    if (activityData.users.hasOwnProperty(userId)) {
      var userData = activityData.users[userId];
      var level = Math.floor(userData.exp / 100) + 1; // 레벨 계산
      ranking.push({
        userId: userId,
        level: level,
        exp: userData.exp,
        totalChats: userData.totalChats
      });
    }
  }
  
  // 레벨 순으로 정렬 (레벨이 같으면 경험치 순)
  ranking.sort(function(a, b) {
    if (a.level !== b.level) {
      return b.level - a.level;
    }
    return b.exp - a.exp;
  });
  
  return ranking.slice(0, 20); // 상위 20명
}

// 일일 채팅 랭킹 조회
function getDailyChatRanking(room) {
  // 활동 데이터 로드
  var activityData = loadActivityData(room);
  var ranking = generateDailyChatRanking(room, activityData);
  
  var result = "📊 금일 채팅 랭킹 TOP 20\n";
  result += "━━━━━━━━━━━━━\n";
  
  if (ranking.length === 0) {
    result += "📭 오늘 채팅 데이터가 없습니다.";
    return result;
  }
  
  for (var i = 0; i < ranking.length; i++) {
    var rank = i + 1;
    var user = ranking[i];
    var medal = "";
    
    if (rank === 1) medal = "🥇";
    else if (rank === 2) medal = "🥈";
    else if (rank === 3) medal = "🥉";
    else medal = "🏅";
    
    result += medal + " " + rank + "위. " + user.userId + " - " + user.chatCount + "회\n";
  }
  
  return result;
}

// 포인트 랭킹 조회
function getPointRanking(room) {
  // 포인트 데이터 로드
  var pointData = loadPointData(room);
  var ranking = generatePointRanking(room, pointData);
  
  var result = "💰 포인트 랭킹 TOP 20\n";
  result += "━━━━━━━━━━━━━\n";
  
  if (ranking.length === 0) {
    result += "📭 포인트 데이터가 없습니다.";
    return result;
  }
  
  for (var i = 0; i < ranking.length; i++) {
    var rank = i + 1;
    var user = ranking[i];
    var medal = "";
    
    if (rank === 1) medal = "🥇";
    else if (rank === 2) medal = "🥈";
    else if (rank === 3) medal = "🥉";
    else medal = "🏅";
    
    result += medal + " " + rank + "위. " + user.userId + " - " + user.points + "P\n";
  }
  
  return result;
}

// 레벨 랭킹 조회
function getLevelRanking(room) {
  // 활동 데이터 로드
  var activityData = loadActivityData(room);
  var ranking = generateLevelRanking(room, activityData);
  
  var result = "⭐ 레벨 랭킹 TOP 20\n";
  result += "━━━━━━━━━━━━━\n";
  
  if (ranking.length === 0) {
    result += "📭 레벨 데이터가 없습니다.";
    return result;
  }
  
  for (var i = 0; i < ranking.length; i++) {
    var rank = i + 1;
    var user = ranking[i];
    var medal = "";
    
    if (rank === 1) medal = "🥇";
    else if (rank === 2) medal = "🥈";
    else if (rank === 3) medal = "🥉";
    else medal = "🏅";
    
    result += medal + " " + rank + "위. " + user.userId + " - Lv." + user.level + " (" + user.exp.toFixed(1) + "EXP)\n";
  }
  
  return result;
}

// 일일 상위 3명 보상 지급
function giveDailyRewards(room) {
  var todayKey = getTodayKey();
  var rankingData = loadRankingData(room);
  
  // 이미 오늘 보상을 지급했는지 확인
  if (rankingData.dailyRewards[todayKey]) {
    return {
      success: false,
      message: "오늘은 이미 보상을 지급했습니다."
    };
  }
  
  // 활동 데이터 로드
  var activityData = loadActivityData(room);
  var ranking = generateDailyChatRanking(room, activityData);
  
  if (ranking.length < 3) {
    return {
      success: false,
      message: "상위 3명이 없어 보상을 지급할 수 없습니다."
    };
  }
  
  var rewards = [
    { rank: 1, points: 100, userId: ranking[0].userId },
    { rank: 2, points: 50, userId: ranking[1].userId },
    { rank: 3, points: 30, userId: ranking[2].userId }
  ];
  
  var result = "🏆 금일 채팅 랭킹!\n";
  result += "━━━━━━━━━━━━━\n";
  
  for (var i = 0; i < rewards.length; i++) {
    var reward = rewards[i];
    var medal = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
    
    result += medal + " " + reward.rank + "위. " + reward.userId + " - " + reward.points + "P\n";
  }
  
  // 보상 지급 기록
  rankingData.dailyRewards[todayKey] = {
    rewards: rewards,
    timestamp: new Date().toISOString()
  };
  
  rankingData.roomStats.totalDays++;
  rankingData.roomStats.totalRewards += 180; // 100 + 50 + 30
  
  saveRankingData(room, rankingData);
  
  return {
    success: true,
    message: result,
    rewards: rewards
  };
}

// 외부 모듈 참조
var activityModule = null;
var pointModule = null;

// 외부 모듈 설정
function setModules(activity, point) {
  activityModule = activity;
  pointModule = point;
}

// 활동 데이터 로드
function loadActivityData(room) {
  if (!activityModule) {
    return { users: {}, dailyStats: {} };
  }
  
  try {
    var fileName = "activity_" + room + ".json";
    var filePath = DATA_DIR + fileName;
    
    var data = FileStream.read(filePath);
    if (data && data !== "") {
      return JSON.parse(data);
    }
    
    return { users: {}, dailyStats: {} };
  } catch (error) {
    return { users: {}, dailyStats: {} };
  }
}

// 포인트 데이터 로드
function loadPointData(room) {
  if (!pointModule) {
    return { users: {} };
  }
  
  try {
    var fileName = "points_" + room + ".json";
    var filePath = DATA_DIR + fileName;
    
    var data = FileStream.read(filePath);
    if (data && data !== "") {
      return JSON.parse(data);
    }
    
    return { users: {} };
  } catch (error) {
    return { users: {} };
  }
}

// 아래와 같이 반드시 "키: 값" 쌍으로 객체 반환
module.exports = {
  // Replier 설정
  setReplier: setReplier,
  setModules: setModules,
  
  // 랭킹 시스템
  getDailyChatRanking: getDailyChatRanking,
  getPointRanking: getPointRanking,
  getLevelRanking: getLevelRanking,
  giveDailyRewards: giveDailyRewards
};
