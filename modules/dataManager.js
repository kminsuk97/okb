// modules/dataManager.js
// 메신저봇R 환경에서는 파일 시스템 접근이 제한적이므로 메모리 기반으로 데이터 관리

// 메모리 기반 데이터 저장소
var roomDataStorage = {};

// 방별 데이터 로드 (메모리에서)
function loadRoomData(room, dataType) {
  if (!roomDataStorage[room]) {
    roomDataStorage[room] = {};
  }
  
  if (!roomDataStorage[room][dataType]) {
    roomDataStorage[room][dataType] = {};
  }
  
  return roomDataStorage[room][dataType];
}

// 방별 데이터 저장 (메모리에)
function saveRoomData(room, dataType, data) {
  if (!roomDataStorage[room]) {
    roomDataStorage[room] = {};
  }
  
  roomDataStorage[room][dataType] = data;
  return true;
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

// 방 목록 조회 (메모리에서)
function getRoomList() {
  return Object.keys(roomDataStorage);
}

// 방 데이터 삭제 (메모리에서)
function deleteRoomData(room, dataType) {
  if (roomDataStorage[room] && roomDataStorage[room][dataType]) {
    delete roomDataStorage[room][dataType];
    return true;
  }
  return true; // 데이터가 없으면 성공으로 간주
}

// 아래와 같이 반드시 "키: 값" 쌍으로 객체 반환
module.exports = {
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
