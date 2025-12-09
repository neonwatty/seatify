import { useState, useMemo } from 'react';
import { getGroupColor } from './groupColors';
import './GroupLegend.css';

interface GroupInfo {
  name: string;
  key: string;
  color: string;
  count: number;
}

interface GroupLegendProps {
  guests: Array<{ group?: string }>;
  visibleGroups: Set<string> | 'all';
  onToggleGroup: (groupKey: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}

export function GroupLegend({
  guests,
  visibleGroups,
  onToggleGroup,
  onShowAll,
  onHideAll,
}: GroupLegendProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Compute groups with counts
  const groups = useMemo(() => computeGroupsWithCounts(guests), [guests]);

  if (groups.length === 0) {
    return null;
  }

  const isGroupVisible = (groupKey: string): boolean => {
    if (visibleGroups === 'all') return true;
    return visibleGroups.has(groupKey);
  };

  const allVisible =
    visibleGroups === 'all' || groups.every((g) => (visibleGroups as Set<string>).has(g.key));
  const noneVisible =
    visibleGroups !== 'all' && groups.every((g) => !(visibleGroups as Set<string>).has(g.key));

  return (
    <div className="group-legend">
      <button
        className="group-legend-header"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-expanded={!isCollapsed}
        aria-controls="group-legend-content"
      >
        <span className="group-legend-title">Groups ({groups.length})</span>
        <span className={`collapse-icon ${isCollapsed ? 'collapsed' : ''}`} aria-hidden="true">
          {isCollapsed ? '▶' : '▼'}
        </span>
      </button>

      {!isCollapsed && (
        <div id="group-legend-content" className="group-legend-content">
          <div className="legend-actions">
            <button
              className={`legend-action-btn ${allVisible ? 'disabled' : ''}`}
              onClick={onShowAll}
              disabled={allVisible}
            >
              Show All
            </button>
            <button
              className={`legend-action-btn ${noneVisible ? 'disabled' : ''}`}
              onClick={onHideAll}
              disabled={noneVisible}
            >
              Hide All
            </button>
          </div>

          <ul className="group-legend-list" role="list" aria-label="Guest groups">
            {groups.map((group) => {
              const visible = isGroupVisible(group.key);
              return (
                <li key={group.key} className="group-legend-item">
                  <label className={`legend-item-label ${!visible ? 'hidden-group' : ''}`}>
                    <input
                      type="checkbox"
                      checked={visible}
                      onChange={() => onToggleGroup(group.key)}
                      aria-label={`${visible ? 'Hide' : 'Show'} ${group.name}`}
                    />
                    <span
                      className="legend-color"
                      style={{ backgroundColor: group.color }}
                      aria-hidden="true"
                    />
                    <span className="legend-name">{group.name}</span>
                    <span className="legend-count">({group.count})</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// Helper to compute groups with counts from guests
function computeGroupsWithCounts(guests: Array<{ group?: string }>): GroupInfo[] {
  const counts = new Map<string, number>();

  guests.forEach((guest) => {
    const key = guest.group ?? '';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  const groups: GroupInfo[] = [];

  // Sort groups alphabetically, but put "Ungrouped" at the end
  const sortedKeys = Array.from(counts.keys()).sort((a, b) => {
    if (a === '') return 1;
    if (b === '') return -1;
    return a.localeCompare(b);
  });

  for (const key of sortedKeys) {
    const count = counts.get(key) ?? 0;
    groups.push({
      name: key || 'Ungrouped',
      key,
      color: key ? getGroupColor(key) ?? '#94a3b8' : '#94a3b8',
      count,
    });
  }

  return groups;
}
