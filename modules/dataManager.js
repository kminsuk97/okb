// modules/dataManager.js
// 메신저봇R FileStream API 기반 데이터 저장

// 전역 Replier 객체 (common.js에서 주입받음)
var globalReplier = null;

// 데이터 저장 경로
var DATA_DIR = "/sdcard/DataBase/";

// Replier 객체 설정 (common.js에서 호출)
function setReplier(replier) {
  globalReplier = replier;
}

// 방별 데이터 로드 (FileStream에서)
function loadRoomData(room, dataType) {
  try {
    var fileName = "room_" + room + "_" + dataType + ".json";
    var filePath = DATA_DIR + fileName;
    
    var data = FileStream.read(filePath);
    if (data && data !== "") {
      return JSON.parse(data);
    }
    
    return {};
  } catch (error) {
    return {};
  }
}

// 방별 데이터 저장 (FileStream에)
function saveRoomData(room, dataType, data) {
  try {
    var fileName = "room_" + room + "_" + dataType + ".json";
    var filePath = DATA_DIR + fileName;
    var jsonData = JSON.stringify(data, null, 2);
    
    FileStream.write(filePath, jsonData);
    return true;
  } catch (error) {
    return false;
  }
}

// 사용자 정보 관련 함수들
function saveUserInfo(room, userId, userInfo) {
  var roomData = loadRoomData(room, 'users');
  
  if (!roomData.users) {
    roomData.users = {};
  }
  
  roomData.users[userId] = Object.assign({}, userInfo, {
    lastUpdate: new Date().toISOString()
  });
  
  return saveRoomData(room, 'users', roomData);
}

function getUserInfo(room, userId) {
  var roomData = loadRoomData(room, 'users');
  
  if (!roomData.users) {
    return null;
  }
  
  return roomData.users[userId] || null;
}

function getAllUsersInRoom(room) {
  var roomData = loadRoomData(room, 'users');
  return roomData.users || {};
}

// 대화 데이터 관련 함수들
function saveChatMessage(room, sender, message, timestamp) {
  var roomData = loadRoomData(room, 'chat');
  
  if (!roomData.messages) {
    roomData.messages = [];
  }
  
  var chatMessage = {
    sender: sender,
    message: message,
    timestamp: timestamp || new Date().toISOString()
  };
  
  roomData.messages.push(chatMessage);
  
  // 최대 1000개 메시지만 보관 (메모리 절약)
  if (roomData.messages.length > 1000) {
    roomData.messages = roomData.messages.slice(-1000);
  }
  
  return saveRoomData(room, 'chat', roomData);
}

function getChatMessages(room, limit) {
  if (typeof limit === 'undefined') {
    limit = 50;
  }
  var roomData = loadRoomData(room, 'chat');
  
  if (!roomData.messages) {
    return [];
  }
  
  return roomData.messages.slice(-limit);
}

function getChatStats(room) {
  var roomData = loadRoomData(room, 'chat');
  
  if (!roomData.messages) {
    return {
      totalMessages: 0,
      uniqueUsers: 0,
      lastMessage: null
    };
  }
  
  var messages = roomData.messages;
  var uniqueUsers = {};
  for (var i = 0; i < messages.length; i++) {
    uniqueUsers[messages[i].sender] = true;
  }
  var uniqueUserCount = Object.keys(uniqueUsers).length;
  
  return {
    totalMessages: messages.length,
    uniqueUsers: uniqueUserCount,
    lastMessage: messages.length > 0 ? messages[messages.length - 1] : null
  };
}

// 방 목록 조회 (파일에서)
function getRoomList() {
  // 파일 기반에서는 방 목록을 직접 조회하기 어려우므로 빈 배열 반환
  return [];
}

// 방 데이터 삭제 (FileStream에서)
function deleteRoomData(room, dataType) {
  try {
    var fileName = "room_" + room + "_" + dataType + ".json";
    var filePath = DATA_DIR + fileName;
    
    FileStream.remove(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

// 아래와 같이 반드시 "키: 값" 쌍으로 객체 반환
module.exports = {
  // Replier 설정
  setReplier: setReplier,
  
  // 기본 데이터 관리
  loadRoomData: loadRoomData,
  saveRoomData: saveRoomData,
  getRoomList: getRoomList,
  deleteRoomData: deleteRoomData,
  
  // 사용자 정보 관리
  saveUserInfo: saveUserInfo,
  getUserInfo: getUserInfo,
  getAllUsersInRoom: getAllUsersInRoom,
  
  // 대화 데이터 관리
  saveChatMessage: saveChatMessage,
  getChatMessages: getChatMessages,
  getChatStats: getChatStats
};
