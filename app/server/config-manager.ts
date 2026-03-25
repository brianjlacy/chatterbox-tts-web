import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import type { AppConfig, DeepPartial } from '~/lib/types'
import { DEFAULT_CONFIG } from '~/lib/constants'

const CONFIG_PATH = process.env['CONFIG_PATH'] || path.resolve(process.cwd(), 'config.yaml')

/**
 * Deep merge source into target. Arrays are replaced, not merged.
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: DeepPartial<T>): T {
  const result = { ...target }

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key]
    const targetValue = target[key]

    if (
      sourceValue !== null &&
      sourceValue !== undefined &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      ) as T[keyof T]
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T]
    }
  }

  return result
}

class ConfigManager {
  private config: AppConfig
  private configPath: string

  constructor() {
    this.configPath = CONFIG_PATH
    this.config = this.load()
  }

  /** Load config from YAML file, merging with defaults */
  load(): AppConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf-8')
        const parsed = yaml.load(fileContent) as DeepPartial<AppConfig> | null
        if (parsed && typeof parsed === 'object') {
          this.config = deepMerge(structuredClone(DEFAULT_CONFIG), parsed)
          return this.config
        }
      }
    } catch (err) {
      console.error(`[ConfigManager] Error loading config from ${this.configPath}:`, err)
    }

    // Fall back to defaults
    this.config = structuredClone(DEFAULT_CONFIG)
    this.save()
    return this.config
  }

  /** Save current config to YAML file */
  save(): boolean {
    try {
      const dir = path.dirname(this.configPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      const yamlContent = yaml.dump(this.config, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false,
      })
      fs.writeFileSync(this.configPath, yamlContent, 'utf-8')
      return true
    } catch (err) {
      console.error(`[ConfigManager] Error saving config to ${this.configPath}:`, err)
      return false
    }
  }

  /** Deep merge a partial update into current config and save */
  update(partial: DeepPartial<AppConfig>): boolean {
    this.config = deepMerge(this.config, partial)
    return this.save()
  }

  /** Reset config to defaults and save */
  reset(): boolean {
    this.config = structuredClone(DEFAULT_CONFIG)
    return this.save()
  }

  /** Get the full config object */
  getConfig(): AppConfig {
    return this.config
  }

  /** Get a nested value by dot-separated path */
  get<T>(dotPath: string, defaultValue: T): T {
    const keys = dotPath.split('.')
    let current: unknown = this.config

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue
      }
      current = (current as Record<string, unknown>)[key]
    }

    return (current as T) ?? defaultValue
  }

  getString(dotPath: string, defaultValue: string): string {
    const val = this.get(dotPath, defaultValue)
    return typeof val === 'string' ? val : defaultValue
  }

  getNumber(dotPath: string, defaultValue: number): number {
    const val = this.get(dotPath, defaultValue)
    return typeof val === 'number' ? val : defaultValue
  }

  getBool(dotPath: string, defaultValue: boolean): boolean {
    const val = this.get(dotPath, defaultValue)
    return typeof val === 'boolean' ? val : defaultValue
  }
}

/** Singleton config manager instance */
export const configManager = new ConfigManager()
