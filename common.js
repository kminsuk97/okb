// main.js (프로젝트 루트에 위치)
var utils = require('utils'); // 상대경로(x), 확장자(x)
var myinfo = require('myinfo'); // 사용자 정보 관리 모듈
var dataManager = require('dataManager'); // 데이터 관리 모듈

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
  // Replier 객체를 dataManager에 주입 (최초 1회만)
  if (!dataManager._replierSet) {
    dataManager.setReplier(replier);
    dataManager._replierSet = true;
  }
  
  // 모든 메시지를 대화 데이터로 저장 (명령어가 아닌 경우만)
  if (!msg.startsWith("!")) {
    dataManager.saveChatMessage(room, sender, msg);
  }
  
  // !도움말 명령어 처리
  if (msg === "!도움말" || msg === "!help") {
    var helpText = "🤖 메신저봇 명령어 도움말\n";
    helpText += "━━━━━━━━━━━━━━━━━━━━\n";
    helpText += "📋 !내정보 - 내 정보 조회\n";
    helpText += "📝 !내정보등록 [정보] - 정보 추가/수정 (기존 정보 유지)\n";
    helpText += "❓ !도움말 - 이 도움말 표시\n\n";
    
    replier.reply(helpText);
  }
  // !내정보 명령어 처리
  if (msg === "!내정보") {
    var userInfo = myinfo.getUserInfo(room, sender);
    var formattedInfo = myinfo.formatUserInfo(userInfo);
    replier.reply(formattedInfo);
  }
  
  // !내정보등록 명령어 처리 (예시: !내정보등록 이름:홍길동 나이:25 성별:남자)
  if (msg.startsWith("!내정보등록")) {
    var infoText = msg.replace("!내정보등록", "").trim();
    
    if (!infoText) {
      replier.reply("❌ 사용법: !내정보등록 이름:홍길동 나이:25 성별:남자 지역:서울 취미:게임 MBTI:ENFP 자기소개:안녕하세요!\n\n💡 팁: 원하는 필드를 자유롭게 추가할 수 있습니다!\n예: !내정보등록 이름:홍길동 최근방문일:9월11일 좋아하는음식:치킨");
      return;
    }
    
    // 기존 정보 가져오기
    var existingInfo = myinfo.getUserInfo(room, sender) || {};
    
    // 새 정보 파싱
    var newUserInfo = myinfo.parseUserInfo(infoText);
    
    // 기존 정보와 새 정보 병합
    var mergedInfo = Object.assign({}, existingInfo, newUserInfo);
    
    // 정보 저장
    myinfo.saveUserInfo(room, sender, mergedInfo);
    replier.reply("✅ 정보가 성공적으로 추가/수정되었습니다!\n!내정보 명령어로 확인할 수 있습니다.");
  }
  
}
