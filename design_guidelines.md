# ERP Dashboard Design Guidelines

## Design Approach
**System-Based Approach**: Using **Fluent Design** principles for this enterprise application, emphasizing productivity, data clarity, and professional aesthetics suitable for business users.

## Core Design Elements

### A. Color Palette
**Primary Colors:**
- Primary Blue: 220 85% 45% (professional, trustworthy)
- Secondary Blue: 220 70% 35% (darker accent)

**Status Colors:**
- Success Green: 142 71% 45% (completed jobs, positive metrics)
- Warning Orange: 38 92% 55% (15-30 day receivables)
- Error Red: 0 75% 55% (30+ day receivables, alerts)
- Info Blue: 210 85% 60% (notifications, general info)

**Neutral Palette:**
- Background: 220 15% 97% (light mode), 220 15% 8% (dark mode)
- Surface: Pure white (light), 220 15% 12% (dark)
- Text Primary: 220 15% 15% (light), 220 15% 90% (dark)
- Text Secondary: 220 10% 45% (light), 220 10% 65% (dark)
- Border: 220 15% 85% (light), 220 15% 20% (dark)

### B. Typography
- **Primary Font**: Inter (Google Fonts)
- **Fallback**: system-ui, sans-serif
- **Sizes**: text-xs to text-4xl for hierarchical content
- **Weights**: font-normal (400), font-medium (500), font-semibold (600)

### C. Layout System
**Spacing Units**: Consistent use of Tailwind units 2, 4, 6, 8, 12, 16
- Cards: p-6, gap-4
- Sections: p-8, mb-8
- Component spacing: space-y-4, gap-6

### D. Component Library

**Dashboard Cards:**
- Elevated cards with subtle shadows
- Metric cards featuring large numbers, trend indicators
- Consistent padding and spacing
- Status badges for receivables aging

**Navigation:**
- Collapsible sidebar (w-64 expanded, w-16 collapsed)
- Clean navigation items with icons
- Active state highlighting
- Company logo placement (top-left, 40px height)

**Data Visualization:**
- Chart.js for bar graphs (sales trends, P&L)
- Color-coded aging indicators (green/orange/red)
- Clean, minimal chart styling
- Responsive chart containers

**Forms & Inputs:**
- Consistent input styling with proper focus states
- Form validation feedback
- Professional button styles

**Navigation Bar:**
- Welcome message: "Welcome, Mr. [User]" with current date
- Notification bell icon (top-right)
- User avatar/profile section
- Breadcrumb navigation for sub-pages

### E. Animations
Minimal, purposeful animations:
- Sidebar toggle transition (300ms ease)
- Card hover states (subtle elevation)
- Chart loading animations (Chart.js defaults)
- No distracting or excessive motion

## Key Design Principles
1. **Data Clarity**: Information hierarchy with clear visual separation
2. **Professional Aesthetics**: Clean, business-appropriate styling
3. **Responsive Design**: Optimized for desktop/tablet business use
4. **Accessibility**: Proper contrast ratios, keyboard navigation
5. **Consistency**: Unified spacing, colors, and interaction patterns

## Images
No hero images required. The design focuses on:
- Company logo (40px height, top-left navigation)
- User avatars in navigation
- Chart visualizations as primary visual elements
- Icon library: Heroicons for consistent iconography

This creates a professional, data-focused ERP interface that prioritizes usability and clear information presentation for business users.