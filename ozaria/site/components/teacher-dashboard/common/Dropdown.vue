<script>
export default {
  props: {
    labelText: {
      required: true,
      type: String,
    },
    options: {
      type: Array,
      default: () => [],
    },
    displayOptions: {
      type: Array,
      default: () => [],
    },
    value: {
      type: String,
      default: () => this.options[0],
    },
  },
}
</script>
<template>
  <div>
    <label>{{ labelText }}</label>
    <select @change="$emit('change', $event)">
      <option
        v-for="(option, index) in options"
        :key="option"
        :selected="option === value"
      >
        {{ displayOptions?.[index] || option }}
      </option>
    </select>
  </div>
</template>

<style lang="scss" scoped>
@import "app/styles/bootstrap/variables";
@import "ozaria/site/styles/common/variables.scss";
@import "app/styles/ozaria/_ozaria-style-params.scss";

div {
  display: flex;
  flex-direction: column;

  label {
    @include font-p-4-paragraph-smallest-gray;
    font-size: 11px;
    margin-bottom: -3px;
  }

  select {
    @include font-p-2-paragraph-medium-gray;
    font-size: 14px;
    line-height: 20px;

    height: 25px;
    min-width: 170px;
  }
}
</style>
