// modules/myinfo.js
var dataManager = require('./dataManager');

// 사용자 정보 포맷팅 (동적 필드 지원)
function formatUserInfo(userInfo) {
  if (!userInfo) {
    return "등록된 정보가 없습니다.";
  }
  
  var result = "📋 내 정보\n";
  result += "━━━━━━━━━━━━━━━━━━━━\n";
  
  // 기본 필드들 (우선순위로 먼저 표시)
  if (userInfo.name) result += "👤 이름: " + userInfo.name + "\n";
  if (userInfo.age) result += "🎂 나이: " + userInfo.age + "세\n";
  if (userInfo.gender) result += "⚧ 성별: " + userInfo.gender + "\n";
  if (userInfo.location) result += "📍 지역: " + userInfo.location + "\n";
  if (userInfo.hobby) result += "🎯 취미: " + userInfo.hobby + "\n";
  if (userInfo.mbti) result += "🧠 MBTI: " + userInfo.mbti + "\n";
  if (userInfo.introduction) result += "💬 자기소개: " + userInfo.introduction + "\n";
  
  // 동적 필드들 표시 (기본 필드가 아닌 모든 필드)
  var basicFields = ["name", "age", "gender", "location", "hobby", "mbti", "introduction", "lastUpdate"];
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
      case "이름":
        userInfo.name = value;
        break;
      case "나이":
        userInfo.age = value;
        break;
      case "성별":
        userInfo.gender = value;
        break;
      case "지역":
        userInfo.location = value;
        break;
      case "취미":
        userInfo.hobby = value;
        break;
      case "MBTI":
        userInfo.mbti = value;
        break;
      case "자기소개":
        userInfo.introduction = value;
        break;
      default:
        // 동적 필드: 사용자가 정의한 모든 필드를 자동으로 저장
        userInfo[key] = value;
        break;
    }
  }
  
  return userInfo;
}

// 아래와 같이 반드시 "키: 값" 쌍으로 객체 반환
module.exports = {
  saveUserInfo: dataManager.saveUserInfo,
  getUserInfo: dataManager.getUserInfo,
  getAllUsersInRoom: dataManager.getAllUsersInRoom,
  formatUserInfo: formatUserInfo,
  parseUserInfo: parseUserInfo
};
