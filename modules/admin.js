// modules/admin.js
// 메신저봇R 관리자 시스템 (관리자 등록, 권한 관리)

// 전역 Replier 객체 (common.js에서 주입받음)
var globalReplier = null;

// 데이터 저장 경로
var DATA_DIR = "/sdcard/DataBase/";

// Replier 객체 설정 (common.js에서 호출)
function setReplier(replier) {
  globalReplier = replier;
}

// 방별 관리자 데이터 로드
function loadAdminData(room) {
  try {
    var fileName = "admin_" + room + ".json";
    var filePath = DATA_DIR + fileName;
    
    var data = FileStream.read(filePath);
    if (data && data !== "") {
      return JSON.parse(data);
    }
    
    return { 
      admins: [], 
      superAdmin: null,
      initialized: false 
    };
  } catch (error) {
    return { 
      admins: [], 
      superAdmin: null,
      initialized: false 
    };
  }
}

// 방별 관리자 데이터 저장
function saveAdminData(room, data) {
  try {
    var fileName = "admin_" + room + ".json";
    var filePath = DATA_DIR + fileName;
    var jsonData = JSON.stringify(data, null, 2);
    
    FileStream.write(filePath, jsonData);
    return true;
  } catch (error) {
    return false;
  }
}

// 관리자 시스템 초기화 (최초 1회만)
function initializeAdmin(room, userId) {
  var adminData = loadAdminData(room);
  
  if (adminData.initialized) {
    return {
      success: false,
      message: "이미 관리자 시스템이 초기화되었습니다."
    };
  }
  
  adminData.superAdmin = userId;
  adminData.admins = [userId];
  adminData.initialized = true;
  adminData.initDate = new Date().toISOString();
  
  saveAdminData(room, adminData);
  
  return {
    success: true,
    message: "관리자 시스템이 초기화되었습니다. " + userId + "님이 슈퍼관리자가 되었습니다."
  };
}

// 관리자 권한 확인
function isAdmin(room, userId) {
  var adminData = loadAdminData(room);
  return adminData.admins.indexOf(userId) !== -1;
}

// 슈퍼관리자 권한 확인
function isSuperAdmin(room, userId) {
  var adminData = loadAdminData(room);
  return adminData.superAdmin === userId;
}

// 관리자 추가
function addAdmin(room, adminUserId, targetUserId) {
  var adminData = loadAdminData(room);
  
  // 권한 확인
  if (!isAdmin(room, adminUserId)) {
    return {
      success: false,
      message: "관리자 권한이 없습니다."
    };
  }
  
  // 이미 관리자인지 확인
  if (adminData.admins.indexOf(targetUserId) !== -1) {
    return {
      success: false,
      message: targetUserId + "님은 이미 관리자입니다."
    };
  }
  
  adminData.admins.push(targetUserId);
  saveAdminData(room, adminData);
  
  return {
    success: true,
    message: targetUserId + "님이 관리자로 추가되었습니다."
  };
}

// 관리자 제거 (관리자만 가능)
function removeAdmin(room, adminUserId, targetUserId) {
  var adminData = loadAdminData(room);
  
  // 관리자 권한 확인
  if (!isAdmin(room, adminUserId)) {
    return {
      success: false,
      message: "관리자만 관리자를 제거할 수 있습니다."
    };
  }
  
  // 자신을 제거하려는 경우
  if (adminUserId === targetUserId) {
    return {
      success: false,
      message: "자신을 관리자에서 제거할 수 없습니다."
    };
  }
  
  // 슈퍼관리자를 제거하려는 경우
  if (adminData.superAdmin === targetUserId) {
    return {
      success: false,
      message: "슈퍼관리자는 제거할 수 없습니다."
    };
  }
  
  var index = adminData.admins.indexOf(targetUserId);
  if (index === -1) {
    return {
      success: false,
      message: targetUserId + "님은 관리자가 아닙니다."
    };
  }
  
  adminData.admins.splice(index, 1);
  saveAdminData(room, adminData);
  
  return {
    success: true,
    message: targetUserId + "님이 관리자에서 제거되었습니다."
  };
}

// 관리자 목록 조회
function getAdminList(room) {
  var adminData = loadAdminData(room);
  
  if (!adminData.initialized) {
    return {
      success: false,
      message: "관리자 시스템이 초기화되지 않았습니다."
    };
  }
  
  var result = "👑 관리자 목록\n";
  result += "━━━━━━━━━━━━━━━━━━━━\n";
  result += "🔱 슈퍼관리자: " + adminData.superAdmin + "\n";
  result += "👥 관리자 (" + adminData.admins.length + "명):\n";
  
  for (var i = 0; i < adminData.admins.length; i++) {
    var admin = adminData.admins[i];
    var prefix = admin === adminData.superAdmin ? "🔱 " : "👤 ";
    result += prefix + admin + "\n";
  }
  
  return {
    success: true,
    message: result
  };
}

// 관리자 시스템 상태 확인
function getAdminStatus(room) {
  var adminData = loadAdminData(room);
  
  return {
    initialized: adminData.initialized,
    superAdmin: adminData.superAdmin,
    adminCount: adminData.admins.length,
    admins: adminData.admins
  };
}

// 아래와 같이 반드시 "키: 값" 쌍으로 객체 반환
module.exports = {
  // Replier 설정
  setReplier: setReplier,
  
  // 관리자 시스템 관리
  initializeAdmin: initializeAdmin,
  isAdmin: isAdmin,
  isSuperAdmin: isSuperAdmin,
  addAdmin: addAdmin,
  removeAdmin: removeAdmin,
  getAdminList: getAdminList,
  getAdminStatus: getAdminStatus
};
