// main.js (프로젝트 루트에 위치)
var utils = require('utils'); // 상대경로(x), 확장자(x)
var myinfo = require('myinfo'); // 사용자 정보 관리 모듈
var dataManager = require('dataManager'); // 데이터 관리 모듈
var activity = require('activity'); // 활동 시스템 모듈
var point = require('point'); // 포인트 시스템 모듈
var attendance = require('attendance'); // 출석 시스템 모듈
var admin = require('admin'); // 관리자 시스템 모듈
var jackpot = require('jackpot'); // 잭팟 시스템 모듈
var shop = require('shop'); // 상점 시스템 모듈
var ranking = require('ranking'); // 랭킹 시스템 모듈

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
  // Replier 객체를 모듈들에 주입 (최초 1회만)
  if (!dataManager._replierSet) {
    dataManager.setReplier(replier);
    activity.setReplier(replier);
    point.setReplier(replier);
    attendance.setReplier(replier);
    admin.setReplier(replier);
    jackpot.setReplier(replier);
    shop.setReplier(replier);
    ranking.setReplier(replier);
    ranking.setModules(activity, point);
    dataManager._replierSet = true;
  }
  
  // 모든 메시지를 대화 데이터로 저장 (명령어가 아닌 경우만)
  if (!msg.startsWith("!")) {
    dataManager.saveChatMessage(room, sender, msg);
    // 활동 시스템에 채팅 기록
    activity.recordChat(room, sender);
    
    // 잭팟 시스템 시도
    var jackpotResult = jackpot.tryJackpot(room, sender);
    if (jackpotResult.success) {
      // 포인트 지급
      point.addUserPoints(room, sender, jackpotResult.reward);
      
      // 잭팟 당첨 메시지
      replier.reply("🎰 [" + sender + "] " + jackpotResult.message);
    }
  }
  
  // !도움말 명령어 처리
  if (msg === "!도움말" || msg === "!help") {
    var helpText = "🤖 메신저봇 명령어 도움말\n";
    helpText += "━━━━━━━━━━━━━\n";
    helpText += "📋 !내정보 - 내 정보 조회\n";
    helpText += "📝 !내정보등록 [정보] - 정보 추가/수정\n";
    helpText += "🎯 !활동 - 내 활동 정보 조회\n";
    helpText += "💰 !양도 [사용자] [포인트] - 포인트 양도\n";
    helpText += "📅 !출석 - 일일 출석 체크\n";
    helpText += "🛒 !상점 - 상점 목록 조회\n";
    helpText += "🛍️ !구매 [아이템명] - 아이템 구매\n";
    helpText += "📦 !구매목록 - 내 구매 목록 조회\n";
    helpText += "📊 !랭킹 - 금일 채팅 랭킹 TOP 20\n";
    helpText += "💰 !포인트랭킹 - 포인트 랭킹 TOP 20\n";
    helpText += "⭐ !레벨랭킹 - 레벨 랭킹 TOP 20\n";
    helpText += "❓ !도움말 - 이 도움말 표시\n\n";
    
    replier.reply(helpText);
  }
  
  // !관리자도움말 명령어 처리 (관리자만)
  if (msg === "!관리자도움말") {
    if (!admin.isAdmin(room, sender)) {
      replier.reply("❌ 관리자만 관리자 도움말을 조회할 수 있습니다.");
      return;
    }
    
    var adminHelpText = "👑 관리자 전용 명령어 도움말\n";
    adminHelpText += "━━━━━━━━━━━━━\n";
    adminHelpText += "👑 !관리자초기등록 - 관리자 시스템 초기화 (최초 1회)\n";
    adminHelpText += "👥 !관리자목록 - 관리자 목록 조회\n";
    adminHelpText += "➕ !관리자추가 [사용자] - 관리자 추가\n";
    adminHelpText += "➖ !관리자삭제 [사용자] - 관리자 삭제\n";
    adminHelpText += "👤 !정보 [사용자] - 다른 사용자 정보 조회\n";
    adminHelpText += "📝 !정보등록 [사용자] [키:값] - 다른 사용자 정보 등록/수정\n";
    adminHelpText += "💰 !포인트지급 [사용자] [포인트] - 사용자에게 포인트 지급\n";
    adminHelpText += "🎰 !잭팟 [쿨다운분] [확률%] [최소보상] [최대보상] - 잭팟 설정 변경\n";
    adminHelpText += "❓ !관리자도움말 - 이 도움말 표시\n\n";
    
    replier.reply(adminHelpText);
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
  
  // !활동 명령어 처리
  if (msg === "!활동") {
    var userActivity = activity.getUserActivity(room, sender);
    var userPoints = point.getUserPoints(room, sender);
    
    var result = "🎯 " + sender + "님의 활동 정보\n";
    result += "━━━━━━━━━━━━━\n";
    result += "⭐ 레벨: " + userActivity.level + "\n";
    result += "💎 포인트: " + userPoints + "P\n";
    result += "💬 총 채팅: " + userActivity.totalChats + "회\n";
    result += "📅 오늘 채팅: " + userActivity.todayChats + "회\n";
    result += "📊 현재 EXP: " + userActivity.exp.toFixed(2) + "/" + (userActivity.exp + userActivity.expToNext).toFixed(2) + "XP";
    
    replier.reply(result);
  }
  
  // !양도 명령어 처리 (예시: !양도 홍길동 100)
  if (msg.startsWith("!양도")) {
    var parts = msg.split(" ");
    
    if (parts.length < 3) {
      replier.reply("❌ 사용법: !양도 [받을사람] [포인트]\n예시: !양도 홍길동 100");
      return;
    }
    
    // 마지막 부분을 포인트로, 나머지를 받을 사람으로 처리
    var points = parseInt(parts[parts.length - 1]);
    var toUser = parts.slice(1, -1).join(" ").trim();
    
    if (isNaN(points) || points <= 0) {
      replier.reply("❌ 포인트는 양수여야 합니다.");
      return;
    }
    
    if (toUser === sender) {
      replier.reply("❌ 자신에게는 양도할 수 없습니다.");
      return;
    }
    
    var transferResult = point.transferPoints(room, sender, toUser, points);
    
    if (transferResult.success) {
      var result = "✅ " + transferResult.message + "\n";
      result += "━━━━━━━━━━━━━\n";
      result += "📤 " + sender + "님: " + transferResult.fromPoints + "P\n";
      result += "📥 " + toUser + "님: " + transferResult.toPoints + "P";
      replier.reply(result);
    } else {
      replier.reply("❌ " + transferResult.message);
    }
  }
  
  // !출석 명령어 처리
  if (msg === "!출석") {
    var attendanceResult = attendance.checkAttendance(room, sender);
    
    if (attendanceResult.success) {
      // EXP 지급
      var currentExp = activity.getUserActivity(room, sender).exp;
      activity.addExp(room, sender, attendanceResult.expReward);
      
      // 포인트 지급
      var currentPoints = point.getUserPoints(room, sender);
      point.addUserPoints(room, sender, attendanceResult.pointReward);
      
      var result = "✅ " + attendanceResult.message + "\n";
      result += "━━━━━━━━━━━━━\n";
      result += "🎁 보상 지급:\n";
      result += "📊 EXP: +" + attendanceResult.expReward + "\n";
      result += "💎 포인트: +" + attendanceResult.pointReward + "P\n";
      result += "━━━━━━━━━━━━━\n";
      result += "📈 출석 통계:\n";
      result += "📅 총 출석일: " + attendanceResult.totalDays + "일\n";
      result += "🔥 연속 출석: " + attendanceResult.consecutiveDays + "일";
      
      replier.reply(result);
    } else {
      replier.reply("❌ " + attendanceResult.message);
    }
  }
  
  // !관리자초기등록 명령어 처리
  if (msg === "!관리자초기등록") {
    var initResult = admin.initializeAdmin(room, sender);
    replier.reply(initResult.message);
  }
  
  // !관리자목록 명령어 처리 (관리자만)
  if (msg === "!관리자목록") {
    if (!admin.isAdmin(room, sender)) {
      replier.reply("❌ 관리자만 관리자 목록을 조회할 수 있습니다.");
      return;
    }
    
    var listResult = admin.getAdminList(room);
    replier.reply(listResult.message);
  }
  
  // !관리자추가 [사용자] 명령어 처리
  if (msg.startsWith("!관리자추가 ")) {
    if (!admin.isAdmin(room, sender)) {
      replier.reply("❌ 관리자만 다른 사용자를 관리자로 추가할 수 있습니다.");
      return;
    }
    
    var parts = msg.split(" ");
    if (parts.length < 2) {
      replier.reply("❌ 사용법: !관리자추가 [사용자]");
      return;
    }
    
    // 첫 번째 공백 이후의 모든 내용을 사용자명으로 처리 (띄어쓰기 포함)
    var targetUser = msg.substring(msg.indexOf(" ") + 1).trim();
    var addResult = admin.addAdmin(room, sender, targetUser);
    replier.reply(addResult.message);
  }
  
  // !관리자삭제 [사용자] 명령어 처리
  if (msg.startsWith("!관리자삭제 ")) {
    if (!admin.isAdmin(room, sender)) {
      replier.reply("❌ 관리자만 관리자를 삭제할 수 있습니다.");
      return;
    }
    
    var parts = msg.split(" ");
    if (parts.length < 2) {
      replier.reply("❌ 사용법: !관리자삭제 [사용자]");
      return;
    }
    
    // 첫 번째 공백 이후의 모든 내용을 사용자명으로 처리 (띄어쓰기 포함)
    var targetUser = msg.substring(msg.indexOf(" ") + 1).trim();
    var removeResult = admin.removeAdmin(room, sender, targetUser);
    replier.reply(removeResult.message);
  }
  
  // !정보 [사용자] 명령어 처리 (관리자만)
  if (msg.startsWith("!정보 ")) {
    if (!admin.isAdmin(room, sender)) {
      replier.reply("❌ 관리자만 다른 사용자의 정보를 조회할 수 있습니다.");
      return;
    }
    
    var parts = msg.split(" ");
    if (parts.length < 2) {
      replier.reply("❌ 사용법: !정보 [사용자]");
      return;
    }
    
    // 첫 번째 공백 이후의 모든 내용을 사용자명으로 처리 (띄어쓰기 포함)
    var targetUser = msg.substring(msg.indexOf(" ") + 1).trim();
    var userInfo = myinfo.getAdminUserInfo(room, targetUser);
    replier.reply(userInfo);
  }
  
  // !정보등록 [사용자] [키:값] 명령어 처리 (관리자만)
  if (msg.startsWith("!정보등록 ")) {
    if (!admin.isAdmin(room, sender)) {
      replier.reply("❌ 관리자만 다른 사용자의 정보를 수정할 수 있습니다.");
      return;
    }
    
    var parts = msg.split(" ");
    if (parts.length < 3) {
      replier.reply("❌ 사용법: !정보등록 [사용자] [키:값]\n예시: !정보등록 사용자명 이름:홍길동 나이:25");
      return;
    }
    
    // 첫 번째 공백 이후의 내용에서 사용자명과 정보를 분리
    var afterFirstSpace = msg.substring(msg.indexOf(" ") + 1).trim();
    
    // 콜론(:)이 포함된 첫 번째 부분을 찾아서 정보와 사용자명을 분리
    var colonIndex = afterFirstSpace.indexOf(":");
    if (colonIndex === -1) {
      replier.reply("❌ 정보 형식이 올바르지 않습니다.\n예시: !정보등록 사용자명 이름:홍길동 나이:25");
      return;
    }
    
    // 콜론 이전의 내용을 단어별로 분리하여 사용자명 찾기
    var beforeColon = afterFirstSpace.substring(0, colonIndex).trim();
    var words = beforeColon.split(" ");
    
    // 콜론이 포함된 단어를 찾아서 사용자명과 정보를 분리
    var userWords = [];
    var infoStartIndex = 0;
    
    for (var i = 0; i < words.length; i++) {
      if (words[i].includes(":")) {
        // 콜론이 포함된 단어를 찾았으면, 이 단어부터 정보 시작
        infoStartIndex = beforeColon.indexOf(words[i]);
        break;
      }
      userWords.push(words[i]);
    }
    
    // 사용자명 (콜론이 포함되지 않은 단어들)
    var targetUser = userWords.join(" ").trim();
    // 정보 (콜론이 포함된 단어부터 끝까지)
    var infoText = afterFirstSpace.substring(infoStartIndex).trim();
    
    if (!infoText) {
      replier.reply("❌ 정보를 입력해주세요.\n예시: !정보등록 사용자명 이름:홍길동 나이:25");
      return;
    }
    
    var result = myinfo.setAdminUserInfo(room, targetUser, infoText);
    replier.reply(result);
  }
  
  // !잭팟 [쿨다운분] [확률%] [최소보상] [최대보상] 명령어 처리 (관리자만)
  if (msg.startsWith("!잭팟 ")) {
    if (!admin.isAdmin(room, sender)) {
      replier.reply("❌ 관리자만 잭팟 설정을 변경할 수 있습니다.");
      return;
    }
    
    var parts = msg.split(" ");
    if (parts.length !== 5) {
      replier.reply("❌ 사용법: !잭팟 [쿨다운분] [확률%] [최소보상] [최대보상]\n예시: !잭팟 30 1 10 50");
      return;
    }
    
    var cooldownMinutes = parseInt(parts[1]);
    var chancePercent = parseFloat(parts[2]);
    var minReward = parseInt(parts[3]);
    var maxReward = parseInt(parts[4]);
    
    if (isNaN(cooldownMinutes) || isNaN(chancePercent) || isNaN(minReward) || isNaN(maxReward)) {
      replier.reply("❌ 모든 값은 숫자여야 합니다.");
      return;
    }
    
    var result = jackpot.setJackpotSettings(room, cooldownMinutes, chancePercent, minReward, maxReward);
    replier.reply(result.message);
  }
  
  // !상점 명령어 처리
  if (msg === "!상점") {
    var shopList = shop.formatShopList();
    replier.reply(shopList);
  }
  
  // !구매 [아이템명] 명령어 처리
  if (msg.startsWith("!구매 ")) {
    var parts = msg.split(" ");
    if (parts.length < 2) {
      replier.reply("❌ 사용법: !구매 [아이템명]\n예시: !구매 커피");
      return;
    }
    
    var itemName = parts.slice(1).join(" "); // 공백이 포함된 아이템명 처리
    var userPoints = point.getUserPoints(room, sender);
    
    var purchaseResult = shop.purchaseItem(room, sender, itemName, userPoints);
    
    if (purchaseResult.success) {
      // 포인트 차감
      point.addUserPoints(room, sender, -purchaseResult.item.price);
      replier.reply(purchaseResult.message);
    } else {
      replier.reply(purchaseResult.message);
    }
  }
  
  // !구매목록 명령어 처리
  if (msg === "!구매목록") {
    var purchaseList = shop.getUserPurchases(room, sender);
    replier.reply(purchaseList);
  }
  
  // !랭킹 명령어 처리 (일일 채팅 랭킹)
  if (msg === "!랭킹") {
    var rankingResult = ranking.giveDailyRewards(room);
    if (rankingResult.success) {
      // 보상 지급
      for (var i = 0; i < rankingResult.rewards.length; i++) {
        var reward = rankingResult.rewards[i];
        point.addUserPoints(room, reward.userId, reward.points);
      }
      replier.reply(rankingResult.message);
    } else {
      // 보상이 이미 지급되었거나 상위 3명이 없는 경우 랭킹만 표시
      var dailyRanking = ranking.getDailyChatRanking(room);
      replier.reply(dailyRanking);
    }
  }
  
  // !포인트랭킹 명령어 처리
  if (msg === "!포인트랭킹") {
    var pointRanking = ranking.getPointRanking(room);
    replier.reply(pointRanking);
  }
  
  // !레벨랭킹 명령어 처리
  if (msg === "!레벨랭킹") {
    var levelRanking = ranking.getLevelRanking(room);
    replier.reply(levelRanking);
  }
  
  // !포인트지급 [사용자] [포인트] 명령어 처리 (관리자만)
  if (msg.startsWith("!포인트지급 ")) {
    if (!admin.isAdmin(room, sender)) {
      replier.reply("❌ 관리자만 포인트를 지급할 수 있습니다.");
      return;
    }
    
    var parts = msg.split(" ");
    if (parts.length < 3) {
      replier.reply("❌ 사용법: !포인트지급 [사용자] [포인트]\n예시: !포인트지급 사용자명 100");
      return;
    }
    
    // 마지막 부분을 포인트로, 나머지를 받을 사람으로 처리
    var points = parseInt(parts[parts.length - 1]);
    var targetUser = parts.slice(1, -1).join(" ").trim();
    
    if (isNaN(points) || points <= 0) {
      replier.reply("❌ 포인트는 양수여야 합니다.");
      return;
    }
    
    var giveResult = point.adminGivePoints(room, targetUser, points, sender);
    
    if (giveResult.success) {
      var result = "✅ " + giveResult.message + "\n";
      result += "━━━━━━━━━━━━━\n";
      result += "💰 현재 포인트: " + giveResult.newPoints + "P";
      replier.reply(result);
    } else {
      replier.reply("❌ " + giveResult.message);
    }
  }
  
}
