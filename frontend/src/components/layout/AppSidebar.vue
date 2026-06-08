<template>
  <nav class="sidebar">
    <div class="sidebar-section">
      <template v-for="item in items" :key="item.tab ?? item._key">
        <div v-if="item.sep" class="sidebar-sep" />
        <div v-else
          class="sidebar-item"
          :class="{ active: activeTab === item.tab }"
          @click="$emit('set-tab', item.tab)">
          <span v-html="item.icon" />
          <span>{{ item.label }}</span>
          <span v-if="item.count" class="badge-count">{{ item.count }}</span>
        </div>
      </template>
    </div>
  </nav>
</template>

<script setup>
defineProps({ items: Array, activeTab: String })
defineEmits(['set-tab'])
</script>
