// modules/eyegame.js
// 메신저봇R 눈치게임 시스템 (누적 포인트, 극악의 확률로 당첨)

// 전역 Replier 객체 (common.js에서 주입받음)
var globalReplier = null;

// 데이터 저장 경로
var DATA_DIR = "/sdcard/DataBase/";

// Replier 객체 설정 (common.js에서 호출)
function setReplier(replier) {
  globalReplier = replier;
}

// 방별 눈치게임 데이터 로드
function loadEyeGameData(room) {
  try {
    var fileName = "eyegame_" + room + ".json";
    var filePath = DATA_DIR + fileName;
    
    var data = FileStream.read(filePath);
    if (data && data !== "") {
      return JSON.parse(data);
    }
    
    return { 
      gameEnabled: true,
      accumulatedPoints: 0,
      participants: [],
      gameHistory: [],
      roomStats: {
        totalGames: 0,
        totalWinnings: 0,
        totalBets: 0,
        lastWinner: null,
        lastWinDate: null
      }
    };
  } catch (error) {
    return { 
      gameEnabled: true,
      accumulatedPoints: 0,
      participants: [],
      gameHistory: [],
      roomStats: {
        totalGames: 0,
        totalWinnings: 0,
        totalBets: 0,
        lastWinner: null,
        lastWinDate: null
      }
    };
  }
}

// 방별 눈치게임 데이터 저장
function saveEyeGameData(room, data) {
  try {
    var fileName = "eyegame_" + room + ".json";
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

// 눈치게임 참여
function playEyeGame(room, userId, betAmount) {
  // 베팅 금액 유효성 검사
  if (betAmount <= 0) {
    return {
      success: false,
      message: "베팅 금액은 양수여야 합니다."
    };
  }
  
  // 사용자 존재 확인
  if (!isUserExists(room, userId)) {
    return {
      success: false,
      message: "해당 유저는 채팅방에 없습니다."
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
  
  // 눈치게임 데이터 로드
  var eyeGameData = loadEyeGameData(room);
  
  // 게임 중지 상태 확인
  if (eyeGameData.gameEnabled === false) {
    return {
      success: false,
      message: "🚫 현재 눈치게임이 중지된 상태입니다. 관리자가 게임을 시작할 때까지 기다려주세요."
    };
  }
  
  // 포인트 차감
  var newPoints = currentPoints - betAmount;
  if (!pointData.users[userId]) {
    pointData.users[userId] = {
      points: 0,
      joinDate: new Date().toISOString()
    };
  }
  pointData.users[userId].points = newPoints;
  
  // 누적 포인트 증가
  eyeGameData.accumulatedPoints += betAmount;
  
  // 참여자 추가 (중복 체크)
  var existingParticipant = null;
  for (var i = 0; i < eyeGameData.participants.length; i++) {
    if (eyeGameData.participants[i].userId === userId) {
      existingParticipant = eyeGameData.participants[i];
      break;
    }
  }
  
  if (existingParticipant) {
    // 기존 참여자: 베팅 금액과 참여 횟수 추가
    existingParticipant.betAmount += betAmount;
    existingParticipant.participantCount = (existingParticipant.participantCount || 1) + 1;
    existingParticipant.timestamp = new Date().toISOString();
    existingParticipant.date = new Date().toLocaleString('ko-KR');
  } else {
    // 새 참여자: 목록에 추가
    var participant = {
      userId: userId,
      betAmount: betAmount,
      participantCount: 1,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString('ko-KR')
    };
    eyeGameData.participants.push(participant);
  }
  
  // 극악의 확률로 당첨 확인 (1% 확률)
  var isWinner = Math.random() < 0.01;
  
  // 현재 게임의 총 참여 횟수 계산
  var totalParticipations = 0;
  for (var i = 0; i < eyeGameData.participants.length; i++) {
    totalParticipations += eyeGameData.participants[i].participantCount || 1;
  }
  
  var result = {
    success: true,
    message: "",
    isWinner: isWinner,
    accumulatedPoints: eyeGameData.accumulatedPoints,
    newPoints: newPoints,
    participantCount: eyeGameData.participants.length,
    totalParticipations: totalParticipations
  };
  
  if (isWinner) {
    // 당첨! 누적 포인트 모두 획득
    var totalWinnings = eyeGameData.accumulatedPoints;
    var finalPoints = newPoints + totalWinnings;
    pointData.users[userId].points = finalPoints;
    
    // 게임 기록 추가
    var gameRecord = {
      winner: userId,
      totalWinnings: totalWinnings,
      participantCount: eyeGameData.participants.length,
      participants: eyeGameData.participants.slice(),
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString('ko-KR')
    };
    eyeGameData.gameHistory.push(gameRecord);
    
    // 최대 50개 게임 기록만 보관
    if (eyeGameData.gameHistory.length > 50) {
      eyeGameData.gameHistory = eyeGameData.gameHistory.slice(-50);
    }
    
    // 방 통계 업데이트
    eyeGameData.roomStats.totalGames++;
    eyeGameData.roomStats.totalWinnings += totalWinnings;
    eyeGameData.roomStats.totalBets += eyeGameData.accumulatedPoints;
    eyeGameData.roomStats.lastWinner = userId;
    eyeGameData.roomStats.lastWinDate = new Date().toISOString();
    
    // 게임 초기화
    eyeGameData.accumulatedPoints = 0;
    eyeGameData.participants = [];
    
    result.message = "🎉🎉🎉 대박! " + userId + "님이 당첨되었습니다! 🎉🎉🎉\n";
    result.message += "━━━━━━━━━━━━━\n";
    result.message += "💰 누적 포인트: " + totalWinnings + "P\n";
    result.message += "🎯 총 참여 횟수: " + totalParticipations + "회\n";
    result.message += "👥 참여자 수: " + gameRecord.participantCount + "명\n";
    result.message += "💎 획득 포인트: " + totalWinnings + "P\n";
    result.message += "💳 현재 포인트: " + finalPoints + "P\n\n";
    result.message += "🎊 축하합니다! 게임이 초기화되었습니다!";
    
    result.newPoints = finalPoints;
  } else {
    // 미당첨
    result.message = "👁️ " + userId + "님의 눈치게임 참여\n";
    result.message += "━━━━━━━━━━━━━\n";
    result.message += "💰 베팅 금액: " + betAmount + "P\n";
    result.message += "📊 누적 포인트: " + eyeGameData.accumulatedPoints + "P\n";
    result.message += "🎯 총 참여 횟수: " + totalParticipations + "회\n";
    result.message += "👥 참여자 수: " + eyeGameData.participants.length + "명\n";
    result.message += "💳 현재 포인트: " + newPoints + "P\n\n";
    result.message += "😅 아쉽게도 당첨되지 않았습니다...\n";
    result.message += "🎯 다음 사람이 당첨될까요?";
  }
  
  // 데이터 저장
  savePointData(room, pointData);
  saveEyeGameData(room, eyeGameData);
  
  return result;
}

// 눈치게임 상태 조회
function getEyeGameStatus(room) {
  var eyeGameData = loadEyeGameData(room);
  
  // 현재 게임의 총 참여 횟수 계산
  var totalParticipations = 0;
  for (var i = 0; i < eyeGameData.participants.length; i++) {
    totalParticipations += eyeGameData.participants[i].participantCount || 1;
  }
  
  var status = "👁️ 눈치게임 상태\n";
  status += "━━━━━━━━━━━━━\n";
  status += "📊 게임 상태: " + (eyeGameData.gameEnabled ? "✅ 활성화" : "🚫 중지") + "\n";
  status += "💰 누적 포인트: " + eyeGameData.accumulatedPoints + "P\n";
  status += "🎯 총 참여 횟수: " + totalParticipations + "회\n";
  status += "👥 참여자 수: " + eyeGameData.participants.length + "명\n";
  status += "🏆 마지막 당첨자: " + (eyeGameData.roomStats.lastWinner || "없음") + "\n";
  status += "💎 총 당첨금: " + eyeGameData.roomStats.totalWinnings + "P";
  
  if (eyeGameData.participants.length > 0) {
    status += "\n\n📋 현재 참여자 목록:\n";
    for (var i = 0; i < eyeGameData.participants.length; i++) {
      var participant = eyeGameData.participants[i];
      var countText = participant.participantCount > 1 ? " (" + participant.participantCount + "회)" : "";
      status += "• " + participant.userId + " (총 " + participant.betAmount + "P" + countText + ")\n";
    }
  }
  
  if (eyeGameData.gameEnabled === false) {
    status += "\n\n⚠️ 현재 눈치게임이 중지된 상태입니다.";
  }
  
  return status;
}

// 눈치게임 중지 (관리자 전용)
function stopEyeGame(room, adminUserId) {
  var eyeGameData = loadEyeGameData(room);
  eyeGameData.gameEnabled = false;
  
  if (saveEyeGameData(room, eyeGameData)) {
    return {
      success: true,
      message: "🚫 눈치게임이 중지되었습니다. 현재 누적된 포인트는 보존됩니다."
    };
  } else {
    return {
      success: false,
      message: "눈치게임 중지 설정에 실패했습니다."
    };
  }
}

// 눈치게임 시작 (관리자 전용)
function startEyeGame(room, adminUserId) {
  var eyeGameData = loadEyeGameData(room);
  eyeGameData.gameEnabled = true;
  
  if (saveEyeGameData(room, eyeGameData)) {
    var message = "✅ 눈치게임이 시작되었습니다!";
    if (eyeGameData.accumulatedPoints > 0) {
      message += "\n💰 현재 누적 포인트: " + eyeGameData.accumulatedPoints + "P";
      message += "\n👥 참여자 수: " + eyeGameData.participants.length + "명";
    }
    message += "\n🎯 누적 포인트에 도전해보세요!";
    
    return {
      success: true,
      message: message
    };
  } else {
    return {
      success: false,
      message: "눈치게임 시작 설정에 실패했습니다."
    };
  }
}

// 눈치게임 초기화 (관리자 전용)
function resetEyeGame(room, adminUserId) {
  var eyeGameData = loadEyeGameData(room);
  
  var resetInfo = {
    accumulatedPoints: eyeGameData.accumulatedPoints,
    participantCount: eyeGameData.participants.length
  };
  
  // 게임 초기화
  eyeGameData.accumulatedPoints = 0;
  eyeGameData.participants = [];
  
  if (saveEyeGameData(room, eyeGameData)) {
    var message = "🔄 눈치게임이 초기화되었습니다!";
    if (resetInfo.accumulatedPoints > 0) {
      message += "\n💰 초기화된 누적 포인트: " + resetInfo.accumulatedPoints + "P";
      message += "\n👥 초기화된 참여자 수: " + resetInfo.participantCount + "명";
    }
    
    return {
      success: true,
      message: message
    };
  } else {
    return {
      success: false,
      message: "눈치게임 초기화에 실패했습니다."
    };
  }
}

// 최근 눈치게임 기록 조회
function getRecentEyeGames(room, limit) {
  if (typeof limit === 'undefined') {
    limit = 10;
  }
  
  var eyeGameData = loadEyeGameData(room);
  var recentGames = eyeGameData.gameHistory.slice(-limit).reverse();
  
  if (recentGames.length === 0) {
    return "📝 최근 눈치게임 기록이 없습니다.";
  }
  
  var result = "📝 최근 눈치게임 기록 TOP " + limit + "\n";
  result += "━━━━━━━━━━━━━\n";
  
  for (var i = 0; i < recentGames.length; i++) {
    var game = recentGames[i];
    result += "🎉 " + game.winner + " - " + game.totalWinnings + "P (참여자 " + game.participantCount + "명)\n";
  }
  
  return result;
}

// 아래와 같이 반드시 "키: 값" 쌍으로 객체 반환
module.exports = {
  // Replier 설정
  setReplier: setReplier,
  
  // 눈치게임
  playEyeGame: playEyeGame,
  getEyeGameStatus: getEyeGameStatus,
  
  // 관리자 기능
  stopEyeGame: stopEyeGame,
  startEyeGame: startEyeGame,
  resetEyeGame: resetEyeGame,
  
  // 통계 및 조회
  getRecentEyeGames: getRecentEyeGames
};
