<template>
  <q-layout view="lHh Lpr lFf">
    <!-- <q-header elevated> -->
    <q-header>
      <q-toolbar class="bg-white text-black">
        <q-btn flat dense round @click="leftDrawerOpen = !leftDrawerOpen" aria-label="Menu">
          <q-icon name="menu" />
        </q-btn>

        <q-toolbar-title >
          <strong>MOAC批量转账工具</strong>
        </q-toolbar-title>

      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered content-class="bg-grey-2">
      <q-list>
        <q-item-label header>菜单选项</q-item-label>
        <q-item clickable v-ripple to="/excelformat"
          :active="link === 'excelformat'"
          @click="link = 'excelformat'"
          active-class="my-menu-link"
        >
          <q-item-section avatar><q-icon name="code" /></q-item-section>
          <q-item-section>Excel批量转账</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/manualformat"
          :active="link === 'manualformat'"
          @click="link = 'manualformat'"
          active-class="my-menu-link"
        >
          <q-item-section avatar><q-icon name="list" /></q-item-section>
          <q-item-section>手动批量转账</q-item-section>
        </q-item>

        <q-item clickable tag="a" target="_blank" href="http://47.92.110.121:3030/转账模板表.xlsx">
          <q-item-section avatar>
            <q-icon name="cloud_download" />
          </q-item-section>
          <q-item-section>EXCEL模板下载</q-item-section>
        </q-item>

      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>

export default {
  name: 'MyLayout',
  data () {
    return {
      leftDrawerOpen: false,
      link: 'excelformat'
    }
  },
  methods: {
  }
}
</script>

<style lang="stylus">
.my-menu-link
  color white
  background-color #027BE3
  font-weight bold
</style>
