<!-- 後記：同一個成品場景，用 TresJS（Vue）重寫。 -->
<script setup>
import { reactive, ref } from 'vue';
import { TresCanvas } from '@tresjs/core';
import StarScene from './StarScene.vue';

// 游標位置：左 -1、右 1；下 -1、上 1。它是一份響應式資料，場景直接讀
const pointer = reactive({ x: 0, y: 0, on: false });
function track(e) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  pointer.on = true;
}
const failed = ref(false);
</script>

<template>
  <main @pointermove="track" @pointerleave="pointer.on = false">
    <!-- 建立 renderer、接上 canvas、處理視窗縮放：全部包在這一個元件裡 -->
    <TresCanvas v-if="!failed" window-size :dpr="[1, 1.5]" @error="failed = true">
      <StarScene :pointer="pointer" />
    </TresCanvas>
    <h1 class="brand">ひとめぐり</h1>
    <p class="note">同一個場景，用 TresJS 寫的版本　<a href="../#ch12">回到教本</a></p>
  </main>
</template>

<style>
html, body { margin: 0; height: 100%; background: #12141f; overflow: hidden; }
main { position: fixed; inset: 0; font-family: "Noto Sans TC", system-ui, sans-serif; }
.brand {
  position: absolute; right: 9%; top: 50%; transform: translateY(-50%); margin: 0;
  font: 500 clamp(22px, 4.2vw, 54px) "Shippori Mincho", serif; letter-spacing: .2em; color: #efece2;
  pointer-events: none; animation: rise 1.2s 5s both;
}
.note { position: absolute; left: 16px; bottom: 12px; margin: 0; font-size: 12px; color: #8d8fa3; letter-spacing: .04em; }
.note a { color: #9fb8ad; margin-left: 8px; }
@keyframes rise { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .brand { animation: none; } }
</style>
