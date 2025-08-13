/**
 * Settings Manager for Test Environment Configuration
 * 
 * Handles user preferences for dataset management and testing settings.
 */

export interface TestSettings {
  autoLoadDataset: boolean;
  resetOnStartup: boolean;
  defaultQueryTimeout: number;
  showQueryTranslations: boolean;
  enableQueryLogging: boolean;
}

export class SettingsManager {
  private settings: TestSettings = {
    autoLoadDataset: true,
    resetOnStartup: true,
    defaultQueryTimeout: 30000,
    showQueryTranslations: true,
    enableQueryLogging: true
  };

  /**
   * Get current settings
   */
  getSettings(): TestSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: Partial<TestSettings>): TestSettings {
    this.settings = { ...this.settings, ...newSettings };
    return { ...this.settings };
  }

  /**
   * Reset settings to defaults
   */
  resetSettings(): TestSettings {
    this.settings = {
      autoLoadDataset: true,
      resetOnStartup: true,
      defaultQueryTimeout: 30000,
      showQueryTranslations: true,
      enableQueryLogging: true
    };
    return { ...this.settings };
  }

  /**
   * Check if dataset should be auto-loaded
   */
  shouldAutoLoadDataset(): boolean {
    return this.settings.autoLoadDataset;
  }

  /**
   * Check if database should be reset on startup
   */
  shouldResetOnStartup(): boolean {
    return this.settings.resetOnStartup;
  }
}

export const settingsManager = new SettingsManager();