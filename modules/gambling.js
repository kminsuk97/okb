// modules/gambling.js
// 메신저봇R 베팅 게임 시스템 (포인트 베팅, -10~10배 수익)

// 전역 Replier 객체 (common.js에서 주입받음)
var globalReplier = null;

// 데이터 저장 경로
var DATA_DIR = "/sdcard/DataBase/";

// Replier 객체 설정 (common.js에서 호출)
function setReplier(replier) {
  globalReplier = replier;
}

// 방별 베팅 데이터 로드
function loadGamblingData(room) {
  try {
    var fileName = "gambling_" + room + ".json";
    var filePath = DATA_DIR + fileName;
    
    var data = FileStream.read(filePath);
    if (data && data !== "") {
      return JSON.parse(data);
    }
    
    return { 
      userStats: {},
      gameHistory: [],
      roomStats: {
        totalBets: 0,
        totalWinnings: 0,
        totalLosses: 0,
        totalGames: 0
      },
      bettingEnabled: true,
      dailyBettingLimit: 10,
      dailyBettingCount: {}
    };
  } catch (error) {
    return { 
      userStats: {},
      gameHistory: [],
      roomStats: {
        totalBets: 0,
        totalWinnings: 0,
        totalLosses: 0,
        totalGames: 0
      },
      bettingEnabled: true,
      dailyBettingLimit: 10,
      dailyBettingCount: {}
    };
  }
}

// 방별 베팅 데이터 저장
function saveGamblingData(room, data) {
  try {
    var fileName = "gambling_" + room + ".json";
    var filePath = DATA_DIR + fileName;
    var jsonData = JSON.stringify(data, null, 2);
    
    FileStream.write(filePath, jsonData);
    return true;
  } catch (error) {
    return false;
  }
}

// 사용자가 채팅방에 존재하는지 확인
function isUserExists(room, userId) {
  try {
    var activityData = loadActivityData(room);
    return activityData.users && activityData.users[userId];
  } catch (error) {
    return false;
  }
}

// 활동 데이터 로드 (사용자 존재 확인용)
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

// 포인트 데이터 로드
function loadPointData(room) {
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

// 포인트 데이터 저장
function savePointData(room, data) {
  try {
    var fileName = "points_" + room + ".json";
    var filePath = DATA_DIR + fileName;
    var jsonData = JSON.stringify(data, null, 2);
    
    FileStream.write(filePath, jsonData);
    return true;
  } catch (error) {
    return false;
  }
}

// 베팅 게임 실행
function playBettingGame(room, userId, betAmount) {
  // 베팅 금액 유효성 검사
  if (betAmount <= 0) {
    return {
      success: false,
      message: "베팅 금액은 양수여야 합니다."
    };
  }
  
  // 베팅 데이터 로드 (베팅 상태 확인용)
  var gamblingData = loadGamblingData(room);
  
  // 베팅 중지 상태 확인
  if (gamblingData.bettingEnabled === false) {
    return {
      success: false,
      message: "🚫 현재 베팅이 중지된 상태입니다. 관리자가 베팅을 시작할 때까지 기다려주세요."
    };
  }
  
  // 사용자 존재 확인
  if (!isUserExists(room, userId)) {
    return {
      success: false,
      message: "해당 유저는 채팅방에 없습니다."
    };
  }
  
  // 하루 베팅 횟수 제한 확인
  var today = new Date().toDateString();
  if (!gamblingData.dailyBettingCount) {
    gamblingData.dailyBettingCount = {};
  }
  if (!gamblingData.dailyBettingCount[today]) {
    gamblingData.dailyBettingCount[today] = {};
  }
  
  var userDailyCount = gamblingData.dailyBettingCount[today][userId] || 0;
  var dailyLimit = gamblingData.dailyBettingLimit || 10; // 기본값 10회
  if (userDailyCount >= dailyLimit) {
    return {
      success: false,
      message: "🚫 하루 베팅 횟수 제한(" + dailyLimit + "회)에 도달했습니다. 내일 다시 시도해주세요."
    };
  }
  
  // 포인트 데이터 로드
  var pointData = loadPointData(room);
  var currentPoints = pointData.users[userId] ? (pointData.users[userId].points || 0) : 0;
  
  // 포인트 부족 확인
  if (currentPoints < betAmount) {
    return {
      success: false,
      message: "포인트가 부족합니다. 현재 보유 포인트: " + currentPoints + "P"
    };
  }
  
  // 베팅 횟수 증가
  gamblingData.dailyBettingCount[today][userId] = userDailyCount + 1;
  
  // 사용자 통계 초기화
  if (!gamblingData.userStats[userId]) {
    gamblingData.userStats[userId] = {
      totalBets: 0,
      totalWinnings: 0,
      totalLosses: 0,
      winCount: 0,
      loseCount: 0,
      joinDate: new Date().toISOString()
    };
  }
  
  // -10~10배 랜덤 배수 생성 (가중치 적용)
  var multiplier = generateWeightedMultiplier();
  var roundedMultiplier = Math.round(multiplier);
  var winnings = betAmount * roundedMultiplier;
  var netResult = winnings - betAmount;
  
  // 포인트 업데이트
  var newPoints = currentPoints + netResult;
  if (newPoints < 0) newPoints = 0; // 포인트는 음수가 될 수 없음
  
  if (!pointData.users[userId]) {
    pointData.users[userId] = {
      points: 0,
      joinDate: new Date().toISOString()
    };
  }
  pointData.users[userId].points = newPoints;
  
  // 베팅 기록 추가
  var gameRecord = {
    userId: userId,
    betAmount: betAmount,
    multiplier: roundedMultiplier,
    winnings: winnings,
    netResult: netResult,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleString('ko-KR')
  };
  
  gamblingData.gameHistory.push(gameRecord);
  
  // 최대 200개 게임 기록만 보관
  if (gamblingData.gameHistory.length > 200) {
    gamblingData.gameHistory = gamblingData.gameHistory.slice(-200);
  }
  
  // 사용자 통계 업데이트
  var userStats = gamblingData.userStats[userId];
  userStats.totalBets += betAmount;
  if (netResult > 0) {
    userStats.totalWinnings += netResult;
    userStats.winCount++;
  } else if (netResult < 0) {
    userStats.totalLosses += Math.abs(netResult);
    userStats.loseCount++;
  }
  
  // 방 통계 업데이트
  gamblingData.roomStats.totalBets += betAmount;
  gamblingData.roomStats.totalGames++;
  if (netResult > 0) {
    gamblingData.roomStats.totalWinnings += netResult;
  } else if (netResult < 0) {
    gamblingData.roomStats.totalLosses += Math.abs(netResult);
  }
  
  // 데이터 저장
  savePointData(room, pointData);
  saveGamblingData(room, gamblingData);
  
  // 결과 메시지 생성
  var result = "🎰 " + userId + "님의 베팅 결과\n";
  result += "━━━━━━━━━━━━━\n";
  result += "💰 베팅 금액: " + betAmount + "P\n";
  result += "🎯 배수: " + roundedMultiplier + "배\n";
  result += "💎 획득: " + winnings + "P\n";
  result += "📊 순손익: " + (netResult >= 0 ? "+" : "") + netResult + "P\n";
  result += "💳 현재 포인트: " + newPoints + "P";
  
  if (roundedMultiplier >= 5) {
    result += "\n\n🎉 대박! " + roundedMultiplier + "배로 큰 수익을 얻었습니다!";
  } else if (roundedMultiplier <= -5) {
    result += "\n\n💸 아쉽게도 " + Math.abs(roundedMultiplier) + "배로 큰 손실이 발생했습니다...";
  }
  
  return {
    success: true,
    message: result,
    multiplier: roundedMultiplier,
    winnings: winnings,
    netResult: netResult,
    newPoints: newPoints
  };
}

// 가중치가 적용된 배수 생성 (-10~10배)
function generateWeightedMultiplier() {
  var random = Math.random();
  
  // 확률 분포 (손실 42.5%, 수익 42.5%, 본전 15%)
  if (random < 0.25) {
    // 25% 확률: -10~-2배 (큰 손실)
    return -(Math.random() * 8 + 2);
  } else if (random < 0.425) {
    // 17.5% 확률: -2~-1배 (중간 손실)
    return -(Math.random() + 1);
  } else if (random < 0.575) {
    // 15% 확률: 0~1배 (본전)
    return Math.random();
  } else if (random < 0.775) {
    // 20% 확률: 1~4배 (소폭 수익)
    return Math.random() * 3 + 1;
  } else if (random < 0.9) {
    // 12.5% 확률: 4~7배 (중간 수익)
    return Math.random() * 3 + 4;
  } else {
    // 10% 확률: 7~10배 (대박)
    return Math.random() * 3 + 7;
  }
}

// 게임 설명 조회
function getGameDescription() {
  var description = "🎰 베팅 게임 설명\n";
  description += "━━━━━━━━━━\n";
  description += "💰 베팅 금액: 원하는 포인트만큼 베팅\n";
  description += "🎯 배수 범위: -10배 ~ +10배\n";
  description += "📊 결과: 베팅금액 × 배수 = 획득 포인트\n";
  description += "💎 순손익: 획득 포인트 - 베팅 금액\n\n";
  description += "⚠️ 주의사항:\n";
  description += "• 포인트가 부족하면 베팅할 수 없습니다\n";
  description += "• 음수 베팅은 불가능합니다\n";
  description += "• 포인트를 잃을 수도 있습니다\n";
  description += "• 베팅은 되돌릴 수 없습니다\n\n";
  description += "💡 사용법: !베팅 [포인트]\n";
  description += "예시: !베팅 100";
  
  return description;
}

// 사용자 베팅 통계 조회
function getUserGamblingStats(room, userId) {
  var gamblingData = loadGamblingData(room);
  
  if (!gamblingData.userStats[userId]) {
    return "📊 " + userId + "님의 베팅 기록이 없습니다.";
  }
  
  var userStats = gamblingData.userStats[userId];
  var winRate = userStats.winCount + userStats.loseCount > 0 ? 
    (userStats.winCount / (userStats.winCount + userStats.loseCount) * 100).toFixed(1) : 0;
  
  var result = "📊 " + userId + "님의 베팅 통계\n";
  result += "━━━━━━━━━━━━━\n";
  result += "💰 총 베팅: " + userStats.totalBets + "P\n";
  result += "🎯 승리 횟수: " + userStats.winCount + "회\n";
  result += "💸 패배 횟수: " + userStats.loseCount + "회\n";
  result += "📈 승률: " + winRate + "%\n";
  result += "💎 총 수익: " + userStats.totalWinnings + "P\n";
  result += "📉 총 손실: " + userStats.totalLosses + "P\n";
  result += "📊 순손익: " + (userStats.totalWinnings - userStats.totalLosses) + "P";
  
  return result;
}

// 방 베팅 통계 조회
function getRoomGamblingStats(room) {
  var gamblingData = loadGamblingData(room);
  var roomStats = gamblingData.roomStats;
  
  var result = "🎰 방 베팅 통계\n";
  result += "━━━━━━━━━━━━━\n";
  result += "🎮 총 게임 수: " + roomStats.totalGames + "회\n";
  result += "💰 총 베팅: " + roomStats.totalBets + "P\n";
  result += "💎 총 수익: " + roomStats.totalWinnings + "P\n";
  result += "📉 총 손실: " + roomStats.totalLosses + "P\n";
  result += "📊 순손익: " + (roomStats.totalWinnings - roomStats.totalLosses) + "P";
  
  return result;
}

// 최근 베팅 기록 조회
function getRecentBets(room, limit) {
  if (typeof limit === 'undefined') {
    limit = 10;
  }
  
  var gamblingData = loadGamblingData(room);
  var recentBets = gamblingData.gameHistory.slice(-limit).reverse();
  
  if (recentBets.length === 0) {
    return "📝 최근 베팅 기록이 없습니다.";
  }
  
  var result = "📝 최근 베팅 기록 TOP " + limit + "\n";
  result += "━━━━━━━━━━━━━\n";
  
  for (var i = 0; i < recentBets.length; i++) {
    var bet = recentBets[i];
    var emoji = bet.multiplier >= 0 ? "🎉" : "💸";
    var netResult = bet.netResult >= 0 ? "+" + bet.netResult : bet.netResult;
    
    result += emoji + " " + bet.userId + " - " + bet.betAmount + "P → " + 
              bet.multiplier + "배 (" + netResult + "P)\n";
  }
  
  return result;
}

// 베팅 중지 (관리자 전용)
function stopBetting(room, adminUserId) {
  var gamblingData = loadGamblingData(room);
  gamblingData.bettingEnabled = false;
  
  if (saveGamblingData(room, gamblingData)) {
    return {
      success: true,
      message: "🚫 베팅이 중지되었습니다. 중요한 이야기 시간입니다."
    };
  } else {
    return {
      success: false,
      message: "베팅 중지 설정에 실패했습니다."
    };
  }
}

// 베팅 시작 (관리자 전용)
function startBetting(room, adminUserId) {
  var gamblingData = loadGamblingData(room);
  gamblingData.bettingEnabled = true;
  
  if (saveGamblingData(room, gamblingData)) {
    return {
      success: true,
      message: "✅ 베팅이 시작되었습니다. 다시 베팅을 즐기실 수 있습니다!"
    };
  } else {
    return {
      success: false,
      message: "베팅 시작 설정에 실패했습니다."
    };
  }
}

// 베팅 횟수 제한 설정 (관리자 전용)
function setDailyBettingLimit(room, limit, adminUserId) {
  if (limit < 1 || limit > 100) {
    return {
      success: false,
      message: "베팅 횟수 제한은 1회 이상 100회 이하여야 합니다."
    };
  }
  
  var gamblingData = loadGamblingData(room);
  gamblingData.dailyBettingLimit = limit;
  
  if (saveGamblingData(room, gamblingData)) {
    return {
      success: true,
      message: "✅ 하루 베팅 횟수 제한이 " + limit + "회로 설정되었습니다."
    };
  } else {
    return {
      success: false,
      message: "베팅 횟수 제한 설정에 실패했습니다."
    };
  }
}

// 베팅 상태 조회
function getBettingStatus(room) {
  var gamblingData = loadGamblingData(room);
  var today = new Date().toDateString();
  var todayCount = (gamblingData.dailyBettingCount && gamblingData.dailyBettingCount[today]) || {};
  
  // Object.values() 대신 for...in 루프 사용
  var totalTodayBets = 0;
  for (var userId in todayCount) {
    if (todayCount.hasOwnProperty(userId)) {
      totalTodayBets += todayCount[userId];
    }
  }
  
  var status = "🎰 베팅 상태\n";
  status += "━━━━━━━━━━━━━\n";
  status += "📊 베팅 상태: " + (gamblingData.bettingEnabled !== false ? "✅ 활성화" : "🚫 중지") + "\n";
  status += "📅 하루 제한: " + (gamblingData.dailyBettingLimit || 10) + "회\n";
  status += "🎮 오늘 총 베팅: " + totalTodayBets + "회\n";
  
  if (gamblingData.bettingEnabled === false) {
    status += "\n⚠️ 현재 베팅이 중지된 상태입니다.";
  }
  
  return status;
}

// 아래와 같이 반드시 "키: 값" 쌍으로 객체 반환
module.exports = {
  // Replier 설정
  setReplier: setReplier,
  
  // 베팅 게임
  playBettingGame: playBettingGame,
  getGameDescription: getGameDescription,
  
  // 통계 및 조회
  getUserGamblingStats: getUserGamblingStats,
  getRoomGamblingStats: getRoomGamblingStats,
  getRecentBets: getRecentBets,
  getBettingStatus: getBettingStatus,
  
  // 관리자 기능
  stopBetting: stopBetting,
  startBetting: startBetting,
  setDailyBettingLimit: setDailyBettingLimit
};
