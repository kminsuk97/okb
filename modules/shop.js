// modules/shop.js
// 메신저봇R 상점 시스템 (포인트로 아이템 구매)

// 전역 Replier 객체 (common.js에서 주입받음)
var globalReplier = null;

// 데이터 저장 경로
var DATA_DIR = "/sdcard/DataBase/";

// 상점 아이템 목록
var SHOP_ITEMS = {
  "닉네임 지정권": {
    name: "닉네임 지정권",
    price: 1000,
    description: "원하는 닉네임으로 변경 또는 지정권(수위 지키기)",
    emoji: "🎉"
  },
  // "집앞벙": {
  //   name: "집 앞벙 집합 개최권",
  //   price: 1500,
  //   description: "🍰 집 앞벙 집합 개최권",
  //   emoji: "🍰"
  // },
  "야자타임권": {
    name: "야자타임권",
    price: 800,
    description: "🍕 30분동안 야자타임 개최권",
    emoji: "🍕"
  },
};

// Replier 객체 설정 (common.js에서 호출)
function setReplier(replier) {
  globalReplier = replier;
}

// 방별 구매 데이터 로드
function loadPurchaseData(room) {
  try {
    var fileName = "purchases_" + room + ".json";
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

// 방별 구매 데이터 저장
function savePurchaseData(room, data) {
  try {
    var fileName = "purchases_" + room + ".json";
    var filePath = DATA_DIR + fileName;
    var jsonData = JSON.stringify(data, null, 2);
    
    FileStream.write(filePath, jsonData);
    return true;
  } catch (error) {
    return false;
  }
}

// 상점 목록 조회
function getShopItems() {
  return SHOP_ITEMS;
}

// 상점 목록 포맷팅
function formatShopList() {
  var result = "🛒 상점 목록\n";
  result += "━━━━━━━━━━━━━━━━━━━━\n";
  
  for (var itemId in SHOP_ITEMS) {
    if (SHOP_ITEMS.hasOwnProperty(itemId)) {
      var item = SHOP_ITEMS[itemId];
      result += item.emoji + " " + item.name + " - " + item.price + "P\n";
      result += "   " + item.description + "\n\n";
    }
  }
  
  result += "💡 사용법: !구매 [아이템명]";
  
  return result;
}

// 아이템 구매
function purchaseItem(room, userId, itemName, userPoints) {
  // 아이템 존재 확인
  var item = null;
  for (var itemId in SHOP_ITEMS) {
    if (SHOP_ITEMS.hasOwnProperty(itemId)) {
      if (SHOP_ITEMS[itemId].name === itemName) {
        item = SHOP_ITEMS[itemId];
        break;
      }
    }
  }
  
  if (!item) {
    return {
      success: false,
      message: "❌ 존재하지 않는 아이템입니다.\n!상점 명령어로 아이템 목록을 확인하세요."
    };
  }
  
  // 포인트 확인
  if (userPoints < item.price) {
    return {
      success: false,
      message: "❌ 포인트가 부족합니다.\n필요: " + item.price + "P, 보유: " + userPoints + "P"
    };
  }
  
  // 구매 데이터 로드
  var purchaseData = loadPurchaseData(room);
  
  // 사용자 구매 목록 초기화
  if (!purchaseData.users[userId]) {
    purchaseData.users[userId] = {
      purchases: [],
      totalSpent: 0,
      joinDate: new Date().toISOString()
    };
  }
  
  // 구매 기록 추가
  var purchase = {
    itemName: item.name,
    itemEmoji: item.emoji,
    price: item.price,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleString('ko-KR')
  };
  
  purchaseData.users[userId].purchases.push(purchase);
  purchaseData.users[userId].totalSpent += item.price;
  
  // 최대 100개 구매 기록만 보관
  if (purchaseData.users[userId].purchases.length > 100) {
    purchaseData.users[userId].purchases = purchaseData.users[userId].purchases.slice(-100);
  }
  
  savePurchaseData(room, purchaseData);
  
  return {
    success: true,
    message: "✅ 구매 완료!\n" + item.emoji + " " + item.name + "을(를) 구매했습니다.\n" +
             "💰 사용 포인트: " + item.price + "P",
    item: item
  };
}

// 사용자 구매 목록 조회
function getUserPurchases(room, userId) {
  var purchaseData = loadPurchaseData(room);
  
  if (!purchaseData.users[userId] || purchaseData.users[userId].purchases.length === 0) {
    return "📦 " + userId + "님의 구매 목록이 비어있습니다.";
  }
  
  var userData = purchaseData.users[userId];
  var result = "📦 " + userId + "님의 구매 목록\n";
  result += "━━━━━━━━━━━━━━━━━━━━\n";
  result += "💰 총 사용 포인트: " + userData.totalSpent + "P\n";
  result += "📊 총 구매 횟수: " + userData.purchases.length + "회\n\n";
  
  // 최근 10개 구매 기록만 표시
  var recentPurchases = userData.purchases.slice(-10).reverse();
  
  for (var i = 0; i < recentPurchases.length; i++) {
    var purchase = recentPurchases[i];
    result += purchase.itemEmoji + " " + purchase.itemName + " - " + purchase.price + "P\n";
    result += "   📅 " + purchase.date + "\n\n";
  }
  
  if (userData.purchases.length > 10) {
    result += "... 외 " + (userData.purchases.length - 10) + "개 더";
  }
  
  return result;
}

// 방 전체 구매 통계
function getRoomPurchaseStats(room) {
  var purchaseData = loadPurchaseData(room);
  var totalUsers = 0;
  var totalPurchases = 0;
  var totalSpent = 0;
  var itemStats = {};
  
  for (var userId in purchaseData.users) {
    if (purchaseData.users.hasOwnProperty(userId)) {
      var userData = purchaseData.users[userId];
      totalUsers++;
      totalPurchases += userData.purchases.length;
      totalSpent += userData.totalSpent;
      
      // 아이템별 통계
      for (var i = 0; i < userData.purchases.length; i++) {
        var itemName = userData.purchases[i].itemName;
        if (!itemStats[itemName]) {
          itemStats[itemName] = 0;
        }
        itemStats[itemName]++;
      }
    }
  }
  
  return {
    totalUsers: totalUsers,
    totalPurchases: totalPurchases,
    totalSpent: totalSpent,
    itemStats: itemStats
  };
}

// 구매 데이터 초기화 (관리자용)
function resetPurchaseData(room) {
  var purchaseData = { users: {} };
  savePurchaseData(room, purchaseData);
  return true;
}

// 아래와 같이 반드시 "키: 값" 쌍으로 객체 반환
module.exports = {
  // Replier 설정
  setReplier: setReplier,
  
  // 상점 시스템
  getShopItems: getShopItems,
  formatShopList: formatShopList,
  purchaseItem: purchaseItem,
  getUserPurchases: getUserPurchases,
  getRoomPurchaseStats: getRoomPurchaseStats,
  
  // 관리자 기능
  resetPurchaseData: resetPurchaseData
};
