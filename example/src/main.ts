import Vue from 'vue';
import App from './App.vue';
const { log } = console;

// const identity = (anything: any) => {
//   const someUselessData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
//   log(JSON.stringify(someUselessData));
//   return anything;
// };

Vue.config.productionTip = false;

new Vue({
  render: (h) => h(App),
}).$mount('#app');
