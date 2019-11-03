
import MyLayout from 'layouts/MyLayout.vue'
import ExcelFormat from 'pages/ExcelFormat.vue'
import ManualFormat from 'pages/ManualFormat.vue'

const routes = [
  {
    path: '/',
    component: MyLayout,
    children: [
      { path: '/', component: ExcelFormat, name: 'excelformat' },
      { path: 'excelformat', component: ExcelFormat, name: 'excelformat' },
      { path: 'manualformat', component: ManualFormat, name: 'manualformat' }
    ]
  }
]

// Always leave this as last one
if (process.env.MODE !== 'ssr') {
  routes.push({
    path: '*',
    component: () => import('pages/Error404.vue')
  })
}

export default routes
