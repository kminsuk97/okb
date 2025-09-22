// modules/lotto.js
// 메신저봇R 로또 시스템 (하루마다 진행, 오후 8시 당첨번호 발표)

// 전역 Replier 객체 (common.js에서 주입받음)
var globalReplier = null;

// 데이터 저장 경로
var DATA_DIR = "/sdcard/DataBase/";

// 방별 자동 발표 타이머 관리
var roomTimers = {};

// Replier 객체 설정 (common.js에서 호출)
function setReplier(replier) {
  globalReplier = replier;
}

// 다음 오후 8시까지의 시간 계산 (밀리초)
function getTimeUntilNext8PM() {
  var now = new Date();
  var next8PM = new Date();
  
  // 오늘 오후 8시 설정
  next8PM.setHours(20, 0, 0, 0);
  
  // 이미 오후 8시가 지났다면 내일 오후 8시로 설정
  if (now >= next8PM) {
    next8PM.setDate(next8PM.getDate() + 1);
  }
  
  return next8PM.getTime() - now.getTime();
}

// 자동 발표 타이머 설정 (방별)
function setupAutoDrawTimer(room) {
  // 기존 타이머가 있다면 취소
  if (roomTimers[room]) {
    clearTimeout(roomTimers[room]);
  }
  
  var timeUntil8PM = getTimeUntilNext8PM();
  
  roomTimers[room] = setTimeout(function() {
    // 자동 발표 실행
    var result = drawLotto(room, "SYSTEM");
    if (result.success && globalReplier) {
      globalReplier.reply(result.message);
    }
    
    // 타이머 정리
    delete roomTimers[room];
    
    // 다음 날을 위한 타이머 재설정 (자동으로는 하지 않음)
    // 관리자가 수동으로 설정해야 함
  }, timeUntil8PM);
  
  // 자동 발표 활성화 상태 저장
  var lottoData = loadLottoData(room);
  lottoData.autoDrawEnabled = true;
  saveLottoData(room, lottoData);
  
  return timeUntil8PM;
}

// 자동 발표 타이머 취소 (방별)
function cancelAutoDrawTimer(room) {
  if (roomTimers[room]) {
    clearTimeout(roomTimers[room]);
    delete roomTimers[room];
  }
  
  // 자동 발표 비활성화 상태 저장
  var lottoData = loadLottoData(room);
  lottoData.autoDrawEnabled = false;
  saveLottoData(room, lottoData);
}

// 모든 방의 자동 발표 타이머 취소
function cancelAllAutoDrawTimers() {
  for (var room in roomTimers) {
    if (roomTimers.hasOwnProperty(room)) {
      clearTimeout(roomTimers[room]);
    }
  }
  roomTimers = {};
}

// 방별 로또 데이터 로드
function loadLottoData(room) {
  try {
    var fileName = "lotto_" + room + ".json";
    var filePath = DATA_DIR + fileName;
    
    var data = FileStream.read(filePath);
    if (data && data !== "") {
      return JSON.parse(data);
    }
    
    return { 
      currentRound: 1,
      tickets: {},
      winningNumbers: null,
      drawDate: null,
      isDrawn: false,
      winners: {},
      lastDrawDate: null, // 마지막 발표 날짜
      autoDrawEnabled: false, // 자동 발표 활성화 상태
      roomStats: {
        totalTickets: 0,
        totalWinnings: 0,
        totalRounds: 0
      }
    };
  } catch (error) {
    return { 
      currentRound: 1,
      tickets: {},
      winningNumbers: null,
      drawDate: null,
      isDrawn: false,
      winners: {},
      lastDrawDate: null, // 마지막 발표 날짜
      autoDrawEnabled: false, // 자동 발표 활성화 상태
      roomStats: {
        totalTickets: 0,
        totalWinnings: 0,
        totalRounds: 0
      }
    };
  }
}

// 방별 로또 데이터 저장
function saveLottoData(room, data) {
  try {
    var fileName = "lotto_" + room + ".json";
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

// 로또 번호 생성 (1~45 중 6개)
function generateLottoNumbers() {
  var numbers = [];
  while (numbers.length < 6) {
    var num = Math.floor(Math.random() * 45) + 1;
    if (numbers.indexOf(num) === -1) {
      numbers.push(num);
    }
  }
  return numbers.sort(function(a, b) { return a - b; });
}

// 로또 번호 유효성 검사
function validateLottoNumbers(numbers) {
  if (!Array.isArray(numbers) || numbers.length !== 6) {
    return false;
  }
  
  for (var i = 0; i < numbers.length; i++) {
    var num = parseInt(numbers[i]);
    if (isNaN(num) || num < 1 || num > 45) {
      return false;
    }
  }
  
  // 중복 번호 체크
  var uniqueNumbers = [];
  for (var i = 0; i < numbers.length; i++) {
    if (uniqueNumbers.indexOf(numbers[i]) === -1) {
      uniqueNumbers.push(numbers[i]);
    }
  }
  
  return uniqueNumbers.length === 6;
}

// 로또 번호 문자열 파싱
function parseLottoNumbers(input) {
  // 공백으로 분리하고 숫자만 추출
  var parts = input.trim().split(/\s+/);
  var numbers = [];
  
  for (var i = 0; i < parts.length; i++) {
    var num = parseInt(parts[i]);
    if (!isNaN(num)) {
      numbers.push(num);
    }
  }
  
  return numbers;
}

// 로또 자동 구매
function buyAutoLotto(room, userId) {
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
  if (currentPoints < 100) {
    return {
      success: false,
      message: "포인트가 부족합니다. 로또 구매에는 100P가 필요합니다. 현재 보유 포인트: " + currentPoints + "P"
    };
  }
  
  // 로또 데이터 로드
  var lottoData = loadLottoData(room);
  
  // 오늘 이미 발표되었는지 확인 (하루 한 번만 발표)
  var today = new Date().toDateString();
  if (lottoData.lastDrawDate === today) {
    return {
      success: false,
      message: "오늘은 이미 로또가 발표되었습니다. 내일 새로운 회차에 참여해주세요."
    };
  }
  
  // 포인트 차감
  var newPoints = currentPoints - 100;
  if (!pointData.users[userId]) {
    pointData.users[userId] = {
      points: 0,
      joinDate: new Date().toISOString()
    };
  }
  pointData.users[userId].points = newPoints;
  
  // 로또 번호 생성
  var lottoNumbers = generateLottoNumbers();
  
  // 티켓 저장
  var ticketId = Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  if (!lottoData.tickets[userId]) {
    lottoData.tickets[userId] = [];
  }
  
  var ticket = {
    id: ticketId,
    numbers: lottoNumbers,
    type: "auto",
    purchaseDate: new Date().toISOString(),
    round: lottoData.currentRound
  };
  
  lottoData.tickets[userId].push(ticket);
  lottoData.roomStats.totalTickets++;
  
  // 데이터 저장
  savePointData(room, pointData);
  saveLottoData(room, lottoData);
  
  var result = "🎫 " + userId + "님의 로또 자동 구매 완료!\n";
  result += "━━━━━━━━━━━━━\n";
  result += "🎯 로또 번호: " + lottoNumbers.join(" ") + "\n";
  result += "💰 구매 비용: 100P\n";
  result += "💳 현재 포인트: " + newPoints + "P\n";
  result += "📅 회차: " + lottoData.currentRound + "회차\n\n";
  result += "🍀 행운을 빕니다!";
  
  return {
    success: true,
    message: result,
    numbers: lottoNumbers,
    newPoints: newPoints
  };
}

// 로또 수동 구매
function buyManualLotto(room, userId, numberInput) {
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
  if (currentPoints < 100) {
    return {
      success: false,
      message: "포인트가 부족합니다. 로또 구매에는 100P가 필요합니다. 현재 보유 포인트: " + currentPoints + "P"
    };
  }
  
  // 로또 번호 파싱
  var lottoNumbers = parseLottoNumbers(numberInput);
  
  // 번호 유효성 검사
  if (!validateLottoNumbers(lottoNumbers)) {
    return {
      success: false,
      message: "❌ 올바른 로또 번호를 입력해주세요.\n📋 형식: !로또수동 01 15 23 31 42 45\n💡 1~45 사이의 서로 다른 6개 숫자를 입력하세요."
    };
  }
  
  // 로또 데이터 로드
  var lottoData = loadLottoData(room);
  
  // 오늘 이미 발표되었는지 확인 (하루 한 번만 발표)
  var today = new Date().toDateString();
  if (lottoData.lastDrawDate === today) {
    return {
      success: false,
      message: "오늘은 이미 로또가 발표되었습니다. 내일 새로운 회차에 참여해주세요."
    };
  }
  
  // 포인트 차감
  var newPoints = currentPoints - 100;
  if (!pointData.users[userId]) {
    pointData.users[userId] = {
      points: 0,
      joinDate: new Date().toISOString()
    };
  }
  pointData.users[userId].points = newPoints;
  
  // 티켓 저장
  var ticketId = Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  if (!lottoData.tickets[userId]) {
    lottoData.tickets[userId] = [];
  }
  
  var ticket = {
    id: ticketId,
    numbers: lottoNumbers,
    type: "manual",
    purchaseDate: new Date().toISOString(),
    round: lottoData.currentRound
  };
  
  lottoData.tickets[userId].push(ticket);
  lottoData.roomStats.totalTickets++;
  
  // 데이터 저장
  savePointData(room, pointData);
  saveLottoData(room, lottoData);
  
  var result = "🎫 " + userId + "님의 로또 수동 구매 완료!\n";
  result += "━━━━━━━━━━━━━\n";
  result += "🎯 로또 번호: " + lottoNumbers.join(" ") + "\n";
  result += "💰 구매 비용: 100P\n";
  result += "💳 현재 포인트: " + newPoints + "P\n";
  result += "📅 회차: " + lottoData.currentRound + "회차\n\n";
  result += "🍀 행운을 빕니다!";
  
  return {
    success: true,
    message: result,
    numbers: lottoNumbers,
    newPoints: newPoints
  };
}

// 당첨번호 발표 (관리자 전용)
function drawLotto(room, adminUserId) {
  var lottoData = loadLottoData(room);
  
  // 오늘 이미 발표되었는지 확인 (하루 한 번만 발표)
  var today = new Date().toDateString();
  if (lottoData.lastDrawDate === today) {
    return {
      success: false,
      message: "오늘은 이미 로또가 발표되었습니다. 내일 다시 시도해주세요."
    };
  }
  
  // 당첨번호 생성
  var winningNumbers = generateLottoNumbers();
  lottoData.winningNumbers = winningNumbers;
  lottoData.drawDate = new Date().toISOString();
  lottoData.lastDrawDate = today; // 오늘 발표 날짜 기록
  
  // 당첨자 확인 및 상금 지급
  var winners = {};
  var totalWinnings = 0;
  var pointData = loadPointData(room);
  
  for (var userId in lottoData.tickets) {
    var userTickets = lottoData.tickets[userId];
    var userWinnings = 0;
    
    for (var i = 0; i < userTickets.length; i++) {
      var ticket = userTickets[i];
      var matchCount = 0;
      
      // 번호 일치 개수 확인
      for (var j = 0; j < ticket.numbers.length; j++) {
        if (winningNumbers.indexOf(ticket.numbers[j]) !== -1) {
          matchCount++;
        }
      }
      
      // 상금 계산 (실제 로또 시스템과 유사)
      var prize = 0;
      if (matchCount === 6) {
        prize = 2000000; // 1등: 200만P
      } else if (matchCount === 5) {
        prize = 50000;   // 2등: 5만P
      } else if (matchCount === 4) {
        prize = 5000;    // 3등: 5천P
      } else if (matchCount === 3) {
        prize = 500;     // 4등: 5백P
      }
      
      if (prize > 0) {
        userWinnings += prize;
        totalWinnings += prize;
      }
    }
    
    if (userWinnings > 0) {
      winners[userId] = userWinnings;
      if (!pointData.users[userId]) {
        pointData.users[userId] = {
          points: 0,
          joinDate: new Date().toISOString()
        };
      }
      pointData.users[userId].points += userWinnings;
    }
  }
  
  lottoData.winners = winners;
  lottoData.roomStats.totalWinnings += totalWinnings;
  lottoData.roomStats.totalRounds++;
  
  // 발표 후 다음 회차를 위해 데이터 초기화
  lottoData.currentRound++;
  lottoData.tickets = {}; // 다음 회차를 위해 티켓 초기화
  lottoData.isDrawn = false; // 다음 회차 발표 대기 상태로 초기화
  
  // 데이터 저장
  savePointData(room, pointData);
  saveLottoData(room, lottoData);
  
  // 결과 메시지 생성
  var result = "🎉 " + (lottoData.currentRound - 1) + "회차 로또 당첨번호 발표! 🎉\n";
  result += "━━━━━━━━━━━━━\n";
  result += "🎯 당첨번호: " + winningNumbers.join(" ") + "\n";
  result += "📅 발표일: " + new Date().toLocaleString('ko-KR') + "\n\n";
  
  if (Object.keys(winners).length > 0) {
    result += "🏆 당첨자 발표:\n";
    for (var winnerId in winners) {
      result += "• " + winnerId + " - " + winners[winnerId] + "P\n";
    }
    result += "\n💰 총 지급 상금: " + totalWinnings + "P";
  } else {
    result += "😢 이번 회차 당첨자가 없습니다...\n다음 회차에 도전해보세요!";
  }
  
  return {
    success: true,
    message: result,
    winningNumbers: winningNumbers,
    winners: winners,
    totalWinnings: totalWinnings
  };
}

// 로또 상태 조회
function getLottoStatus(room) {
  var lottoData = loadLottoData(room);
  var today = new Date().toDateString();
  
  var status = "🎫 로또 상태\n";
  status += "━━━━━━━━━━━━━\n";
  status += "📅 현재 회차: " + lottoData.currentRound + "회차\n";
  
  // 오늘 발표 여부 확인
  if (lottoData.lastDrawDate === today) {
    status += "📊 발표 상태: ✅ 오늘 발표 완료\n";
    status += "🎯 이전 회차 당첨번호: " + (lottoData.winningNumbers ? lottoData.winningNumbers.join(" ") : "없음") + "\n";
    status += "📅 발표일: " + new Date(lottoData.drawDate).toLocaleString('ko-KR') + "\n";
  } else {
    status += "📊 발표 상태: ⏳ 발표 대기 중\n";
    status += "⏰ 다음 발표: 오후 8시 (자동 발표 설정 시)\n";
  }
  
  status += "🎯 총 판매 티켓: " + lottoData.roomStats.totalTickets + "장\n";
  status += "💰 총 지급 상금: " + lottoData.roomStats.totalWinnings + "P\n";
  status += "🏆 총 회차: " + lottoData.roomStats.totalRounds + "회차";
  
  return status;
}

// 내 로또 조회
function getMyLotto(room, userId) {
  var lottoData = loadLottoData(room);
  
  if (!lottoData.tickets[userId] || lottoData.tickets[userId].length === 0) {
    return "🎫 " + userId + "님의 로또 구매 내역이 없습니다.";
  }
  
  var userTickets = lottoData.tickets[userId];
  var result = "🎫 " + userId + "님의 로또 구매 내역\n";
  result += "━━━━━━━━━━━━━\n";
  result += "📊 총 구매: " + userTickets.length + "장\n\n";
  
  for (var i = 0; i < userTickets.length; i++) {
    var ticket = userTickets[i];
    var typeText = ticket.type === "auto" ? "자동" : "수동";
    result += "🎫 " + (i + 1) + "번째 (" + typeText + "): " + ticket.numbers.join(" ") + "\n";
  }
  
  // 오늘 발표되었는지 확인
  var today = new Date().toDateString();
  if (lottoData.lastDrawDate === today && lottoData.winningNumbers) {
    result += "\n🎯 당첨번호: " + lottoData.winningNumbers.join(" ");
    result += "\n\n🏆 당첨 확인:\n";
    
    var totalWinnings = 0;
    for (var i = 0; i < userTickets.length; i++) {
      var ticket = userTickets[i];
      var matchCount = 0;
      
      for (var j = 0; j < ticket.numbers.length; j++) {
        if (lottoData.winningNumbers.indexOf(ticket.numbers[j]) !== -1) {
          matchCount++;
        }
      }
      
      var prize = 0;
      if (matchCount === 6) {
        prize = 2000000;
      } else if (matchCount === 5) {
        prize = 50000;
      } else if (matchCount === 4) {
        prize = 5000;
      } else if (matchCount === 3) {
        prize = 500;
      }
      
      if (prize > 0) {
        result += "🎉 " + (i + 1) + "번째: " + matchCount + "개 일치 - " + prize + "P\n";
        totalWinnings += prize;
      }
    }
    
    if (totalWinnings > 0) {
      result += "\n💰 총 당첨금: " + totalWinnings + "P";
    } else {
      result += "😢 당첨된 티켓이 없습니다...";
    }
  }
  
  return result;
}

// 로또 초기화 (관리자 전용)
function resetLotto(room, adminUserId) {
  var lottoData = loadLottoData(room);
  
  var resetInfo = {
    currentRound: lottoData.currentRound,
    totalTickets: lottoData.roomStats.totalTickets,
    isDrawn: lottoData.isDrawn
  };
  
  // 새로운 회차로 초기화
  lottoData.currentRound++;
  lottoData.tickets = {};
  lottoData.winningNumbers = null;
  lottoData.drawDate = null;
  lottoData.isDrawn = false;
  lottoData.winners = {};
  
  if (saveLottoData(room, lottoData)) {
    var message = "🔄 로또가 " + lottoData.currentRound + "회차로 초기화되었습니다!";
    if (resetInfo.isDrawn) {
      message += "\n📊 이전 회차 정보가 초기화되었습니다.";
    }
    
    // 자동 발표가 활성화되어 있다면 타이머 재설정
    if (lottoData.autoDrawEnabled) {
      var timeUntil8PM = setupAutoDrawTimer(room);
      var hoursUntil8PM = Math.floor(timeUntil8PM / (1000 * 60 * 60));
      var minutesUntil8PM = Math.floor((timeUntil8PM % (1000 * 60 * 60)) / (1000 * 60));
      message += "\n⏰ 자동 발표 재설정: " + hoursUntil8PM + "시간 " + minutesUntil8PM + "분 후 (오후 8시)";
    }
    
    return {
      success: true,
      message: message
    };
  } else {
    return {
      success: false,
      message: "로또 초기화에 실패했습니다."
    };
  }
}

// 아래와 같이 반드시 "키: 값" 쌍으로 객체 반환
module.exports = {
  // Replier 설정
  setReplier: setReplier,
  
  // 로또 구매
  buyAutoLotto: buyAutoLotto,
  buyManualLotto: buyManualLotto,
  
  // 조회
  getLottoStatus: getLottoStatus,
  getMyLotto: getMyLotto,
  
  // 관리자 기능
  drawLotto: drawLotto,
  resetLotto: resetLotto,
  
  // 자동 발표 타이머 관리
  setupAutoDrawTimer: setupAutoDrawTimer,
  cancelAutoDrawTimer: cancelAutoDrawTimer,
  cancelAllAutoDrawTimers: cancelAllAutoDrawTimers
};
