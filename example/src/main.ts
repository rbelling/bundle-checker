import Vue from 'vue';
import App from './App.vue';
import babelConfig from '../babel.config';
const { log } = console;

const identity = (anything: any) => {
  log(JSON.stringify(babelConfig, anything);
  return anything;
};

Vue.config.productionTip = false;

new Vue({
  render: (h) => h(App),
}).$mount(identity('#app'));
