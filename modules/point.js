// modules/point.js
// 메신저봇R 포인트 시스템 (포인트 관리, 양도 기능)

// 전역 Replier 객체 (common.js에서 주입받음)
var globalReplier = null;

// 데이터 저장 경로
var DATA_DIR = "/sdcard/DataBase/";

// Replier 객체 설정 (common.js에서 호출)
function setReplier(replier) {
  globalReplier = replier;
}

// 방별 포인트 데이터 로드
function loadPointData(room) {
  try {
    var fileName = "points_" + room + ".json";
    var filePath = DATA_DIR + fileName;
    
    var data = FileStream.read(filePath);
    if (data && data !== "") {
      return JSON.parse(data);
    }
    
    return { users: {}, transactions: [] };
  } catch (error) {
    return { users: {}, transactions: [] };
  }
}

// 방별 포인트 데이터 저장
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

// 사용자 포인트 조회
function getUserPoints(room, userId) {
  var pointData = loadPointData(room);
  
  if (!pointData.users[userId]) {
    return 0;
  }
  
  return pointData.users[userId].points || 0;
}

// 사용자 포인트 설정
function setUserPoints(room, userId, points) {
  var pointData = loadPointData(room);
  
  if (!pointData.users[userId]) {
    pointData.users[userId] = {
      points: 0,
      joinDate: new Date().toISOString()
    };
  }
  
  pointData.users[userId].points = points;
  savePointData(room, pointData);
  return true;
}

// 사용자 포인트 추가
function addUserPoints(room, userId, points) {
  var currentPoints = getUserPoints(room, userId);
  var newPoints = currentPoints + points;
  
  if (newPoints < 0) {
    newPoints = 0; // 포인트는 음수가 될 수 없음
  }
  
  setUserPoints(room, userId, newPoints);
  return newPoints;
}

// 포인트 양도
function transferPoints(room, fromUserId, toUserId, points) {
  var pointData = loadPointData(room);
  
  // 보내는 사람 포인트 확인
  var fromUserPoints = getUserPoints(room, fromUserId);
  if (fromUserPoints < points) {
    return {
      success: false,
      message: "포인트가 부족합니다. 현재 보유 포인트: " + fromUserPoints + "P"
    };
  }
  
  // 포인트 차감 및 추가
  var newFromPoints = addUserPoints(room, fromUserId, -points);
  var newToPoints = addUserPoints(room, toUserId, points);
  
  // 거래 기록 추가
  var transaction = {
    from: fromUserId,
    to: toUserId,
    points: points,
    timestamp: new Date().toISOString()
  };
  
  pointData.transactions.push(transaction);
  
  // 최대 100개 거래 기록만 보관
  if (pointData.transactions.length > 100) {
    pointData.transactions = pointData.transactions.slice(-100);
  }
  
  savePointData(room, pointData);
  
  return {
    success: true,
    message: "포인트 양도 완료! " + fromUserId + " → " + toUserId + " (" + points + "P)",
    fromPoints: newFromPoints,
    toPoints: newToPoints
  };
}

// 방 전체 포인트 순위 조회
function getPointRanking(room, limit) {
  if (typeof limit === 'undefined') {
    limit = 10;
  }
  
  var pointData = loadPointData(room);
  var users = pointData.users;
  var ranking = [];
  
  for (var userId in users) {
    if (users.hasOwnProperty(userId)) {
      ranking.push({
        userId: userId,
        points: users[userId].points || 0
      });
    }
  }
  
  // 포인트 순으로 정렬
  ranking.sort(function(a, b) {
    return b.points - a.points;
  });
  
  return ranking.slice(0, limit);
}

// 최근 거래 내역 조회
function getRecentTransactions(room, limit) {
  if (typeof limit === 'undefined') {
    limit = 10;
  }
  
  var pointData = loadPointData(room);
  var transactions = pointData.transactions || [];
  
  return transactions.slice(-limit).reverse();
}

// 사용자 포인트 초기화 (관리자용)
function resetUserPoints(room, userId) {
  setUserPoints(room, userId, 0);
  return true;
}

// 방 전체 포인트 초기화 (관리자용)
function resetAllPoints(room) {
  var pointData = { users: {}, transactions: [] };
  savePointData(room, pointData);
  return true;
}

// 아래와 같이 반드시 "키: 값" 쌍으로 객체 반환
module.exports = {
  // Replier 설정
  setReplier: setReplier,
  
  // 포인트 관리
  getUserPoints: getUserPoints,
  setUserPoints: setUserPoints,
  addUserPoints: addUserPoints,
  
  // 포인트 양도
  transferPoints: transferPoints,
  
  // 순위 및 통계
  getPointRanking: getPointRanking,
  getRecentTransactions: getRecentTransactions,
  
  // 관리자 기능
  resetUserPoints: resetUserPoints,
  resetAllPoints: resetAllPoints
};
