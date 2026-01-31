# Activity Heatmap Plugin for Obsidian

Track and visualize your document activity in Obsidian with a GitHub-style heatmap.

![Activity Heatmap Screenshot](screenshot.png)

## Features

- **Track Document Opens**: Automatically records when you open files
- **Track Document Edits**: Records file modifications with configurable debouncing
- **Heatmap Visualization**: GitHub-style calendar heatmap showing your activity patterns
- **Multiple Views**:
  - **Files**: See activity metrics for individual files
  - **Folders**: Aggregated metrics for folders
  - **Tags**: Activity grouped by document tags
- **Time Periods**: Filter by 7 days, 30 days, 90 days, or all time
- **Sortable Lists**: Sort by opens or edits, ascending or descending
- **Customizable**:
  - Multiple color schemes (green, blue, purple, orange)
  - Configurable edit debounce time
  - Exclude specific folders
  - Track specific file extensions
  - Adjustable data retention period

## Installation

### From Obsidian Community Plugins

1. Open Obsidian Settings
2. Go to Community Plugins
3. Search for "Activity Heatmap"
4. Click Install, then Enable

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create a folder `activity-heatmap` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into this folder
4. Restart Obsidian and enable the plugin in Settings → Community Plugins

## Usage

### Opening the Activity View

- Click the bar chart icon in the left ribbon
- Or use the command palette: "Open Activity Heatmap"

### Understanding the View

1. **Controls Bar**: Select time period, metric type (opens/edits), and view mode (files/folders/tags)
2. **Statistics**: Quick summary of total opens, edits, unique files, and active days
3. **Heatmap Calendar**: Visual representation of daily activity
   - Hover over cells to see exact counts
   - Darker colors indicate more activity
4. **Activity List**: Sortable list of files/folders/tags with their metrics
   - Click on a file to open it
   - Deleted files are shown with strikethrough

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Edit debounce time | Minimum seconds between edit events for same file | 30 |
| Tracked extensions | File types to track (comma-separated) | .md |
| Excluded folders | Folders to ignore (comma-separated) | - |
| Color scheme | Heatmap color theme | Green |
| Data retention | Days to keep activity data | 365 |

## Data Storage

Activity data is stored in your vault's `.obsidian/plugins/activity-heatmap/data.json`. This file contains:
- All recorded activity events
- Plugin settings

Data older than the retention period is automatically cleaned up.

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/your-username/obsidian-activity-heatmap.git
cd obsidian-activity-heatmap

# Install dependencies
npm install

# Build for development (with watch mode)
npm run dev

# Build for production
npm run build
```

### Project Structure

```
src/
├── main.ts              # Plugin entry point
├── types.ts             # TypeScript interfaces
├── DataStore.ts         # Data persistence
├── EventTracker.ts      # Event capture
├── TagResolver.ts       # Tag extraction
├── MetricsEngine.ts     # Metrics calculation
└── ui/
    ├── ActivityView.ts  # Main view
    ├── HeatmapCalendar.ts
    ├── FileList.ts
    └── SettingsTab.ts
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

If you find this plugin useful, consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs or suggesting features
- 💝 Supporting development

## Changelog

### 1.0.0
- Initial release
- File open and edit tracking
- Heatmap calendar visualization
- File, folder, and tag views
- Customizable settings
