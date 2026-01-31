/**
 * Type definitions for Activity Heatmap Plugin
 */

/**
 * Time period options for filtering metrics
 */
export type TimePeriod = '7d' | '30d' | '90d' | 'all';

/**
 * Type of activity event
 */
export type EventType = 'open' | 'edit';

/**
 * Metric type for sorting and display
 */
export type MetricType = 'opens' | 'edits';

/**
 * View mode for the activity list
 */
export type ViewMode = 'files' | 'folders' | 'tags';

/**
 * Sort order for lists
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Color scheme options for heatmap
 */
export type ColorScheme = 'green' | 'blue' | 'purple' | 'orange';

/**
 * Single activity event recorded when a file is opened or edited
 */
export interface ActivityEvent {
    /** Unix timestamp in milliseconds */
    timestamp: number;
    /** Full path to the file relative to vault root */
    filePath: string;
    /** Type of activity */
    eventType: EventType;
}

/**
 * Data structure stored in plugin's data.json
 */
export interface PluginData {
    /** Schema version for migrations */
    version: number;
    /** Array of all activity events */
    events: ActivityEvent[];
    /** Unix timestamp of last cleanup operation */
    lastCleanup: number;
}

/**
 * Computed metrics for a single file
 */
export interface FileMetrics {
    /** Full path to the file */
    filePath: string;
    /** File name without path */
    fileName: string;
    /** Parent folder path */
    folderPath: string;
    /** Tags associated with this file */
    tags: string[];
    /** Number of times file was opened in period */
    openCount: number;
    /** Number of times file was edited in period */
    editCount: number;
    /** Unix timestamp of last open, null if never */
    lastOpened: number | null;
    /** Unix timestamp of last edit, null if never */
    lastEdited: number | null;
    /** Whether the file still exists in vault */
    exists: boolean;
}

/**
 * Computed metrics for a folder (aggregated from contained files)
 */
export interface FolderMetrics {
    /** Full path to the folder */
    folderPath: string;
    /** Folder name without path */
    folderName: string;
    /** Total opens of all files in folder */
    totalOpenCount: number;
    /** Total edits of all files in folder */
    totalEditCount: number;
    /** Number of files in folder with activity */
    fileCount: number;
}

/**
 * Computed metrics for a tag (aggregated from tagged files)
 */
export interface TagMetrics {
    /** Tag name (without #) */
    tag: string;
    /** Total opens of files with this tag */
    openCount: number;
    /** Total edits of files with this tag */
    editCount: number;
    /** Number of files with this tag */
    fileCount: number;
}

/**
 * Daily aggregated activity for heatmap display
 */
export interface DailyActivity {
    /** Date in YYYY-MM-DD format */
    date: string;
    /** Total opens on this day */
    openCount: number;
    /** Total edits on this day */
    editCount: number;
}

/**
 * Plugin settings stored in data.json
 */
export interface PluginSettings {
    /** Minimum time between edit events for same file (ms) */
    editDebounceMs: number;
    /** File extensions to track (e.g., ['.md']) */
    trackedExtensions: string[];
    /** Folder paths to exclude from tracking */
    excludedFolders: string[];
    /** Color scheme for heatmap */
    colorScheme: ColorScheme;
    /** Number of days to retain event data */
    retentionDays: number;
}

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: PluginSettings = {
    editDebounceMs: 30000,
    trackedExtensions: ['.md'],
    excludedFolders: [],
    colorScheme: 'green',
    retentionDays: 365,
};

/**
 * Default plugin data structure
 */
export const DEFAULT_DATA: PluginData = {
    version: 1,
    events: [],
    lastCleanup: 0,
};

/**
 * View type identifier for the activity view
 */
export const ACTIVITY_VIEW_TYPE = 'activity-heatmap-view';

/**
 * Color definitions for each color scheme
 */
export const COLOR_SCHEMES: Record<ColorScheme, {
    empty: string;
    levels: string[];
}> = {
    green: {
        empty: '#ebedf0',
        levels: ['#9be9a8', '#40c463', '#30a14e', '#216e39'],
    },
    blue: {
        empty: '#ebedf0',
        levels: ['#9ecae1', '#6baed6', '#3182bd', '#08519c'],
    },
    purple: {
        empty: '#ebedf0',
        levels: ['#d4b9da', '#c994c7', '#df65b0', '#980043'],
    },
    orange: {
        empty: '#ebedf0',
        levels: ['#fdbe85', '#fd8d3c', '#e6550d', '#a63603'],
    },
};

/**
 * Time period to days mapping
 */
export const PERIOD_DAYS: Record<TimePeriod, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    'all': 365, // Use retention period for 'all'
};
