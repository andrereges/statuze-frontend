import axios from 'axios'
import { LocalStorage } from 'quasar'

const axiosInstance = axios.create({
  baseURL: process.env.API,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    Authorization: `Bearer ${LocalStorage.getItem('statuze_access_token')}`
  }
})

export default ({ Vue }) => {
  Vue.prototype.$axios = axiosInstance
}

export { axiosInstance }
