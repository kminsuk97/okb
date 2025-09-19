// modules/attendance.js
// 메신저봇R 출석 시스템 (일일 출석 체크, 보상 지급)

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

// 방별 출석 데이터 로드
function loadAttendanceData(room) {
  try {
    var fileName = "attendance_" + room + ".json";
    var filePath = DATA_DIR + fileName;
    
    var data = FileStream.read(filePath);
    if (data && data !== "") {
      return JSON.parse(data);
    }
    
    return { dailyAttendance: {}, userStats: {} };
  } catch (error) {
    return { dailyAttendance: {}, userStats: {} };
  }
}

// 방별 출석 데이터 저장
function saveAttendanceData(room, data) {
  try {
    var fileName = "attendance_" + room + ".json";
    var filePath = DATA_DIR + fileName;
    var jsonData = JSON.stringify(data, null, 2);
    
    FileStream.write(filePath, jsonData);
    return true;
  } catch (error) {
    return false;
  }
}

// 출석 체크 (하루에 한 번만 가능)
function checkAttendance(room, userId) {
  var attendanceData = loadAttendanceData(room);
  var todayKey = getTodayKey();
  
  // 오늘 출석 데이터 초기화
  if (!attendanceData.dailyAttendance[todayKey]) {
    attendanceData.dailyAttendance[todayKey] = {};
  }
  
  // 사용자 통계 초기화
  if (!attendanceData.userStats[userId]) {
    attendanceData.userStats[userId] = {
      totalDays: 0,
      consecutiveDays: 0,
      lastAttendance: null,
      joinDate: new Date().toISOString()
    };
  }
  
  // 이미 오늘 출석했는지 확인
  if (attendanceData.dailyAttendance[todayKey][userId]) {
    return {
      success: false,
      message: "오늘은 이미 출석하셨습니다!",
      alreadyAttended: true
    };
  }
  
  // 출석 처리
  attendanceData.dailyAttendance[todayKey][userId] = {
    timestamp: new Date().toISOString(),
    expReward: 10,
    pointReward: 10
  };
  
  // 사용자 통계 업데이트
  var userStats = attendanceData.userStats[userId];
  userStats.totalDays++;
  userStats.lastAttendance = todayKey;
  
  // 연속 출석 계산
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayKey = yesterday.getFullYear() + "-" + 
    String(yesterday.getMonth() + 1).padStart(2, '0') + "-" + 
    String(yesterday.getDate()).padStart(2, '0');
  
  if (attendanceData.dailyAttendance[yesterdayKey] && 
      attendanceData.dailyAttendance[yesterdayKey][userId]) {
    userStats.consecutiveDays++;
  } else {
    userStats.consecutiveDays = 1;
  }
  
  saveAttendanceData(room, attendanceData);
  
  return {
    success: true,
    message: "출석 완료! 보상이 지급되었습니다.",
    expReward: 10,
    pointReward: 10,
    totalDays: userStats.totalDays,
    consecutiveDays: userStats.consecutiveDays
  };
}

// 사용자 출석 통계 조회
function getUserAttendanceStats(room, userId) {
  var attendanceData = loadAttendanceData(room);
  
  if (!attendanceData.userStats[userId]) {
    return {
      totalDays: 0,
      consecutiveDays: 0,
      lastAttendance: null
    };
  }
  
  return attendanceData.userStats[userId];
}

// 오늘 출석자 목록 조회
function getTodayAttendanceList(room) {
  var attendanceData = loadAttendanceData(room);
  var todayKey = getTodayKey();
  
  if (!attendanceData.dailyAttendance[todayKey]) {
    return [];
  }
  
  var todayList = [];
  for (var userId in attendanceData.dailyAttendance[todayKey]) {
    if (attendanceData.dailyAttendance[todayKey].hasOwnProperty(userId)) {
      todayList.push({
        userId: userId,
        timestamp: attendanceData.dailyAttendance[todayKey][userId].timestamp
      });
    }
  }
  
  // 시간순으로 정렬
  todayList.sort(function(a, b) {
    return new Date(a.timestamp) - new Date(b.timestamp);
  });
  
  return todayList;
}

// 방 전체 출석 순위 조회
function getAttendanceRanking(room, limit) {
  if (typeof limit === 'undefined') {
    limit = 10;
  }
  
  var attendanceData = loadAttendanceData(room);
  var userStats = attendanceData.userStats;
  var ranking = [];
  
  for (var userId in userStats) {
    if (userStats.hasOwnProperty(userId)) {
      ranking.push({
        userId: userId,
        totalDays: userStats[userId].totalDays,
        consecutiveDays: userStats[userId].consecutiveDays
      });
    }
  }
  
  // 총 출석일 순으로 정렬
  ranking.sort(function(a, b) {
    if (a.totalDays !== b.totalDays) {
      return b.totalDays - a.totalDays;
    }
    return b.consecutiveDays - a.consecutiveDays;
  });
  
  return ranking.slice(0, limit);
}

// 아래와 같이 반드시 "키: 값" 쌍으로 객체 반환
module.exports = {
  // Replier 설정
  setReplier: setReplier,
  
  // 출석 관리
  checkAttendance: checkAttendance,
  getUserAttendanceStats: getUserAttendanceStats,
  getTodayAttendanceList: getTodayAttendanceList,
  getAttendanceRanking: getAttendanceRanking
};
