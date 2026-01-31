# Implementation Plan - Obsidian Activity Heatmap Plugin

This document provides step-by-step implementation tasks for building the plugin.

## Prerequisites

Before starting implementation:
1. Node.js 18+ installed
2. Obsidian installed for testing
3. Basic knowledge of TypeScript and Obsidian API

---

## Phase 1: Project Setup

### Task 1.1: Initialize Project Structure
Create the basic project files and configuration.

**Files to create:**
- `package.json` - NPM configuration
- `tsconfig.json` - TypeScript configuration
- `esbuild.config.mjs` - Build script
- `manifest.json` - Obsidian plugin manifest
- `.gitignore` - Git ignore rules
- `src/main.ts` - Plugin entry point
- `src/types.ts` - TypeScript interfaces
- `styles.css` - Plugin styles

**package.json content:**
```json
{
  "name": "obsidian-activity-heatmap",
  "version": "1.0.0",
  "description": "Track and visualize document activity with heatmap",
  "main": "main.js",
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "builtin-modules": "^3.3.0",
    "esbuild": "^0.17.0",
    "obsidian": "latest",
    "typescript": "^5.0.0"
  }
}
```

**manifest.json content:**
```json
{
  "id": "activity-heatmap",
  "name": "Activity Heatmap",
  "version": "1.0.0",
  "minAppVersion": "1.0.0",
  "description": "Track document open/edit frequency with heatmap visualization",
  "author": "Your Name",
  "isDesktopOnly": false
}
```

### Task 1.2: Create Type Definitions
Define all TypeScript interfaces in `src/types.ts`.

**Interfaces to define:**
- `ActivityEvent` - Single activity event
- `PluginData` - Stored data structure
- `FileMetrics` - Computed file metrics
- `FolderMetrics` - Computed folder metrics
- `TagMetrics` - Computed tag metrics
- `DailyActivity` - Daily aggregated activity
- `PluginSettings` - Configuration options
- `TimePeriod` - Time period type

### Task 1.3: Create Plugin Entry Point
Set up `src/main.ts` with basic plugin lifecycle.

**Implementation:**
- Extend `Plugin` class
- Implement `onload()` and `onunload()`
- Initialize settings with defaults
- Register view type
- Add ribbon icon to open view
- Add command to open view

---

## Phase 2: Data Layer

### Task 2.1: Implement DataStore Class
Create `src/DataStore.ts` for data persistence.

**Methods to implement:**
- `load()` - Load data from disk
- `save()` - Save data to disk (debounced)
- `addEvent(event)` - Add new activity event
- `getEvents(startTime, endTime)` - Query events by time range
- `cleanup()` - Remove events older than retention period
- `getEventCount()` - Get total event count

**Implementation notes:**
- Use `this.plugin.loadData()` and `this.plugin.saveData()`
- Debounce saves to every 5 seconds
- Run cleanup on plugin load and daily

### Task 2.2: Implement EventTracker Class
Create `src/EventTracker.ts` for capturing events.

**Events to track:**
- `workspace.on('file-open')` - File opened
- `vault.on('modify')` - File modified

**Methods to implement:**
- `start()` - Register event listeners
- `stop()` - Unregister event listeners
- `onFileOpen(file)` - Handle file open
- `onFileModify(file)` - Handle file modify
- `shouldTrackFile(file)` - Check if file should be tracked
- `shouldRecordEdit(filePath)` - Check debounce for edits

**Implementation notes:**
- Store last edit time per file in Map
- Default debounce: 30 seconds
- Only track configured file extensions
- Exclude configured folders

---

## Phase 3: Metrics Engine

### Task 3.1: Implement TagResolver Class
Create `src/TagResolver.ts` for tag extraction.

**Methods to implement:**
- `getFileTags(filePath)` - Get tags for a file
- `getFilesByTag(tag)` - Get files with a tag
- `getAllTags()` - Get all unique tags

**Implementation notes:**
- Use `this.app.metadataCache.getFileCache(file)`
- Extract from `frontmatter.tags` and `tags` arrays
- Handle both `#tag` and `tag` formats

### Task 3.2: Implement MetricsEngine Class
Create `src/MetricsEngine.ts` for metrics calculation.

**Methods to implement:**
- `getFileMetrics(period)` - Calculate file metrics
- `getFolderMetrics(period)` - Calculate folder metrics
- `getTagMetrics(period)` - Calculate tag metrics
- `getDailyActivity(period)` - Get daily activity for heatmap
- `getTimeRange(period)` - Convert period to timestamp range

**Implementation notes:**
- Cache results with invalidation on new events
- Aggregate folder metrics from child files
- Handle files that no longer exist

---

## Phase 4: User Interface

### Task 4.1: Create ActivityView Class
Create `src/ui/ActivityView.ts` as the main view.

**ItemView methods to implement:**
- `getViewType()` - Return unique view type ID
- `getDisplayText()` - Return tab title
- `getIcon()` - Return tab icon
- `onOpen()` - Render view content
- `onClose()` - Cleanup

**UI State:**
- `currentPeriod: TimePeriod` - Selected time period
- `currentMetric: 'opens' | 'edits'` - Selected metric
- `currentView: 'files' | 'folders' | 'tags'` - Selected view mode
- `sortOrder: 'asc' | 'desc'` - Sort direction

**Render methods:**
- `renderHeader()` - Render controls bar
- `renderHeatmap()` - Render heatmap component
- `renderList()` - Render file/folder/tag list
- `refresh()` - Re-render entire view

### Task 4.2: Create HeatmapCalendar Component
Create `src/ui/HeatmapCalendar.ts` for heatmap rendering.

**Methods to implement:**
- `constructor(container, data, options)` - Initialize
- `render()` - Render heatmap grid
- `getColorForValue(value)` - Map value to color
- `createTooltip(date, count)` - Create hover tooltip

**Heatmap structure:**
- 7 rows (days of week)
- Columns for weeks in period
- Color intensity based on activity level
- Tooltip showing date and exact count

**CSS classes:**
- `.heatmap-container` - Main container
- `.heatmap-cell` - Individual day cell
- `.heatmap-cell-level-0` through `.heatmap-cell-level-4` - Intensity levels
- `.heatmap-tooltip` - Hover tooltip

### Task 4.3: Create FileList Component
Create `src/ui/FileList.ts` for sortable list.

**Methods to implement:**
- `constructor(container, metrics, options)` - Initialize
- `render()` - Render list items
- `sortBy(field, order)` - Sort list
- `onItemClick(callback)` - Handle item click

**List item structure:**
- Icon (file/folder/tag)
- Name/path
- Metric value
- Click to open file

### Task 4.4: Create SettingsTab Class
Create `src/ui/SettingsTab.ts` for settings panel.

**Settings to expose:**
- Edit debounce time (slider: 10-120 seconds)
- Tracked file extensions (text input)
- Excluded folders (text input)
- Color scheme (dropdown)
- Data retention days (slider: 30-730 days)
- Clear all data button

---

## Phase 5: Styling

### Task 5.1: Create Plugin Styles
Create `styles.css` with all component styles.

**Sections:**
- View container styles
- Header/controls styles
- Heatmap styles with color schemes
- List styles
- Responsive adjustments
- Dark/light theme support

**Color schemes to implement:**
- Green (GitHub style)
- Blue
- Purple
- Orange

---

## Phase 6: Integration and Testing

### Task 6.1: Wire Up Components
Connect all components in `main.ts`.

**Integration steps:**
1. Initialize DataStore and load data
2. Initialize EventTracker and start tracking
3. Initialize TagResolver
4. Initialize MetricsEngine with dependencies
5. Register ActivityView with dependencies
6. Register SettingsTab
7. Add commands and ribbon icon

### Task 6.2: Add Commands
Register plugin commands.

**Commands:**
- `activity-heatmap:open-view` - Open activity view
- `activity-heatmap:refresh` - Refresh metrics

### Task 6.3: Testing Checklist

**Functional tests:**
- [ ] File open events are recorded
- [ ] File edit events are recorded with debounce
- [ ] Events persist across Obsidian restarts
- [ ] Metrics calculate correctly for all periods
- [ ] Folder metrics aggregate correctly
- [ ] Tag metrics work with frontmatter and inline tags
- [ ] Heatmap displays correct colors
- [ ] List sorts correctly by all metrics
- [ ] Settings save and apply correctly
- [ ] Data cleanup removes old events

**Edge case tests:**
- [ ] Empty vault (no files)
- [ ] Large vault (1000+ files)
- [ ] Files with no tags
- [ ] Deeply nested folders
- [ ] Special characters in file names
- [ ] Renamed files
- [ ] Deleted files

---

## File Creation Order

For implementation, create files in this order:

1. `package.json`
2. `tsconfig.json`
3. `esbuild.config.mjs`
4. `manifest.json`
5. `.gitignore`
6. `src/types.ts`
7. `src/DataStore.ts`
8. `src/EventTracker.ts`
9. `src/TagResolver.ts`
10. `src/MetricsEngine.ts`
11. `src/ui/HeatmapCalendar.ts`
12. `src/ui/FileList.ts`
13. `src/ui/ActivityView.ts`
14. `src/ui/SettingsTab.ts`
15. `src/main.ts`
16. `styles.css`

---

## Estimated Time

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Project Setup | 1-2 hours |
| Phase 2: Data Layer | 2-3 hours |
| Phase 3: Metrics Engine | 2-3 hours |
| Phase 4: User Interface | 4-6 hours |
| Phase 5: Styling | 1-2 hours |
| Phase 6: Integration | 2-3 hours |
| **Total** | **12-19 hours** |

---

## Next Steps

After reviewing this plan:
1. Switch to Code mode to begin implementation
2. Start with Phase 1: Project Setup
3. Test each phase before moving to the next
4. Commit changes after each completed phase
