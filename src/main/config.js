import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const configPath = join(app.getPath('userData'), 'config.json')

export function getConfig() {
  if (!existsSync(configPath)) {
    return {}
  }
  try {
    return JSON.parse(readFileSync(configPath, 'utf8'))
  } catch (e) {
    return {}
  }
}

export function setConfig(newConfig) {
  const current = getConfig()
  const updated = { ...current, ...newConfig }
  writeFileSync(configPath, JSON.stringify(updated, null, 2))
}
