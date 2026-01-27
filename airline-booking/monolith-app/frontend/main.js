// @ts-nocheck
/**
 * Entry point for VueJS App
 * It enables [Quasar framework](https://quasar-framework.org)
 */
import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";

import "./styles/quasar.styl";
import "quasar-extras/animate";
import "quasar-extras/material-icons";
import Quasar, { Loading, QSpinnerPuff, Notify } from "quasar";

Vue.use(Quasar, {
  config: {
    plugins: {
      Notify
    },
    notify: {
      position: "top",
      timeout: 0,
      textColor: "white",
      closeBtn: "Dismiss"
    }
  }
});

// Set default loader for views
Loading.setDefaults({
  spinner: QSpinnerPuff,
  spinnerSize: 200 // px
});

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount("#app");
