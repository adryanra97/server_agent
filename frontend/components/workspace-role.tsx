'use client';
import { createContext, useContext } from 'react';
import type { DemoRole } from '../lib/demo';

/** The `(workspace)` layout injects the signed-in demo role. It is guaranteed
 *  non-null inside its children because the layout gates unauthenticated
 *  visitors before rendering them. */
export const WorkspaceRoleContext = createContext<DemoRole | null>(null);

export function useWorkspaceRole(): DemoRole {
  const role = useContext(WorkspaceRoleContext);
  if (role === null) {
    throw new Error('useWorkspaceRole must be used inside the (workspace) layout');
  }
  return role;
}
