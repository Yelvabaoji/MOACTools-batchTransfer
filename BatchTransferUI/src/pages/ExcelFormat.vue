<template>
  <q-page padding>

    <q-form @submit="onSubmit" class="q-gutter-md">
      <q-input class='q-mt-xs q-mb-none' filled v-model="privateKey"
        placeholder="输入66位0x开头的私钥"
        stack-label dense hide-bottom-space
        counter maxlength="66"
        lazy-rules
        :type="isPwd ? 'password' : 'text'"
        :rules="[ val => val.length == 66 || '请输入66位0x开头的私钥.']"
      >
        <template v-slot:append>
          <q-icon
            :name="isPwd ? 'visibility_off' : 'visibility'"
            class="cursor-pointer"
            @click="isPwd = !isPwd"
          />
        </template>
        <template v-slot:after>
          <q-btn round dense flat icon="search" v-on:click="getWalletInfo()" />
        </template>
      </q-input>

      <div class='q-mt-none q-mb-none'>
        <p>钱包：{{address}}，数量：{{String(balance.toString()).replace(/^(-?)(\d+)((\.\d+)?)$/,
          function (s, s1, s2, s3) {return s1 + s2.replace(/\d{1,3}(?=(\d{3})+$)/g, '$&,') + s3})
        }}</p>
      </div>
      <q-separator color="orange" inset />

      <q-toggle class='q-mb-none' dense v-model="isERC20" label="转ERC20币" />

      <q-input class='q-mt-xs q-mb-none' filled v-model="erc20Address"
        placeholder='输入42位0x开头的币的合约地址'
        stack-label dense hide-bottom-space
        counter maxlength="42"
        lazy-rules
        :rules="[ val => val.length == 42 || '输入42位0x开头的币的合约地址']"
      >
        <template v-slot:after>
          <q-btn round dense flat icon="search" v-on:click="getWalletInfo()" />
        </template>
      </q-input>

      <div class='q-mt-none'>
        <p>币种：{{erc20Symb}}，数量：{{String(erc20Balance.toString()).replace(/^(-?)(\d+)((\.\d+)?)$/,
          function (s, s1, s2, s3) {return s1 + s2.replace(/\d{1,3}(?=(\d{3})+$)/g, '$&,') + s3})
        }}</p>
      </div>

    </q-form>

    <q-separator color="orange" spaced />

    <q-form class='q-mt-md' @submit="onSubmit">
      <label>
        <input type="file" id="file" ref="file" v-on:change="importFile()"
          accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"/>
      </label>
        <input type="reset" value="清空" v-on:click="clearList()">
      <div>
        <q-btn class="full-width q-mt-md" label="提交转账" type="submit" color="primary" />
      </div>

      <div class='q-mt-sm q-mb-none'>
        <p>账户数：{{totalAccount}}，数量：{{String(totalAmount.toFixed(4).toString()).replace(/^(-?)(\d+)((\.\d+)?)$/,
          function (s, s1, s2, s3) {return s1 + s2.replace(/\d{1,3}(?=(\d{3})+$)/g, '$&,') + s3})
        }}</p>
        <input class='q-mt-none q-mb-sm' type="button" value="刷新转账进度" v-on:click="onReflush()">
      </div>

      <q-table
        :data="data"
        :columns="columns"
        row-key="name"
        dense
        :pagination.sync="pagination"
        no-data-label="没有数据"
        rows-per-page-label="每页行数："
        :rows-per-page-options="[25,50,100,0]"
      >
        <template v-slot:body="props">
          <q-tr :props="props">
            <q-td key="num" :props="props"> {{ props.row.name }} </q-td>
            <q-td key="addr" :props="props">
              <q-badge v-bind:style="{ color: props.row.shortAddrColor }" color="white" >
                {{ props.row.addr }}
              </q-badge>
            </q-td>
            <q-td key="amount" :props="props"> {{ props.row.amount }} </q-td>
            <q-td key="txHash" :props="props"> {{ props.row.txHash }} </q-td>
            <q-td key="status" :props="props"> {{ props.row.status }} </q-td>
          </q-tr>
        </template>
      </q-table>
    </q-form>
  </q-page>
</template>

<style>
</style>

<script>
import XLSX from 'xlsx'

export default {
  data () {
    return {
      privateKey: '',
      isPwd: true,
      totalAmount: 0,
      totalAccount: 0,
      address: '',
      balance: 0,
      isERC20: false,
      erc20Symb: '',
      erc20Address: '',
      erc20Balance: 0,

      transitionStarted: false,

      imFile: '',
      outFile: '',
      pagination: {
        sortBy: 'name',
        descending: false,
        // page: 2,
        rowsPerPage: 25
        // rowsNumber: xx if getting data from a server
      },
      columns: [
        { name: 'num', align: 'left', label: '编号', field: row => row.name, sortable: true },
        { name: 'addr', align: 'left', label: '地址', field: 'addr', sortable: true },
        { name: 'amount', align: 'left', label: '数量', field: 'amount', sortable: true },
        { name: 'txHash', align: 'left', label: 'Tx', field: 'txHash', sortable: true },
        { name: 'status', align: 'left', label: '进度', field: 'status', sortable: true }
      ],
      data: []
    }
  },
  methods: {
    getWalletInfo () {
      if (this.privateKey.length !== 66) {
        this.$q.dialog({ title: '警告', message: '私钥长度不对' })
        return
      }
      if (this.isERC20 && this.erc20Address.length !== 42) {
        this.$q.dialog({ title: '警告', message: 'ERC20币合约地址长度不对' })
        return
      }
      this.axios.post('getWalletInfo',
        {
          key: this.privateKey,
          isERC20: this.isERC20,
          erc20Address: this.erc20Address
        }
      ).then((response) => {
        console.log(response.data)
        var data = response.data
        if (data.result !== 'OK') {
          this.$q.dialog({ title: '警告', message: data.result })
          return
        }
        this.address = data.address
        this.balance = data.balance
        this.erc20Symb = data.erc20Symb
        this.erc20Balance = data.erc20Balance
      }).catch((response) => {
        console.log('传输出错了!!')
        this.$q.dialog({ title: '警告', message: '传输出错了' })
      })
    },

    // ****************************************************
    // ****************************************************
    onSubmit () {
      if (this.privateKey.length !== 66) {
        this.$q.dialog({ title: '警告', message: '私钥长度不对' })
        return
      }
      if (this.isERC20 && this.erc20Address.length !== 42) {
        this.$q.dialog({ title: '警告', message: 'ERC20币合约地址长度不对' })
        return
      }
      this.$q.dialog({ title: '确定',
        message: '你确定要进行转账吗？',
        cancel: '取消',
        ok: '确定',
        persistent: false
      }).onOk(() => {
        this.$q.loading.show({
          message: '转账中，请等待。。。'
        })

        this.axios.post(this.isERC20 ? 'sendErc20' : 'sendMoac',
          {
            key: this.privateKey,
            isERC20: this.isERC20,
            erc20Address: this.erc20Address,
            addresslist: this.data
          }
        ).then((response) => {
          this.$q.loading.hide()

          var data = response.data
          if (data.result !== 'OK') {
            this.$q.dialog({ title: '警告', message: data.result })
            return
          }
          var txList = data.txList
          console.log(txList)
          for (var i = 0; i < txList.length; i++) {
            if (txList[i].result === 'OK') {
              this.data[i].txHash = txList[i].hash
              this.data[i].status = ''
            } else {
              this.data[i].txHash = 'FAIL'
              this.data[i].status = ''
            }
          }
          this.transitionStarted = true
        }).catch((response) => {
          this.$q.loading.hide()
          console.log('传输出错了!!!')
          this.$q.dialog({ title: '警告', message: '传输出错了' })
        })
      })
    },

    // ****************************************************
    // ****************************************************
    onReflush () {
      if (!this.transitionStarted) return
      this.$q.loading.show({
        message: '刷新。。。'
      })
      this.axios.post('reflush',
        {
          addresslist: this.data
        }
      ).then((response) => {
        this.$q.loading.hide()

        var data = response.data
        if (data.result !== 'OK') {
          this.$q.dialog({ title: '警告', message: data.result })
          return
        }
        var txResult = data.txResult
        console.log(txResult)
        for (var i = 0; i < txResult.length; i++) {
          if (txResult[i].result === 'OK') {
            this.data[i].status = '完成'
          } else if (txResult[i].result === 'PENDING') {
            this.data[i].status = '等待'
          } else if (txResult[i].result === 'ERR') {
            this.data[i].status = '错误'
          }
        }
      }).catch((response) => {
        this.$q.loading.hide()

        console.log('传输出错了!!!')
        this.$q.dialog({ title: '警告', message: '传输出错了' })
      })
    },
    // ****************************************************
    // ****************************************************
    clearList () {
      this.data = []
      this.totalAccount = 0
      this.totalAmount = 0
      this.transitionStarted = false
      this.$refs.file.value = ''
    },
    // ****************************************************
    // ****************************************************
    importFile () { // 导入excel
      var shortAddrWarning = false

      var f = this.$refs.file.files[0]
      var reader = new FileReader()
      reader.onload = (e) => {
        /* Parse data */
        const bstr = e.target.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        /* Get first worksheet */
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        /* Convert array of arrays */
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 })
        /* 更新表单的数据 */
        this.data = []
        this.totalAccount = 0
        this.totalAmount = 0
        this.transitionStarted = false
        for (var i = 1; i < data.length; i++) {
          // 去除所有的空格
          var addr = data[i][1].replace(/\s/g, '')
          if (addr !== null && addr !== '' && addr.length !== 42 && addr.length !== 40) {
            this.$q.dialog({ title: '警告', message: '第' + i + '行地址有问题' })
            return
          }
          var shortAddrColor = 'black'
          if (addr.length === 40 && addr.substr(0, 2) !== '0x') {
            addr = '0x' + addr
            shortAddrColor = 'red'
            shortAddrWarning = true
          }
          if (!data[i][2]) {
            this.$q.dialog({ title: '警告', message: '第' + i + '行地址有问题' })
            return
          }
          var amount = data[i][2]
          this.data.push({
            name: i,
            addr: addr,
            amount: amount,
            txHash: '',
            status: '',
            shortAddrColor: shortAddrColor
          })
          this.totalAccount++
          this.totalAmount += parseFloat(data[i][2])
        }
        if (shortAddrWarning) {
          this.$q.dialog({ title: '警告', message: '地址前缺0x,已经补上（见红色）' })
        }
      }

      reader.readAsBinaryString(f)
    }
  },
  components: {
  }
}
</script>
