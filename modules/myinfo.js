// modules/myinfo.js
var dataManager = require('./dataManager');

// 사용자 정보 포맷팅 (동적 필드 지원)
function formatUserInfo(userInfo) {
  if (!userInfo) {
    return "등록된 정보가 없습니다.";
  }
  
  var result = "📋 내 정보\n";
  result += "━━━━━━━━━━━━━\n";
  
  // 기본 필드들 (우선순위로 먼저 표시)
  if (userInfo.nickname) result += "👤 닉네임: " + userInfo.nickname + "\n";
  if (userInfo.joinDate) result += "📅 들어온 날짜: " + userInfo.joinDate + "\n";
  if (userInfo.workTime) result += "⏰ 출퇴근 시간: " + userInfo.workTime + "\n";
  if (userInfo.workLocation) result += "🏢 직장 지역: " + userInfo.workLocation + "\n";
  if (userInfo.mbti) result += "🧠 MBTI: " + userInfo.mbti + "\n";
  if (userInfo.hobby) result += "🎯 취미: " + userInfo.hobby + "\n";
  if (userInfo.drinkingCapacity) result += "🍺 주량: " + userInfo.drinkingCapacity + "\n";
  if (userInfo.birthday) result += "🎂 생일: " + userInfo.birthday + "\n";
  if (userInfo.availableDays) result += "📆 참석 가능한 날: " + userInfo.availableDays + "\n";
  if (userInfo.joinPath) result += "🚪 들어온 경로: " + userInfo.joinPath + "\n";
  
  // 동적 필드들 표시 (기본 필드가 아닌 모든 필드)
  var basicFields = ["nickname", "joinDate", "workTime", "workLocation", "mbti", "hobby", "drinkingCapacity", "birthday", "availableDays", "joinPath", "lastUpdate"];
  var hasCustomFields = false;
  
  for (var key in userInfo) {
    if (userInfo.hasOwnProperty(key) && basicFields.indexOf(key) === -1) {
      if (!hasCustomFields) {
        result += "\n📝 추가 정보:\n";
        hasCustomFields = true;
      }
      result += "• " + key + ": " + userInfo[key] + "\n";
    }
  }
  
  result += "\n📅 마지막 업데이트: " + new Date(userInfo.lastUpdate).toLocaleString('ko-KR');
  
  return result;
}

// 사용자 정보 파싱 (등록/수정용) - 동적 필드 지원, 공백 허용
function parseUserInfo(infoText) {
  var userInfo = {};
  
  // 가장 간단한 방법: 첫 번째 콜론을 기준으로 키와 값 분리
  var colonIndex = infoText.indexOf(":");
  
  if (colonIndex !== -1) {
    // 키 추출 (콜론 앞의 마지막 단어)
    var keyPart = infoText.substring(0, colonIndex).trim();
    var keyWords = keyPart.split(" ");
    var key = keyWords[keyWords.length - 1];
    
    // 값 추출 (콜론 뒤의 모든 내용, 공백 포함)
    var value = infoText.substring(colonIndex + 1).trim();
    
    // 기본 필드들 (기존 호환성 유지)
    switch (key) {
      case "닉네임":
        userInfo.nickname = value;
        break;
      case "들어온 날짜":
        userInfo.joinDate = value;
        break;
      case "출퇴근 시간":
        userInfo.workTime = value;
        break;
      case "직장 지역":
        userInfo.workLocation = value;
        break;
      case "MBTI":
        userInfo.mbti = value;
        break;
      case "취미":
        userInfo.hobby = value;
        break;
      case "주량":
        userInfo.drinkingCapacity = value;
        break;
      case "생일":
        userInfo.birthday = value;
        break;
      case "참석 가능한 날":
        userInfo.availableDays = value;
        break;
      case "들어온 경로":
        userInfo.joinPath = value;
        break;
      default:
        // 동적 필드: 사용자가 정의한 모든 필드를 자동으로 저장
        userInfo[key] = value;
        break;
    }
  }
  
  return userInfo;
}

// 관리자용 사용자 정보 조회
function getAdminUserInfo(room, targetUserId) {
  var userInfo = dataManager.getUserInfo(room, targetUserId);
  var formattedInfo = formatUserInfo(userInfo);
  
  if (userInfo) {
    return "👤 " + targetUserId + "님의 정보\n" + formattedInfo;
  } else {
    return "❌ " + targetUserId + "님의 등록된 정보가 없습니다.";
  }
}

// 관리자용 사용자 정보 등록/수정
function setAdminUserInfo(room, targetUserId, infoText) {
  // 기존 정보 가져오기
  var existingInfo = dataManager.getUserInfo(room, targetUserId) || {};
  
  // 새 정보 파싱
  var newUserInfo = parseUserInfo(infoText);
  
  // 기존 정보와 새 정보 병합
  var mergedInfo = Object.assign({}, existingInfo, newUserInfo);
  
  // 정보 저장
  dataManager.saveUserInfo(room, targetUserId, mergedInfo);
  
  return "✅ " + targetUserId + "님의 정보가 성공적으로 추가/수정되었습니다!";
}

// 아래와 같이 반드시 "키: 값" 쌍으로 객체 반환
module.exports = {
  saveUserInfo: dataManager.saveUserInfo,
  getUserInfo: dataManager.getUserInfo,
  getAllUsersInRoom: dataManager.getAllUsersInRoom,
  formatUserInfo: formatUserInfo,
  parseUserInfo: parseUserInfo,
  getAdminUserInfo: getAdminUserInfo,
  setAdminUserInfo: setAdminUserInfo
};
