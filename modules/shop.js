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
    description: "💬 30분동안 야자타임 개최권",
    emoji: "💬"
  },
  "자리 배정권": {
    name: "자리 배치 지정 1회권",
    price: 400,
    description: "🪑초기에 자리 배정할 수 있는 권한 부여",
    emoji: "🪑"
  },
  "주류 선택권": {
    name: "주류 선택권",
    price: 500,
    description: "🍺 각 차수마다 주류 선택 가능 (금액대 적당히)",
    emoji: "🍺"
  },
  "안주 우선 선택권": {
    name: "안주 우선 선택권",
    price: 300,
    description: "🍚 각 차수마다 안주 우선 선택 가능",
    emoji: "🍚"
  },
  "옆자리 선정권": {
    name: "옆자리 선정권",
    price: 600,
    description: "👥️ 각 차수마다 옆자리 선택 가능 (합석자 불편하지 않는 선에서)",
    emoji: "👥️"
  },
  "지정 2인 강제 1일 커플권": {
    name: "지정 2인 강제 1일 커플권",
    price: 2000,
    description: "💛 강제 1일 커플 만들기 (동성 가능, 연인이 있는경우 패스)",
    emoji: "💛"
  },
  "드레스코드 설정권": {
    name: "드레스코드 설정권",
    price: 300,
    description: "👗 컬러선택 컨셉옷 등등",
    emoji: "👗"
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
  result += "━━━━━━━━━━━\n";
  
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

// 아이템 사용
function useItem(room, userId, itemName) {
  var purchaseData = loadPurchaseData(room);
  
  if (!purchaseData.users[userId] || purchaseData.users[userId].purchases.length === 0) {
    return {
      success: false,
      message: "❌ 구매한 아이템이 없습니다."
    };
  }
  
  // 사용자가 구매한 아이템 중에서 해당 아이템 찾기
  var userPurchases = purchaseData.users[userId].purchases;
  var foundItem = null;
  var itemIndex = -1;
  
  for (var i = userPurchases.length - 1; i >= 0; i--) {
    if (userPurchases[i].itemName === itemName) {
      foundItem = userPurchases[i];
      itemIndex = i;
      break;
    }
  }
  
  if (!foundItem) {
    return {
      success: false,
      message: "❌ 해당 아이템을 구매하지 않았습니다.\n!구매목록 명령어로 구매한 아이템을 확인하세요."
    };
  }
  
  // 아이템 사용 처리 (구매 목록에서 제거)
  userPurchases.splice(itemIndex, 1);
  purchaseData.users[userId].totalSpent -= foundItem.price;
  
  // 사용 기록 추가
  if (!purchaseData.users[userId].usedItems) {
    purchaseData.users[userId].usedItems = [];
  }
  
  var usedItem = {
    itemName: foundItem.itemName,
    itemEmoji: foundItem.itemEmoji,
    price: foundItem.price,
    usedAt: new Date().toISOString(),
    usedDate: new Date().toLocaleString('ko-KR')
  };
  
  purchaseData.users[userId].usedItems.push(usedItem);
  
  // 최대 100개 사용 기록만 보관
  if (purchaseData.users[userId].usedItems.length > 100) {
    purchaseData.users[userId].usedItems = purchaseData.users[userId].usedItems.slice(-100);
  }
  
  savePurchaseData(room, purchaseData);
  
  return {
    success: true,
    message: "✅ 아이템 사용 완료!\n" + foundItem.itemEmoji + " " + foundItem.itemName + "을(를) 사용했습니다.",
    item: foundItem
  };
}

// 사용자 사용한 아이템 목록 조회
function getUserUsedItems(room, userId) {
  var purchaseData = loadPurchaseData(room);
  
  if (!purchaseData.users[userId] || !purchaseData.users[userId].usedItems || purchaseData.users[userId].usedItems.length === 0) {
    return "📦 " + userId + "님의 사용한 아이템 목록이 비어있습니다.";
  }
  
  var userData = purchaseData.users[userId];
  var result = "📦 " + userId + "님의 사용한 아이템 목록\n";
  result += "━━━━━━━━━━━━━━━━━━━━\n";
  result += "📊 총 사용 횟수: " + userData.usedItems.length + "회\n\n";
  
  // 최근 10개 사용 기록만 표시
  var recentUsedItems = userData.usedItems.slice(-10).reverse();
  
  for (var i = 0; i < recentUsedItems.length; i++) {
    var usedItem = recentUsedItems[i];
    result += usedItem.itemEmoji + " " + usedItem.itemName + " - " + usedItem.price + "P\n";
    result += "   📅 " + usedItem.usedDate + "\n\n";
  }
  
  if (userData.usedItems.length > 10) {
    result += "... 외 " + (userData.usedItems.length - 10) + "개 더";
  }
  
  return result;
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
  
  // 아이템 사용 시스템
  useItem: useItem,
  getUserUsedItems: getUserUsedItems,
  
  // 관리자 기능
  resetPurchaseData: resetPurchaseData
};
