# Recovery Trends Visualization: Status & Roadmap

**Version:** 1.0
**Date:** 2025-12-04
**Status:** In Development

---

## 1. Current Implementation

The initial version of the Recovery Trends visualization has been implemented within a new, scalable tabbed layout on the `/analytics` page.

### What is Implemented:

- **Tab-Based UI:** The analytics section now uses a robust, nested-route structure. The Recovery Trends chart lives in the default `trends` tab.
- **Interactive Filtering:** The chart is fully interactive. Users can filter the data by:
    - **Granularity** (Daily, Weekly, Monthly, etc.)
    - **Debt Category**
    - **Specific Portfolio**
- **Reactive Data Fetching:** The component leverages `@tanstack/react-query` to automatically re-fetch data when filters change. Each filter combination is cached independently to ensure a fast user experience.
- **D3 Chart:** A dynamic area chart visualizes the recovery rate percentage over time, based on the selected filters.
- **Hover Feedback:** Data points on the chart provide visual feedback on hover (increasing in size, changing the cursor) to indicate interactivity.

---

## 2. Known Issues

### Tooltip Not Visible

- **Problem:** Despite the hover effects firing correctly, the tooltip `div` containing detailed data for the hovered point is not appearing on the screen.
- **Investigation & Fixes Attempted:**
    - The initial implementation had a bug related to React's `useCallback` hook creating a stale closure around the `useRef` for the tooltip. This prevented the tooltip from being rendered.
    - **This was fixed** by removing the `useCallback` wrapper, ensuring the event handlers always have the correct reference to the tooltip's DOM element.
- **Current Status:** The issue persists even after the initial fix. The underlying logic appears correct, which suggests a more subtle issue.
- **Possible Causes:**
    1.  **CSS `z-index` Conflict:** Another UI element (e.g., the header, sidebar, or a parent container) may have a higher `z-index`, causing it to render on top of the tooltip.
    2.  **Positioning Context:** The tooltip's `position: absolute` style might be calculated relative to an incorrectly positioned parent, causing it to render off-screen.
    3.  **SVG Rendering:** There could be an issue where the SVG element is trapping mouse events, preventing them from bubbling up or being seen by the tooltip `div`.

---

## 3. Proposed Enhancements

Beyond fixing the tooltip, we have discussed several powerful enhancements to make the chart a true data exploration tool.

### Enhancement 1: Brushing & Range Selection

- **Concept:** Allow a user to click and drag their mouse over a section of the chart to "brush" or select a specific time range.
- **User Story:** "As a manager, I want to select the first quarter of the year on the chart to quickly filter the view and see the trend for just that period."
- **Potential Requirements:**
    - **UI:** The D3 chart would be updated to use `d3-brush`. This would render a selection rectangle as the user drags their mouse.
    - **State Management:** The component's state would need to hold the selected `startDate` and `endDate`.
    - **API/Data:** **No new API endpoint is required.** The "brush end" event would simply update the existing `startDate` and `endDate` filter state and trigger a refetch of the current `getRecoveryTrends` query.

### Enhancement 2: Modal Drill-Down on Click

- **Concept:** Allow a user to click a single data point (e.g., the point for "January 2025") to see the underlying data that comprises that metric.
- **User Story:** "As an analyst, when I see an unusual spike in recovery for a specific month, I want to click on it to see a list of the top transactions or debts that contributed to that spike."
- **Potential Requirements:**
    - **UI:**
        - A D3 `click` handler on the chart's data points.
        - A new, reusable `Modal` component that contains a `DataTable` to display the detailed records.
    - **State Management:** Local state would be needed to manage the modal's visibility and the context (e.g., the selected period like "2025-01").
    - **API/Data (New Requirement):** This feature would necessitate a **new backend capability**. The frontend would need to make a new API call to fetch the detailed data for the clicked period. Example of a required new endpoint:
        - `GET /api/v1/transactions?startDate=2025-01-01&endDate=2025-01-31&sortBy=amount&sortOrder=desc`

---

This document marks a logical stopping point. We have a functional, filterable chart with a clear plan for resolving the tooltip issue and for future enhancements.
