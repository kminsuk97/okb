// modules/rps.js
// 메신저봇R 가위바위보 게임 시스템 (묵찌빠 베팅, 승리시 2배, 패배시 베팅금액 차감)

// 전역 Replier 객체 (common.js에서 주입받음)
var globalReplier = null;

// 데이터 저장 경로
var DATA_DIR = "/sdcard/DataBase/";

// Replier 객체 설정 (common.js에서 호출)
function setReplier(replier) {
  globalReplier = replier;
}

// 방별 가위바위보 데이터 로드
function loadRpsData(room) {
  try {
    var fileName = "rps_" + room + ".json";
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
        totalGames: 0,
        winCount: 0,
        loseCount: 0,
        drawCount: 0
      }
    };
  } catch (error) {
    return { 
      userStats: {},
      gameHistory: [],
      roomStats: {
        totalBets: 0,
        totalWinnings: 0,
        totalLosses: 0,
        totalGames: 0,
        winCount: 0,
        loseCount: 0,
        drawCount: 0
      }
    };
  }
}

// 방별 가위바위보 데이터 저장
function saveRpsData(room, data) {
  try {
    var fileName = "rps_" + room + ".json";
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

// 가위바위보 게임 실행
function playRpsGame(room, userId, userChoice, betAmount) {
  // 베팅 금액 유효성 검사 (1~100P)
  if (betAmount < 1 || betAmount > 100) {
    return {
      success: false,
      message: "베팅 금액은 1P 이상 100P 이하여야 합니다."
    };
  }
  
  // 사용자 선택 유효성 검사
  var validChoices = ["묵", "찌", "빠"];
  if (validChoices.indexOf(userChoice) === -1) {
    return {
      success: false,
      message: "올바른 선택을 입력해주세요. (묵, 찌, 빠)"
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
  
  // 가위바위보 데이터 로드
  var rpsData = loadRpsData(room);
  
  // 사용자 통계 초기화
  if (!rpsData.userStats[userId]) {
    rpsData.userStats[userId] = {
      totalBets: 0,
      totalWinnings: 0,
      totalLosses: 0,
      winCount: 0,
      loseCount: 0,
      drawCount: 0,
      joinDate: new Date().toISOString()
    };
  }
  
  // 봇의 선택 (랜덤)
  var botChoices = ["묵", "찌", "빠"];
  var botChoice = botChoices[Math.floor(Math.random() * 3)];
  
  // 게임 결과 판정
  var gameResult = getGameResult(userChoice, botChoice);
  var netResult = 0;
  var newPoints = currentPoints;
  
  if (gameResult === "win") {
    // 승리: 2배 획득
    netResult = betAmount;
    newPoints = currentPoints + betAmount;
  } else if (gameResult === "lose") {
    // 패배: 베팅금액 차감
    netResult = -betAmount;
    newPoints = currentPoints - betAmount;
  } else {
    // 무승부: 변화 없음
    netResult = 0;
    newPoints = currentPoints;
  }
  
  // 포인트 업데이트
  if (!pointData.users[userId]) {
    pointData.users[userId] = {
      points: 0,
      joinDate: new Date().toISOString()
    };
  }
  pointData.users[userId].points = newPoints;
  
  // 게임 기록 추가
  var gameRecord = {
    userId: userId,
    userChoice: userChoice,
    botChoice: botChoice,
    betAmount: betAmount,
    result: gameResult,
    netResult: netResult,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleString('ko-KR')
  };
  
  rpsData.gameHistory.push(gameRecord);
  
  // 최대 200개 게임 기록만 보관
  if (rpsData.gameHistory.length > 200) {
    rpsData.gameHistory = rpsData.gameHistory.slice(-200);
  }
  
  // 사용자 통계 업데이트
  var userStats = rpsData.userStats[userId];
  userStats.totalBets += betAmount;
  if (gameResult === "win") {
    userStats.totalWinnings += betAmount;
    userStats.winCount++;
  } else if (gameResult === "lose") {
    userStats.totalLosses += betAmount;
    userStats.loseCount++;
  } else {
    userStats.drawCount++;
  }
  
  // 방 통계 업데이트
  rpsData.roomStats.totalBets += betAmount;
  rpsData.roomStats.totalGames++;
  if (gameResult === "win") {
    rpsData.roomStats.totalWinnings += betAmount;
    rpsData.roomStats.winCount++;
  } else if (gameResult === "lose") {
    rpsData.roomStats.totalLosses += betAmount;
    rpsData.roomStats.loseCount++;
  } else {
    rpsData.roomStats.drawCount++;
  }
  
  // 데이터 저장
  savePointData(room, pointData);
  saveRpsData(room, rpsData);
  
  // 결과 메시지 생성
  var result = "✂️ " + userId + "님의 가위바위보 결과\n";
  result += "━━━━━━━━━━━━━\n";
  result += "👤 당신: " + getChoiceEmoji(userChoice) + " " + userChoice + "\n";
  result += "🤖 소미씨: " + getChoiceEmoji(botChoice) + " " + botChoice + "\n";
  result += "💰 베팅 금액: " + betAmount + "P\n";
  result += "🎯 결과: " + getResultEmoji(gameResult) + " " + getResultText(gameResult) + "\n";
  result += "📊 순손익: " + (netResult >= 0 ? "+" : "") + netResult + "P\n";
  result += "💳 현재 포인트: " + newPoints + "P";
  
  if (gameResult === "win") {
    result += "\n\n🎉 축하합니다! " + betAmount + "P를 획득했습니다!";
  } else if (gameResult === "lose") {
    result += "\n\n💸 아쉽게도 " + betAmount + "P를 잃었습니다...";
  } else {
    result += "\n\n🤝 무승부입니다! 포인트는 그대로입니다.";
  }
  
  return {
    success: true,
    message: result,
    userChoice: userChoice,
    botChoice: botChoice,
    result: gameResult,
    netResult: netResult,
    newPoints: newPoints
  };
}

// 가위바위보 결과 판정
function getGameResult(userChoice, botChoice) {
  if (userChoice === botChoice) {
    return "draw";
  }
  
  // 승리 조건
  if ((userChoice === "묵" && botChoice === "찌") ||
      (userChoice === "찌" && botChoice === "빠") ||
      (userChoice === "빠" && botChoice === "묵")) {
    return "win";
  }
  
  return "lose";
}

// 선택 이모지 반환
function getChoiceEmoji(choice) {
  switch (choice) {
    case "묵": return "✊";
    case "찌": return "✌️";
    case "빠": return "✋";
    default: return "❓";
  }
}

// 결과 이모지 반환
function getResultEmoji(result) {
  switch (result) {
    case "win": return "🎉";
    case "lose": return "💸";
    case "draw": return "🤝";
    default: return "❓";
  }
}

// 결과 텍스트 반환
function getResultText(result) {
  switch (result) {
    case "win": return "승리";
    case "lose": return "패배";
    case "draw": return "무승부";
    default: return "알 수 없음";
  }
}

// 게임 설명 조회
function getGameDescription() {
  var description = "✂️ 가위바위보 게임 설명\n";
  description += "━━━━━━━━━━━━━\n";
  description += "🎯 선택: 묵(주먹), 찌(가위), 빠(보)\n";
  description += "💰 베팅: 1P ~ 100P\n";
  description += "🏆 승리: 베팅금액의 2배 획득\n";
  description += "💸 패배: 베팅금액 차감\n";
  description += "🤝 무승부: 포인트 변화 없음\n\n";
  description += "📋 게임 규칙:\n";
  description += "• 묵(✊) > 찌(✌️)\n";
  description += "• 찌(✌️) > 빠(✋)\n";
  description += "• 빠(✋) > 묵(✊)\n\n";
  description += "💡 사용법: !가위바위보 [묵/찌/빠] [포인트]\n";
  description += "예시: !가위바위보 묵 50";
  
  return description;
}

// 사용자 가위바위보 통계 조회
function getUserRpsStats(room, userId) {
  var rpsData = loadRpsData(room);
  
  if (!rpsData.userStats[userId]) {
    return "📊 " + userId + "님의 가위바위보 기록이 없습니다.";
  }
  
  var userStats = rpsData.userStats[userId];
  var totalGames = userStats.winCount + userStats.loseCount + userStats.drawCount;
  var winRate = totalGames > 0 ? (userStats.winCount / totalGames * 100).toFixed(1) : 0;
  
  var result = "📊 " + userId + "님의 가위바위보 통계\n";
  result += "━━━━━━━━━━━━━\n";
  result += "🎮 총 게임: " + totalGames + "회\n";
  result += "🏆 승리: " + userStats.winCount + "회\n";
  result += "💸 패배: " + userStats.loseCount + "회\n";
  result += "🤝 무승부: " + userStats.drawCount + "회\n";
  result += "📈 승률: " + winRate + "%\n";
  result += "💰 총 베팅: " + userStats.totalBets + "P\n";
  result += "💎 총 수익: " + userStats.totalWinnings + "P\n";
  result += "📉 총 손실: " + userStats.totalLosses + "P\n";
  result += "📊 순손익: " + (userStats.totalWinnings - userStats.totalLosses) + "P";
  
  return result;
}

// 방 가위바위보 통계 조회
function getRoomRpsStats(room) {
  var rpsData = loadRpsData(room);
  var roomStats = rpsData.roomStats;
  
  var result = "✂️ 방 가위바위보 통계\n";
  result += "━━━━━━━━━━━━━\n";
  result += "🎮 총 게임 수: " + roomStats.totalGames + "회\n";
  result += "🏆 총 승리: " + roomStats.winCount + "회\n";
  result += "💸 총 패배: " + roomStats.loseCount + "회\n";
  result += "🤝 총 무승부: " + roomStats.drawCount + "회\n";
  result += "💰 총 베팅: " + roomStats.totalBets + "P\n";
  result += "💎 총 수익: " + roomStats.totalWinnings + "P\n";
  result += "📉 총 손실: " + roomStats.totalLosses + "P\n";
  result += "📊 순손익: " + (roomStats.totalWinnings - roomStats.totalLosses) + "P";
  
  return result;
}

// 최근 가위바위보 기록 조회
function getRecentRpsGames(room, limit) {
  if (typeof limit === 'undefined') {
    limit = 10;
  }
  
  var rpsData = loadRpsData(room);
  var recentGames = rpsData.gameHistory.slice(-limit).reverse();
  
  if (recentGames.length === 0) {
    return "📝 최근 가위바위보 기록이 없습니다.";
  }
  
  var result = "📝 최근 가위바위보 기록 TOP " + limit + "\n";
  result += "━━━━━━━━━━━━━\n";
  
  for (var i = 0; i < recentGames.length; i++) {
    var game = recentGames[i];
    var emoji = getResultEmoji(game.result);
    var netResult = game.netResult >= 0 ? "+" + game.netResult : game.netResult;
    
    result += emoji + " " + game.userId + " - " + getChoiceEmoji(game.userChoice) + " vs " + 
              getChoiceEmoji(game.botChoice) + " (" + game.betAmount + "P, " + netResult + "P)\n";
  }
  
  return result;
}

// 아래와 같이 반드시 "키: 값" 쌍으로 객체 반환
module.exports = {
  // Replier 설정
  setReplier: setReplier,
  
  // 가위바위보 게임
  playRpsGame: playRpsGame,
  getGameDescription: getGameDescription,
  
  // 통계 및 조회
  getUserRpsStats: getUserRpsStats,
  getRoomRpsStats: getRoomRpsStats,
  getRecentRpsGames: getRecentRpsGames
};
