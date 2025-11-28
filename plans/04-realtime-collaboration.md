# Real-time Collaboration - Implementation Plan

## Overview and Goals

Add real-time collaboration so multiple users (e.g., wedding planner + couple, or event team members) can view and edit the seating arrangement simultaneously.

### Key Goals
1. Implement real-time sync architecture
2. Handle conflict resolution for simultaneous edits
3. Show presence indicators (who's viewing/editing)
4. Display collaborator cursor positions
5. Manage sessions/rooms for events
6. Support offline with sync recovery

---

## Architecture Comparison

### Option 1: Yjs (CRDT-based)

| Aspect | Details |
|--------|---------|
| **Pros** | Fully open-source, no vendor lock-in, offline-first, excellent conflict resolution via CRDTs |
| **Cons** | Requires signaling/sync server, more complex setup |
| **Cost** | Library: Free, Infrastructure: $5-20/month |

### Option 2: Liveblocks

| Aspect | Details |
|--------|---------|
| **Pros** | Managed service, React-first API, built-in presence/cursors, works with Zustand |
| **Cons** | Vendor lock-in, free tier limited (250 MAU) |
| **Cost** | Free: 250 MAU, Starter: $99/mo, Pro: $299/mo |

### Option 3: Firebase

| Aspect | Details |
|--------|---------|
| **Pros** | Well-documented, offline support, auth built-in |
| **Cons** | No built-in cursors, last-write-wins conflicts, requires data restructuring |
| **Cost** | Free tier: 50K reads/day |

---

## Recommended Approach: Yjs + y-websocket

**Justification:**
1. **No vendor lock-in** - Critical for open-source-style project
2. **True offline-first** - Essential for venues without reliable internet
3. **CRDT conflict resolution** - Perfect for concurrent table/guest edits
4. **Cost-effective** - One-time infrastructure setup vs. ongoing SaaS fees

---

## CRDT Explanation

### What is a CRDT?
Conflict-free Replicated Data Types are data structures that can be replicated across nodes, updated independently, and always converge to the same state.

### Why CRDTs for Seating?

**Scenario:** Planner moves Guest A to Table 3 while couple moves Guest A to Table 5.

- **Without CRDTs:** One change lost based on timestamp
- **With CRDTs:** Both operations preserved, deterministic merge

### Yjs Data Structures

```typescript
// Y.Map for Event (root document)
const yEvent = doc.getMap('event')

// Y.Array for tables/guests (nested)
const yTables = yEvent.get('tables') as Y.Array<Y.Map<any>>
const yGuests = yEvent.get('guests') as Y.Array<Y.Map<any>>
```

---

## Implementation Steps

### Phase 1: Core Infrastructure

#### Step 1.1: Install Dependencies
```bash
npm install yjs y-websocket y-indexeddb
```

#### Step 1.2: Create Yjs Provider
**File:** `src/collaboration/yjsProvider.ts`

```typescript
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'

export function createCollaborationProvider(config: CollaborationConfig) {
  const doc = new Y.Doc()

  // Offline persistence
  const indexeddbProvider = new IndexeddbPersistence(config.roomId, doc)

  // WebSocket sync
  const websocketProvider = new WebsocketProvider(
    'wss://your-server.com',
    config.roomId,
    doc
  )

  // User awareness (presence)
  websocketProvider.awareness.setLocalState({
    user: { name: config.username, color: config.userColor },
    cursor: null
  })

  return { doc, websocketProvider, indexeddbProvider, awareness: websocketProvider.awareness }
}
```

#### Step 1.3: Create Collaborative Store
**File:** `src/store/useCollaborativeStore.ts`

```typescript
interface CollaborativeState extends AppState {
  isConnected: boolean;
  roomId: string | null;
  collaborators: Collaborator[];
  cursors: Map<string, CursorPosition>;

  joinRoom: (roomId: string, username: string) => void;
  leaveRoom: () => void;
  updateCursor: (position: { x: number, y: number } | null) => void;
}
```

### Phase 2: Session/Room Management

#### Step 2.1: Room Types
**File:** `src/types/collaboration.ts`

```typescript
export interface Room {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  eventId: string;
}

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  isOnline: boolean;
}

export interface CursorPosition {
  x: number;
  y: number;
  userId: string;
}
```

#### Step 2.2: Room Modal
**File:** `src/components/CollaborationModal.tsx`
- Create new room (generates shareable link)
- Join existing room via link/code
- Set username before joining

### Phase 3: UI Components

#### Collaboration Button in Header
```tsx
<div className="collaboration-controls">
  {isConnected ? (
    <>
      <div className="connection-status connected" />
      <CollaboratorAvatars collaborators={collaborators} />
      <button onClick={showShareModal}>Share</button>
    </>
  ) : (
    <button onClick={showJoinModal}>Collaborate</button>
  )}
</div>
```

#### Collaborator Avatars
**File:** `src/components/CollaboratorAvatars.tsx`

#### Remote Cursors
**File:** `src/components/RemoteCursors.tsx`

```tsx
export function RemoteCursors() {
  const cursors = useCollaborativeStore(state => state.cursors)
  const collaborators = useCollaborativeStore(state => state.collaborators)

  return (
    <div className="remote-cursors">
      {Array.from(cursors.entries()).map(([userId, position]) => {
        const user = collaborators.find(c => c.id === userId)
        return (
          <div key={userId} className="remote-cursor" style={{ left: position.x, top: position.y }}>
            <svg viewBox="0 0 24 24">
              <path d="M5 3l14 9-6 2-3 6-5-17z" fill={user?.color} />
            </svg>
            <span className="cursor-label">{user?.name}</span>
          </div>
        )
      })}
    </div>
  )
}
```

#### Edit Indicators on Tables
Show who is currently editing/selecting a table in `Table.tsx`

### Phase 4: Conflict Resolution

All store actions update local Yjs doc immediately (optimistic), Yjs syncs automatically.

```typescript
moveTable: (id, x, y) => {
  const yTables = yEvent.get('tables')
  const yTable = yTables.find(t => t.get('id') === id)

  doc.transact(() => {
    yTable.set('x', x)
    yTable.set('y', y)
  })
}
```

### Phase 5: Offline Support

#### Connection State
```typescript
provider.on('status', ({ status }) => {
  store.setState({ isConnected: status === 'connected' })
})

provider.on('sync', (isSynced) => {
  store.setState({ isSynced })
})
```

#### Sync Status UI
**File:** `src/components/SyncStatus.tsx`

```tsx
export function SyncStatus() {
  const { isConnected, pendingChanges } = useCollaborativeStore()

  if (!isConnected && pendingChanges > 0) {
    return <div className="sync-status warning">{pendingChanges} changes pending</div>
  }
  return null
}
```

### Phase 6: Server Infrastructure

#### y-websocket Server
**File:** `server/index.js`

```javascript
const WebSocket = require('ws')
const { setupWSConnection } = require('y-websocket/bin/utils')

const wss = new WebSocket.Server({ port: 1234 })
wss.on('connection', (ws, req) => setupWSConnection(ws, req))
```

#### Deployment Options
1. **Fly.io** - Recommended for simplicity
2. **Cloudflare Durable Objects** - For global scale
3. **Railway/Render** - Simple PaaS

---

## Cost Considerations

### Yjs (Self-Hosted)

| Item | Monthly Cost |
|------|--------------|
| y-websocket server (Fly.io) | $5-10 |
| Domain (optional) | $1 |
| **Total** | **$6-11/month** |

### Liveblocks Alternative

| Users/Month | Cost |
|-------------|------|
| 0-250 | Free |
| 251-2,500 | $99 |
| 2,501-10,000 | $299 |

---

## Estimated Complexity

| Phase | Effort | Complexity |
|-------|--------|------------|
| Phase 1: Core Infrastructure | 3-4 days | High |
| Phase 2: Session Management | 2 days | Medium |
| Phase 3: UI Components | 3-4 days | Medium |
| Phase 4: Conflict Resolution | 2-3 days | High |
| Phase 5: Offline Support | 2 days | Medium |
| Phase 6: Server Setup | 1 day | Low |
| **Total** | **13-16 days** | |

---

## File Structure

```
src/
├── collaboration/
│   ├── yjsProvider.ts           # Yjs document and WebSocket
│   ├── collaborativeStore.ts    # Yjs <-> Zustand binding
│   ├── undoManager.ts           # Collaborative undo/redo
│   └── roomManager.ts           # Room creation/joining
├── components/
│   ├── CollaborationModal.tsx   # Join/create room UI
│   ├── CollaboratorAvatars.tsx  # Presence indicators
│   ├── RemoteCursors.tsx        # Live cursor display
│   ├── SyncStatus.tsx           # Connection status
│   └── ShareLink.tsx            # Shareable link generation
├── store/
│   └── useCollaborativeStore.ts # Collaborative store
├── types/
│   └── collaboration.ts         # Collaboration types
└── hooks/
    ├── useCollaboration.ts      # High-level collaboration hook
    └── usePresence.ts           # Presence/cursor tracking
server/
├── index.js                     # y-websocket server
└── package.json
```

---

## Migration Strategy

1. Implement alongside existing localStorage store
2. Feature flag to enable collaboration mode
3. When user creates/joins room, switch to collaborative store
4. Keep localStorage as offline fallback
