import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SidebarStore = {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  open: () => void;
};

// We keep this hook for backward compatibility but it's not used for visual sidebar anymore
export const useSidebar = create<SidebarStore>()(
  persist(
    (set) => ({
      isOpen: true,
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
      close: () => set({ isOpen: false }),
      open: () => set({ isOpen: true }),
    }),
    {
      name: 'sidebar-state',
    }
  )
);
