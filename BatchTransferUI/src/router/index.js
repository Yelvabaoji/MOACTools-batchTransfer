const BATCH_TRANSFER_SERVER_URL = 'http://localhost:3031/'

import Vue from 'vue'
import VueRouter from 'vue-router'

import routes from './routes'

Vue.use(VueRouter)

import axios from 'axios'
import VueAxios from 'vue-axios'

axios.defaults.timeout = 1000 * 60 * 15
axios.defaults.baseURL = BATCH_TRANSFER_SERVER_URL
Vue.use(VueAxios, axios)

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation
 */

export default function (/* { store, ssrContext } */) {
  const Router = new VueRouter({
    scrollBehavior: () => ({ x: 0, y: 0 }),
    routes,

    // Leave these as is and change from quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    mode: process.env.VUE_ROUTER_MODE,
    base: process.env.VUE_ROUTER_BASE
  })

  return Router
}
