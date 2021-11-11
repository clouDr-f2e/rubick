import {newAdapterHandler} from 'rubick-core/packages/rubick-core'
import Localdb from 'rubick-core/packages/rubick-adapter-db'
import AppSearch from 'rubick-core/packages/rubick-adapter-appsearch'
import {app, nativeImage} from '@electron/remote'
import path from 'path'
import fs from 'fs'
import {existOrNot} from './index'

const dbInstance = new Localdb({dbPath: app.getPath('cache'), dbName: 'rubick-main'})
const appInstance = new AppSearch({nativeImage})

export default class {
  constructor () {
    this.systemPlugins = []
    this.initPlugins = {
      'rubick-system-db': dbInstance,
      'rubick-appSearch': appInstance
    }
    this.UIPlugins = []
    this.pluginInstance = null
    this.db = null
    this.baseDir = app.getPath('cache')
  }

  async init () {
    const adapterHandlerConfig = {
      baseDir: this.baseDir,
      registry: 'https://registry.npm.taobao.org',
      loglevel: 5,
      adapterInit: this.initPlugins,
      rubick: {}
    }
    // 创建系统插件管理并初始化
    this.pluginInstance = await newAdapterHandler(adapterHandlerConfig)
    this.db = await this.pluginInstance.api('rubick-system-db')
  }

  async getAppList () {
    await appInstance.updateList()
    return appInstance.appList
  }

  async getUIPlugin () {
    const pluginPath = path.join(this.baseDir, 'uiPlugin')

    // 判断是否存在当前目录
    if (!await existOrNot(pluginPath)) {
      fs.mkdirSync(pluginPath)
    }

    // 存在目录，查找 package.json 是否存在，不存在的化就初始化
    const pluginsContainerConfig = path.join(pluginPath, 'package.json')
    if (!fs.existsSync(pluginsContainerConfig)) {
      fs.writeFileSync(pluginsContainerConfig, '{}', 'utf-8')
    }

    // 读取所有的 uiPlugins
    let uiPlugins = []
    try {
      uiPlugins = Object.keys(JSON.parse(fs.readFileSync(pluginsContainerConfig)).dependencies || {})
    } catch (e) {}
    uiPlugins = uiPlugins.map(plugin => {
      let info = {}
      try {
        info = JSON.parse(fs.readFileSync(path.resolve(pluginPath, 'node_modules', plugin, 'plugin.json')))
      } catch (e) {}
      const targetPluginPath = path.resolve(pluginPath, 'node_modules', plugin)
      return {
        name: plugin,
        path: targetPluginPath,
        desc: info.description,
        icon: path.join(targetPluginPath, info.logo),
        ...info,
        type: 'uiPlugin'
      }
    })
    return uiPlugins
  }
}