/**
 * Project Store - Manages hierarchical event organization
 *
 * This is a separate store for projects to keep concerns separated from the main event store.
 * Projects contain a master guest list and relationships that span multiple events.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Project,
  ProjectGuest,
  ProjectGuestRelationship,
  ProjectWithSummary,
} from '@/types';

interface ProjectState {
  // Project list
  projects: ProjectWithSummary[];
  currentProjectId: string | null;

  // Current project data (loaded when viewing a project)
  projectGuests: ProjectGuest[];
  projectRelationships: ProjectGuestRelationship[];

  // Loading states
  isLoadingProjects: boolean;
  isLoadingProjectDetails: boolean;

  // Expanded projects in dashboard (for folder UI)
  expandedProjectIds: Set<string>;

  // Actions - Project Management
  setProjects: (projects: ProjectWithSummary[]) => void;
  addProject: (project: ProjectWithSummary) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  removeProject: (projectId: string) => void;
  setCurrentProject: (projectId: string | null) => void;

  // Actions - Project Guests
  setProjectGuests: (guests: ProjectGuest[]) => void;
  addProjectGuest: (guest: ProjectGuest) => void;
  updateProjectGuest: (guestId: string, updates: Partial<ProjectGuest>) => void;
  removeProjectGuest: (guestId: string) => void;

  // Actions - Project Relationships
  setProjectRelationships: (relationships: ProjectGuestRelationship[]) => void;
  addProjectRelationship: (relationship: ProjectGuestRelationship) => void;
  removeProjectRelationship: (relationshipId: string) => void;

  // Actions - UI State
  toggleProjectExpanded: (projectId: string) => void;
  setProjectExpanded: (projectId: string, expanded: boolean) => void;
  collapseAllProjects: () => void;

  // Actions - Loading States
  setLoadingProjects: (loading: boolean) => void;
  setLoadingProjectDetails: (loading: boolean) => void;

  // Computed
  getCurrentProject: () => ProjectWithSummary | null;
  getProjectById: (projectId: string) => ProjectWithSummary | undefined;
  isProjectExpanded: (projectId: string) => boolean;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      // Initial state
      projects: [],
      currentProjectId: null,
      projectGuests: [],
      projectRelationships: [],
      isLoadingProjects: false,
      isLoadingProjectDetails: false,
      expandedProjectIds: new Set<string>(),

      // Actions - Project Management
      setProjects: (projects) => set({ projects }),

      addProject: (project) =>
        set((state) => ({
          projects: [project, ...state.projects],
        })),

      updateProject: (projectId, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, ...updates } : p
          ),
        })),

      removeProject: (projectId) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== projectId),
          currentProjectId:
            state.currentProjectId === projectId ? null : state.currentProjectId,
          expandedProjectIds: new Set(
            [...state.expandedProjectIds].filter((id) => id !== projectId)
          ),
        })),

      setCurrentProject: (projectId) =>
        set({
          currentProjectId: projectId,
          // Clear project-specific data when switching
          projectGuests: projectId ? [] : get().projectGuests,
          projectRelationships: projectId ? [] : get().projectRelationships,
        }),

      // Actions - Project Guests
      setProjectGuests: (guests) => set({ projectGuests: guests }),

      addProjectGuest: (guest) =>
        set((state) => ({
          projectGuests: [...state.projectGuests, guest],
        })),

      updateProjectGuest: (guestId, updates) =>
        set((state) => ({
          projectGuests: state.projectGuests.map((g) =>
            g.id === guestId ? { ...g, ...updates } : g
          ),
        })),

      removeProjectGuest: (guestId) =>
        set((state) => ({
          projectGuests: state.projectGuests.filter((g) => g.id !== guestId),
          // Also remove relationships involving this guest
          projectRelationships: state.projectRelationships.filter(
            (r) => r.guestId !== guestId && r.relatedGuestId !== guestId
          ),
        })),

      // Actions - Project Relationships
      setProjectRelationships: (relationships) =>
        set({ projectRelationships: relationships }),

      addProjectRelationship: (relationship) =>
        set((state) => ({
          projectRelationships: [...state.projectRelationships, relationship],
        })),

      removeProjectRelationship: (relationshipId) =>
        set((state) => ({
          projectRelationships: state.projectRelationships.filter(
            (r) => r.id !== relationshipId
          ),
        })),

      // Actions - UI State
      toggleProjectExpanded: (projectId) =>
        set((state) => {
          const newExpanded = new Set(state.expandedProjectIds);
          if (newExpanded.has(projectId)) {
            newExpanded.delete(projectId);
          } else {
            newExpanded.add(projectId);
          }
          return { expandedProjectIds: newExpanded };
        }),

      setProjectExpanded: (projectId, expanded) =>
        set((state) => {
          const newExpanded = new Set(state.expandedProjectIds);
          if (expanded) {
            newExpanded.add(projectId);
          } else {
            newExpanded.delete(projectId);
          }
          return { expandedProjectIds: newExpanded };
        }),

      collapseAllProjects: () => set({ expandedProjectIds: new Set() }),

      // Actions - Loading States
      setLoadingProjects: (loading) => set({ isLoadingProjects: loading }),
      setLoadingProjectDetails: (loading) =>
        set({ isLoadingProjectDetails: loading }),

      // Computed
      getCurrentProject: () => {
        const { projects, currentProjectId } = get();
        if (!currentProjectId) return null;
        return projects.find((p) => p.id === currentProjectId) || null;
      },

      getProjectById: (projectId) => {
        return get().projects.find((p) => p.id === projectId);
      },

      isProjectExpanded: (projectId) => {
        return get().expandedProjectIds.has(projectId);
      },
    }),
    {
      name: 'seatify-projects',
      // Only persist UI state, not data (data comes from server)
      partialize: (state) => ({
        expandedProjectIds: Array.from(state.expandedProjectIds),
      }),
      // Convert array back to Set on rehydration
      merge: (persisted, current) => {
        const persistedState = persisted as { expandedProjectIds?: string[] };
        return {
          ...current,
          expandedProjectIds: new Set(persistedState?.expandedProjectIds || []),
        };
      },
    }
  )
);

// Selector hooks for common operations
export const useProjects = () => useProjectStore((state) => state.projects);
export const useCurrentProject = () =>
  useProjectStore((state) => state.getCurrentProject());
export const useProjectGuests = () =>
  useProjectStore((state) => state.projectGuests);
export const useProjectRelationships = () =>
  useProjectStore((state) => state.projectRelationships);
