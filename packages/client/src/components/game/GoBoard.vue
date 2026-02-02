<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import type { BoardSize, StoneColor, Position } from '@webgo/shared';
import { STAR_POINTS } from '@webgo/shared';

const props = defineProps<{
  size: BoardSize;
  stones: Record<string, StoneColor>;
  lastMove: Position | null;
  myColor: StoneColor | null;
  isMyTurn: boolean;
  status: string;
  deadStones?: Position[];
  territory?: { black: Position[]; white: Position[] };
}>();

const emit = defineEmits<{
  (e: 'place-stone', pos: Position): void;
  (e: 'mark-dead', pos: Position): void;
}>();

const hoverPosition = ref<Position | null>(null);
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024);

const cellSize = computed(() => {
  // Responsive sizing based on board size and viewport width
  const baseSize = props.size;
  const vw = viewportWidth.value;

  // Extra small phones (< 380px) - very compact
  if (vw < 380) {
    if (baseSize === 9) return 28;
    if (baseSize === 13) return 22;
    return 16;
  }

  // Small phones (380px - 640px)
  if (vw < 640) {
    if (baseSize === 9) return 36;
    if (baseSize === 13) return 28;
    return 22;
  }

  // Tablets and larger (640px+)
  if (baseSize === 9) return 44;
  if (baseSize === 13) return 36;
  return 28;
});

function handleResize() {
  viewportWidth.value = window.innerWidth;
}

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

const boardPadding = computed(() => cellSize.value);

const boardSize = computed(() => {
  return (props.size - 1) * cellSize.value + boardPadding.value * 2;
});

const starPoints = computed(() => STAR_POINTS[props.size]);

function getStone(x: number, y: number): StoneColor | null {
  return props.stones[`${x},${y}`] || null;
}

function isLastMove(x: number, y: number): boolean {
  return props.lastMove?.x === x && props.lastMove?.y === y;
}

function isDeadStone(x: number, y: number): boolean {
  return props.deadStones?.some((p) => p.x === x && p.y === y) || false;
}

function getTerritory(x: number, y: number): StoneColor | null {
  if (props.territory?.black.some((p) => p.x === x && p.y === y)) return 'black';
  if (props.territory?.white.some((p) => p.x === x && p.y === y)) return 'white';
  return null;
}

function handleClick(x: number, y: number) {
  if (props.status === 'scoring') {
    // In scoring mode, click to mark dead stones
    if (getStone(x, y)) {
      emit('mark-dead', { x, y });
    }
  } else if (props.status === 'active' && props.isMyTurn) {
    // In active mode, click to place stones
    if (!getStone(x, y)) {
      emit('place-stone', { x, y });
    }
  }
}

function handleMouseEnter(x: number, y: number) {
  if (props.status === 'active' && props.isMyTurn && !getStone(x, y)) {
    hoverPosition.value = { x, y };
  }
}

function handleMouseLeave() {
  hoverPosition.value = null;
}

function getPosition(x: number, y: number) {
  return {
    cx: boardPadding.value + x * cellSize.value,
    cy: boardPadding.value + y * cellSize.value,
  };
}
</script>

<template>
  <div class="go-board-container">
    <svg
      :width="boardSize"
      :height="boardSize"
      class="go-board"
    >
      <!-- Board background -->
      <rect
        x="0"
        y="0"
        :width="boardSize"
        :height="boardSize"
        class="fill-board"
      />

      <!-- Grid lines -->
      <g class="grid-lines">
        <!-- Vertical lines -->
        <line
          v-for="x in size"
          :key="`v-${x}`"
          :x1="boardPadding + (x - 1) * cellSize"
          :y1="boardPadding"
          :x2="boardPadding + (x - 1) * cellSize"
          :y2="boardPadding + (size - 1) * cellSize"
          stroke="#8B7355"
          stroke-width="1"
        />
        <!-- Horizontal lines -->
        <line
          v-for="y in size"
          :key="`h-${y}`"
          :x1="boardPadding"
          :y1="boardPadding + (y - 1) * cellSize"
          :x2="boardPadding + (size - 1) * cellSize"
          :y2="boardPadding + (y - 1) * cellSize"
          stroke="#8B7355"
          stroke-width="1"
        />
      </g>

      <!-- Star points -->
      <g class="star-points">
        <circle
          v-for="[x, y] in starPoints"
          :key="`star-${x}-${y}`"
          :cx="boardPadding + x * cellSize"
          :cy="boardPadding + y * cellSize"
          :r="cellSize * 0.1"
          fill="#8B7355"
        />
      </g>

      <!-- Territory markers (during scoring) -->
      <g v-if="status === 'scoring' || status === 'finished'" class="territory">
        <template v-for="y in size" :key="`territory-row-${y}`">
          <template v-for="x in size" :key="`territory-${x}-${y}`">
            <rect
              v-if="getTerritory(x - 1, y - 1)"
              :x="getPosition(x - 1, y - 1).cx - cellSize * 0.15"
              :y="getPosition(x - 1, y - 1).cy - cellSize * 0.15"
              :width="cellSize * 0.3"
              :height="cellSize * 0.3"
              :fill="getTerritory(x - 1, y - 1) === 'black' ? '#333' : '#ddd'"
              opacity="0.6"
            />
          </template>
        </template>
      </g>

      <!-- Clickable areas -->
      <g class="click-areas">
        <template v-for="y in size" :key="`row-${y}`">
          <rect
            v-for="x in size"
            :key="`cell-${x}-${y}`"
            :x="getPosition(x - 1, y - 1).cx - cellSize / 2"
            :y="getPosition(x - 1, y - 1).cy - cellSize / 2"
            :width="cellSize"
            :height="cellSize"
            fill="transparent"
            class="cursor-pointer"
            @click="handleClick(x - 1, y - 1)"
            @mouseenter="handleMouseEnter(x - 1, y - 1)"
            @mouseleave="handleMouseLeave"
          />
        </template>
      </g>

      <!-- Hover indicator -->
      <circle
        v-if="hoverPosition && isMyTurn && status === 'active'"
        :cx="getPosition(hoverPosition.x, hoverPosition.y).cx"
        :cy="getPosition(hoverPosition.x, hoverPosition.y).cy"
        :r="cellSize * 0.42"
        :fill="myColor === 'black' ? '#333' : '#ddd'"
        opacity="0.5"
        class="pointer-events-none"
      />

      <!-- Stones -->
      <g class="stones">
        <template v-for="y in size" :key="`stones-row-${y}`">
          <template v-for="x in size" :key="`stone-${x}-${y}`">
            <g v-if="getStone(x - 1, y - 1)">
              <!-- Stone shadow -->
              <ellipse
                :cx="getPosition(x - 1, y - 1).cx + 2"
                :cy="getPosition(x - 1, y - 1).cy + 2"
                :rx="cellSize * 0.42"
                :ry="cellSize * 0.42"
                fill="rgba(0,0,0,0.3)"
              />
              <!-- Stone -->
              <circle
                :cx="getPosition(x - 1, y - 1).cx"
                :cy="getPosition(x - 1, y - 1).cy"
                :r="cellSize * 0.42"
                :fill="getStone(x - 1, y - 1) === 'black' ? '#1a1a1a' : '#f5f5f5'"
                :stroke="getStone(x - 1, y - 1) === 'black' ? '#000' : '#ccc'"
                stroke-width="1"
                :class="{ 'opacity-50': isDeadStone(x - 1, y - 1) }"
              />
              <!-- Stone highlight (for white stones) -->
              <circle
                v-if="getStone(x - 1, y - 1) === 'white'"
                :cx="getPosition(x - 1, y - 1).cx - cellSize * 0.12"
                :cy="getPosition(x - 1, y - 1).cy - cellSize * 0.12"
                :r="cellSize * 0.12"
                fill="rgba(255,255,255,0.4)"
              />
              <!-- Last move marker -->
              <circle
                v-if="isLastMove(x - 1, y - 1)"
                :cx="getPosition(x - 1, y - 1).cx"
                :cy="getPosition(x - 1, y - 1).cy"
                :r="cellSize * 0.15"
                :fill="getStone(x - 1, y - 1) === 'black' ? '#fff' : '#000'"
                opacity="0.7"
              />
              <!-- Dead stone marker -->
              <g v-if="isDeadStone(x - 1, y - 1)">
                <line
                  :x1="getPosition(x - 1, y - 1).cx - cellSize * 0.2"
                  :y1="getPosition(x - 1, y - 1).cy - cellSize * 0.2"
                  :x2="getPosition(x - 1, y - 1).cx + cellSize * 0.2"
                  :y2="getPosition(x - 1, y - 1).cy + cellSize * 0.2"
                  stroke="red"
                  stroke-width="3"
                />
                <line
                  :x1="getPosition(x - 1, y - 1).cx + cellSize * 0.2"
                  :y1="getPosition(x - 1, y - 1).cy - cellSize * 0.2"
                  :x2="getPosition(x - 1, y - 1).cx - cellSize * 0.2"
                  :y2="getPosition(x - 1, y - 1).cy + cellSize * 0.2"
                  stroke="red"
                  stroke-width="3"
                />
              </g>
            </g>
          </template>
        </template>
      </g>

      <!-- Coordinate labels -->
      <g class="coordinates text-xs fill-gray-600">
        <!-- Column labels (A-T, skipping I) -->
        <text
          v-for="x in size"
          :key="`col-${x}`"
          :x="boardPadding + (x - 1) * cellSize"
          :y="boardPadding - cellSize * 0.5"
          text-anchor="middle"
          dominant-baseline="middle"
          font-size="12"
        >
          {{ String.fromCharCode(65 + (x - 1 >= 8 ? x : x - 1)) }}
        </text>
        <!-- Row labels -->
        <text
          v-for="y in size"
          :key="`row-label-${y}`"
          :x="boardPadding - cellSize * 0.5"
          :y="boardPadding + (y - 1) * cellSize"
          text-anchor="middle"
          dominant-baseline="middle"
          font-size="12"
        >
          {{ size - y + 1 }}
        </text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.go-board-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 100%;
  overflow: auto;
}

.go-board {
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  max-width: 100%;
  height: auto;
}

.fill-board {
  fill: #DEB887;
}

/* Ensure the SVG is responsive on smaller screens */
@media (max-width: 640px) {
  .go-board-container {
    padding: 0;
  }
}
</style>
