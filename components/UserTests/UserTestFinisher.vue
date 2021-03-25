<script>
export default {
  mounted() {
    this.$emit('registerAfterHook', this.cleanupTests, 'cleanupTests');
  },
  methods: {
    cleanupTests() {
      this.$store.dispatch('utm/end');
    },
  }
};
</script>
<template>
  <span></span>
</template>
