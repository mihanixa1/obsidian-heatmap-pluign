import { App, PluginSettingTab, Setting } from 'obsidian';
import { PluginSettings, ColorScheme, DEFAULT_SETTINGS } from '../types';
import type ActivityHeatmapPlugin from '../main';

/**
 * SettingsTab provides the settings UI for the plugin.
 */
export class SettingsTab extends PluginSettingTab {
    plugin: ActivityHeatmapPlugin;

    constructor(app: App, plugin: ActivityHeatmapPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Activity Heatmap Settings' });

        // Edit debounce time
        new Setting(containerEl)
            .setName('Edit debounce time')
            .setDesc('Minimum time (in seconds) between recording edit events for the same file. This prevents excessive logging during active editing.')
            .addSlider((slider) =>
                slider
                    .setLimits(10, 120, 5)
                    .setValue(this.plugin.settings.editDebounceMs / 1000)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.editDebounceMs = value * 1000;
                        await this.plugin.saveSettings();
                    })
            );

        // Tracked file extensions
        new Setting(containerEl)
            .setName('Tracked file extensions')
            .setDesc('Comma-separated list of file extensions to track (e.g., .md, .txt)')
            .addText((text) =>
                text
                    .setPlaceholder('.md')
                    .setValue(this.plugin.settings.trackedExtensions.join(', '))
                    .onChange(async (value) => {
                        this.plugin.settings.trackedExtensions = value
                            .split(',')
                            .map((ext) => ext.trim())
                            .filter((ext) => ext.length > 0);
                        await this.plugin.saveSettings();
                    })
            );

        // Excluded folders
        new Setting(containerEl)
            .setName('Excluded folders')
            .setDesc('Comma-separated list of folder paths to exclude from tracking')
            .addText((text) =>
                text
                    .setPlaceholder('templates, archive')
                    .setValue(this.plugin.settings.excludedFolders.join(', '))
                    .onChange(async (value) => {
                        this.plugin.settings.excludedFolders = value
                            .split(',')
                            .map((folder) => folder.trim())
                            .filter((folder) => folder.length > 0);
                        await this.plugin.saveSettings();
                    })
            );

        // Color scheme
        new Setting(containerEl)
            .setName('Heatmap color scheme')
            .setDesc('Choose the color scheme for the activity heatmap')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption('green', 'Green (GitHub style)')
                    .addOption('blue', 'Blue')
                    .addOption('purple', 'Purple')
                    .addOption('orange', 'Orange')
                    .setValue(this.plugin.settings.colorScheme)
                    .onChange(async (value) => {
                        this.plugin.settings.colorScheme = value as ColorScheme;
                        await this.plugin.saveSettings();
                    })
            );

        // Data retention
        new Setting(containerEl)
            .setName('Data retention period')
            .setDesc('Number of days to keep activity data. Older data will be automatically deleted.')
            .addSlider((slider) =>
                slider
                    .setLimits(30, 730, 30)
                    .setValue(this.plugin.settings.retentionDays)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.retentionDays = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Data management section
        containerEl.createEl('h3', { text: 'Data Management' });

        // Show data stats
        const eventCount = this.plugin.getEventCount();
        new Setting(containerEl)
            .setName('Stored events')
            .setDesc(`Currently storing ${eventCount} activity events`);

        // Clear all data
        new Setting(containerEl)
            .setName('Clear all data')
            .setDesc('Delete all stored activity data. This action cannot be undone.')
            .addButton((button) =>
                button
                    .setButtonText('Clear Data')
                    .setWarning()
                    .onClick(async () => {
                        const confirmed = confirm(
                            'Are you sure you want to delete all activity data? This action cannot be undone.'
                        );
                        if (confirmed) {
                            this.plugin.clearAllData();
                            this.display(); // Refresh to show updated count
                        }
                    })
            );

        // Reset settings
        new Setting(containerEl)
            .setName('Reset settings')
            .setDesc('Reset all settings to their default values')
            .addButton((button) =>
                button
                    .setButtonText('Reset Settings')
                    .onClick(async () => {
                        const confirmed = confirm(
                            'Are you sure you want to reset all settings to defaults?'
                        );
                        if (confirmed) {
                            this.plugin.settings = { ...DEFAULT_SETTINGS };
                            await this.plugin.saveSettings();
                            this.display(); // Refresh to show updated values
                        }
                    })
            );
    }
}
