// modules/jackpot.js
// 메신저봇R 잭팟 시스템 (30분 쿨다운, 1% 확률, 10~50 포인트)

// 전역 Replier 객체 (common.js에서 주입받음)
var globalReplier = null;

// 데이터 저장 경로
var DATA_DIR = "/sdcard/DataBase/";

// 잭팟 설정 (기본값)
var JACKPOT_COOLDOWN = 30 * 60 * 1000; // 30분 (밀리초)
var JACKPOT_CHANCE = 0.01; // 1% 확률
var MIN_REWARD = 10; // 최소 보상
var MAX_REWARD = 50; // 최대 보상

// Replier 객체 설정 (common.js에서 호출)
function setReplier(replier) {
  globalReplier = replier;
}

// 방별 잭팟 데이터 로드
function loadJackpotData(room) {
  try {
    var fileName = "jackpot_" + room + ".json";
    var filePath = DATA_DIR + fileName;
    
    var data = FileStream.read(filePath);
    if (data && data !== "") {
      return JSON.parse(data);
    }
    
    return { 
      userCooldowns: {}, 
      jackpotHistory: [],
      roomStats: {
        totalJackpots: 0,
        totalRewards: 0,
        lastJackpot: null
      }
    };
  } catch (error) {
    return { 
      userCooldowns: {}, 
      jackpotHistory: [],
      roomStats: {
        totalJackpots: 0,
        totalRewards: 0,
        lastJackpot: null
      }
    };
  }
}

// 방별 잭팟 데이터 저장
function saveJackpotData(room, data) {
  try {
    var fileName = "jackpot_" + room + ".json";
    var filePath = DATA_DIR + fileName;
    var jsonData = JSON.stringify(data, null, 2);
    
    FileStream.write(filePath, jsonData);
    return true;
  } catch (error) {
    return false;
  }
}

// 현재 시간을 밀리초로 반환
function getCurrentTime() {
  return new Date().getTime();
}

// 사용자 쿨다운 확인
function isUserOnCooldown(room, userId) {
  var jackpotData = loadJackpotData(room);
  var userCooldown = jackpotData.userCooldowns[userId];
  
  if (!userCooldown) {
    return false;
  }
  
  var currentTime = getCurrentTime();
  var timeSinceLastJackpot = currentTime - userCooldown.lastJackpotTime;
  
  return timeSinceLastJackpot < JACKPOT_COOLDOWN;
}

// 사용자 쿨다운 남은 시간 계산 (초 단위)
function getCooldownRemaining(room, userId) {
  var jackpotData = loadJackpotData(room);
  var userCooldown = jackpotData.userCooldowns[userId];
  
  if (!userCooldown) {
    return 0;
  }
  
  var currentTime = getCurrentTime();
  var timeSinceLastJackpot = currentTime - userCooldown.lastJackpotTime;
  var remainingTime = JACKPOT_COOLDOWN - timeSinceLastJackpot;
  
  return Math.max(0, Math.floor(remainingTime / 1000));
}

// 잭팟 시도 (채팅할 때마다 호출)
function tryJackpot(room, userId) {
  var jackpotData = loadJackpotData(room);
  
  // 쿨다운 확인
  if (isUserOnCooldown(room, userId)) {
    return {
      success: false,
      onCooldown: true,
      cooldownRemaining: getCooldownRemaining(room, userId)
    };
  }
  
  // 확률 계산 (1%)
  var random = Math.random();
  if (random > JACKPOT_CHANCE) {
    return {
      success: false,
      onCooldown: false,
      message: "아쉽게도 잭팟에 당첨되지 않았습니다."
    };
  }
  
  // 잭팟 당첨!
  var reward = Math.floor(Math.random() * (MAX_REWARD - MIN_REWARD + 1)) + MIN_REWARD;
  var currentTime = getCurrentTime();
  
  // 사용자 쿨다운 설정
  jackpotData.userCooldowns[userId] = {
    lastJackpotTime: currentTime,
    lastReward: reward
  };
  
  // 잭팟 기록 추가
  var jackpotRecord = {
    userId: userId,
    reward: reward,
    timestamp: currentTime,
    date: new Date().toISOString()
  };
  
  jackpotData.jackpotHistory.push(jackpotRecord);
  
  // 최대 100개 기록만 보관
  if (jackpotData.jackpotHistory.length > 100) {
    jackpotData.jackpotHistory = jackpotData.jackpotHistory.slice(-100);
  }
  
  // 방 통계 업데이트
  jackpotData.roomStats.totalJackpots++;
  jackpotData.roomStats.totalRewards += reward;
  jackpotData.roomStats.lastJackpot = jackpotRecord;
  
  saveJackpotData(room, jackpotData);
  
  return {
    success: true,
    reward: reward,
    message: "🎉 잭팟 당첨! " + reward + "포인트를 획득했습니다!",
    cooldownTime: JACKPOT_COOLDOWN / 1000 / 60 // 분 단위
  };
}

// 사용자 잭팟 통계 조회
function getUserJackpotStats(room, userId) {
  var jackpotData = loadJackpotData(room);
  var userHistory = [];
  var totalRewards = 0;
  var totalJackpots = 0;
  
  // 사용자의 잭팟 기록 찾기
  for (var i = 0; i < jackpotData.jackpotHistory.length; i++) {
    var record = jackpotData.jackpotHistory[i];
    if (record.userId === userId) {
      userHistory.push(record);
      totalRewards += record.reward;
      totalJackpots++;
    }
  }
  
  var cooldownRemaining = getCooldownRemaining(room, userId);
  
  return {
    totalJackpots: totalJackpots,
    totalRewards: totalRewards,
    cooldownRemaining: cooldownRemaining,
    isOnCooldown: cooldownRemaining > 0,
    lastJackpot: userHistory.length > 0 ? userHistory[userHistory.length - 1] : null
  };
}

// 방 잭팟 통계 조회
function getRoomJackpotStats(room) {
  var jackpotData = loadJackpotData(room);
  return jackpotData.roomStats;
}

// 최근 잭팟 기록 조회
function getRecentJackpots(room, limit) {
  if (typeof limit === 'undefined') {
    limit = 10;
  }
  
  var jackpotData = loadJackpotData(room);
  var history = jackpotData.jackpotHistory || [];
  
  return history.slice(-limit).reverse();
}

// 잭팟 설정 변경 (관리자용)
function setJackpotSettings(room, cooldownMinutes, chancePercent, minReward, maxReward) {
  // 설정 유효성 검사
  if (cooldownMinutes < 1 || cooldownMinutes > 1440) { // 1분~24시간
    return {
      success: false,
      message: "쿨다운은 1분~1440분(24시간) 사이여야 합니다."
    };
  }
  
  if (chancePercent < 0.1 || chancePercent > 100) { // 0.1%~100%
    return {
      success: false,
      message: "확률은 0.1%~100% 사이여야 합니다."
    };
  }
  
  if (minReward < 1 || maxReward < 1 || minReward > maxReward) {
    return {
      success: false,
      message: "보상 범위가 올바르지 않습니다. (최소값 ≤ 최대값)"
    };
  }
  
  // 전역 설정 업데이트
  JACKPOT_COOLDOWN = cooldownMinutes * 60 * 1000; // 분을 밀리초로 변환
  JACKPOT_CHANCE = chancePercent / 100; // 퍼센트를 소수로 변환
  MIN_REWARD = minReward;
  MAX_REWARD = maxReward;
  
  // 기존 쿨다운 초기화
  var jackpotData = loadJackpotData(room);
  jackpotData.userCooldowns = {}; // 모든 사용자의 쿨다운 초기화
  saveJackpotData(room, jackpotData);
  
  return {
    success: true,
    message: "잭팟 설정이 변경되었습니다!\n" +
             "⏰ 쿨다운: " + cooldownMinutes + "분\n" +
             "🎯 확률: " + chancePercent + "%\n" +
             "💰 보상: " + minReward + "~" + maxReward + "포인트\n" +
             "🔄 모든 사용자의 쿨다운이 초기화되었습니다."
  };
}

// 현재 잭팟 설정 조회
function getJackpotSettings() {
  return {
    cooldownMinutes: JACKPOT_COOLDOWN / 60 / 1000,
    chancePercent: JACKPOT_CHANCE * 100,
    minReward: MIN_REWARD,
    maxReward: MAX_REWARD
  };
}

// 잭팟 리셋 (관리자용)
function resetJackpotData(room) {
  var jackpotData = { 
    userCooldowns: {}, 
    jackpotHistory: [],
    roomStats: {
      totalJackpots: 0,
      totalRewards: 0,
      lastJackpot: null
    }
  };
  
  saveJackpotData(room, jackpotData);
  return true;
}

// 아래와 같이 반드시 "키: 값" 쌍으로 객체 반환
module.exports = {
  // Replier 설정
  setReplier: setReplier,
  
  // 잭팟 시스템
  tryJackpot: tryJackpot,
  isUserOnCooldown: isUserOnCooldown,
  getCooldownRemaining: getCooldownRemaining,
  
  // 통계 및 조회
  getUserJackpotStats: getUserJackpotStats,
  getRoomJackpotStats: getRoomJackpotStats,
  getRecentJackpots: getRecentJackpots,
  
  // 관리자 기능
  setJackpotSettings: setJackpotSettings,
  getJackpotSettings: getJackpotSettings,
  resetJackpotData: resetJackpotData
};
