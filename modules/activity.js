// modules/activity.js
// 메신저봇R 활동 시스템 (레벨, 경험치, 채팅 횟수 관리)

// 전역 Replier 객체 (common.js에서 주입받음)
var globalReplier = null;

// 데이터 저장 경로
var DATA_DIR = "/sdcard/DataBase/";

// Replier 객체 설정 (common.js에서 호출)
function setReplier(replier) {
  globalReplier = replier;
}

// 레벨별 필요 경험치 계산 (레벨 1: 100, 레벨 2: 200, 레벨 3: 300...)
function getRequiredExp(level) {
  return level * 100;
}

// 경험치로부터 레벨 계산 (간단한 로직)
function getLevelFromExp(exp) {
  return Math.floor(exp / 100) + 1;
}

// 현재 레벨에서 다음 레벨까지 필요한 경험치
function getExpToNextLevel(currentExp) {
  var currentLevel = getLevelFromExp(currentExp);
  var nextLevelRequiredExp = getRequiredExp(currentLevel);
  return nextLevelRequiredExp - currentExp;
}

// 방별 활동 데이터 로드
function loadActivityData(room) {
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

// 방별 활동 데이터 저장
function saveActivityData(room, data) {
  try {
    var fileName = "activity_" + room + ".json";
    var filePath = DATA_DIR + fileName;
    var jsonData = JSON.stringify(data, null, 2);
    
    FileStream.write(filePath, jsonData);
    return true;
  } catch (error) {
    return false;
  }
}

// 오늘 날짜 키 생성 (YYYY-MM-DD)
function getTodayKey() {
  var today = new Date();
  var year = today.getFullYear();
  var month = String(today.getMonth() + 1).padStart(2, '0');
  var day = String(today.getDate()).padStart(2, '0');
  return year + "-" + month + "-" + day;
}

// 레벨업 축하 메시지 표시
function showLevelUpMessage(room, userId, oldLevel, newLevel) {
  if (globalReplier && newLevel > oldLevel) {
    var message = "🎉 축하합니다! " + userId + "님이 레벨 " + oldLevel + "에서 레벨 " + newLevel + "로 레벨업했습니다! 🎉";
    globalReplier.reply(message);
  }
}

// 사용자 채팅 기록 (메시지마다 호출)
function recordChat(room, userId) {
  var activityData = loadActivityData(room);
  var todayKey = getTodayKey();
  
  // 사용자 데이터 초기화
  if (!activityData.users[userId]) {
    activityData.users[userId] = {
      totalChats: 0,
      exp: 0,
      level: 1,
      joinDate: new Date().toISOString()
    };
  }
  
  // 이전 레벨 저장 (레벨업 감지용)
  var oldLevel = activityData.users[userId].level;
  
  // 일일 통계 초기화
  if (!activityData.dailyStats[todayKey]) {
    activityData.dailyStats[todayKey] = {};
  }
  if (!activityData.dailyStats[todayKey][userId]) {
    activityData.dailyStats[todayKey][userId] = 0;
  }
  
  // 채팅 횟수 증가
  activityData.users[userId].totalChats++;
  activityData.dailyStats[todayKey][userId]++;
  
  // 채팅 1번당 0.05 EXP 증가
  activityData.users[userId].exp += 0.05;
  
  // 레벨 업데이트 (경험치 기반으로 자동 계산)
  var newLevel = getLevelFromExp(activityData.users[userId].exp);
  activityData.users[userId].level = newLevel;
  
  // 레벨업 감지 및 축하 메시지
  if (newLevel > oldLevel) {
    showLevelUpMessage(room, userId, oldLevel, newLevel);
  }
  
  saveActivityData(room, activityData);
}

// 사용자에게 EXP 추가 (출석 보상 등)
function addExp(room, userId, expAmount) {
  var activityData = loadActivityData(room);
  
  // 사용자 데이터 초기화
  if (!activityData.users[userId]) {
    activityData.users[userId] = {
      totalChats: 0,
      exp: 0,
      level: 1,
      joinDate: new Date().toISOString()
    };
  }
  
  // 이전 레벨 저장 (레벨업 감지용)
  var oldLevel = activityData.users[userId].level;
  
  // EXP 추가
  activityData.users[userId].exp += expAmount;
  
  // 레벨 업데이트
  var newLevel = getLevelFromExp(activityData.users[userId].exp);
  activityData.users[userId].level = newLevel;
  
  // 레벨업 감지 및 축하 메시지
  if (newLevel > oldLevel) {
    showLevelUpMessage(room, userId, oldLevel, newLevel);
  }
  
  saveActivityData(room, activityData);
  return true;
}

// 사용자 활동 정보 조회
function getUserActivity(room, userId) {
  var activityData = loadActivityData(room);
  var todayKey = getTodayKey();
  
  if (!activityData.users[userId]) {
    return {
      level: 1,
      exp: 0,
      totalChats: 0,
      todayChats: 0,
      expToNext: 100
    };
  }
  
  var userData = activityData.users[userId];
  var todayChats = activityData.dailyStats[todayKey] ? 
    (activityData.dailyStats[todayKey][userId] || 0) : 0;
  
  // 경험치 기반으로 현재 레벨 계산 (항상 최신)
  var currentLevel = getLevelFromExp(userData.exp);
  
  return {
    level: currentLevel,
    exp: userData.exp,
    totalChats: userData.totalChats,
    todayChats: todayChats,
    expToNext: getExpToNextLevel(userData.exp)
  };
}

// 방 전체 활동 순위 조회
function getRoomRanking(room, limit) {
  if (typeof limit === 'undefined') {
    limit = 10;
  }
  
  var activityData = loadActivityData(room);
  var users = activityData.users;
  var ranking = [];
  
  for (var userId in users) {
    if (users.hasOwnProperty(userId)) {
      ranking.push({
        userId: userId,
        level: users[userId].level,
        exp: users[userId].exp,
        totalChats: users[userId].totalChats
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
  
  return ranking.slice(0, limit);
}

// 아래와 같이 반드시 "키: 값" 쌍으로 객체 반환
module.exports = {
  // Replier 설정
  setReplier: setReplier,
  
  // 기본 활동 관리
  recordChat: recordChat,
  addExp: addExp,
  getUserActivity: getUserActivity,
  getRoomRanking: getRoomRanking,
  
  // 레벨/경험치 계산
  getLevelFromExp: getLevelFromExp,
  getRequiredExp: getRequiredExp,
  getExpToNextLevel: getExpToNextLevel
};
