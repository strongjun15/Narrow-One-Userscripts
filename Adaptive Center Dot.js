// ==UserScript==
// @name         Adaptive Center Dot
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Center dot crosshair that syncs fill/border color from narrow.one's in-game settings
// @author       Lumos
// @match        https://narrow.one/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  // ===== 설정 =====
  const SIZE = 4;            // 점 지름 (px)
  const OUTLINE_WIDTH = 2;   // 테두리 두께 (px)
  const OPACITY = 1;         // 0(투명) ~ 1(불투명)
  // 게임 색을 아직 한 번도 못 읽었을 때 쓰는 기본값
  const DEFAULT_FILL = '#00ff66';
  const DEFAULT_BORDER = '#000000';
  // ================

  const ID = 'n1-center-dot';
  const STORE = 'n1-dot-colors';
  const offset = SIZE / 2 + OUTLINE_WIDTH;

  // 저장된(=마지막으로 본 게임) 색 불러오기
  let colors;
  try { colors = JSON.parse(localStorage.getItem(STORE)) || {}; }
  catch (e) { colors = {}; }
  let fill = colors.fill || DEFAULT_FILL;
  let border = colors.border || DEFAULT_BORDER;

  function ensureDot() {
    let dot = document.getElementById(ID);
    if (!dot) {
      dot = document.createElement('div');
      dot.id = ID;
      dot.style.position = 'fixed';
      dot.style.top = '50%';
      dot.style.left = '50%';
      dot.style.width = SIZE + 'px';
      dot.style.height = SIZE + 'px';
      dot.style.marginLeft = -offset + 'px';
      dot.style.marginTop = -offset + 'px';
      dot.style.borderRadius = '50%';
      dot.style.borderStyle = 'solid';
      dot.style.borderWidth = OUTLINE_WIDTH + 'px';
      dot.style.opacity = OPACITY;
      dot.style.zIndex = '2147483647';
      dot.style.pointerEvents = 'none';
      (document.body || document.documentElement).appendChild(dot);
    }
    dot.style.background = fill;
    dot.style.borderColor = border;
  }

  // 설정창이 열려 있으면 게임의 색 입력값을 읽어서 동기화
  function syncFromGame() {
    const inputs = document.querySelectorAll('.dialog-color-input');
    // 0번 = 점 채움 색, 1번 = 테두리 색
    if (inputs.length >= 2 && inputs[0].value && inputs[1].value) {
      const f = inputs[0].value, b = inputs[1].value;
      if (f !== fill || b !== border) {
        fill = f;
        border = b;
        try { localStorage.setItem(STORE, JSON.stringify({ fill, border })); }
        catch (e) {}
      }
    }
  }

  // 0.5초마다: 게임 색 확인 → 점 갱신/유지
  setInterval(() => {
    syncFromGame();
    ensureDot();
  }, 500);

  ensureDot();
})();