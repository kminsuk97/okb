// modules/utils.js
function helloMessage(name) {
  return name + "님, 안녕하세요!";
}

// 아래와 같이 반드시 "키: 값" 쌍으로 객체 반환
module.exports = {
  helloMessage: helloMessage
};