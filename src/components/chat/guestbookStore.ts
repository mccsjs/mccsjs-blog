// 留言板抽屉状态（FAB 与抽屉共享）
export interface GuestbookWidgetState {
  isOpen: boolean;
}

type Listener = (state: GuestbookWidgetState) => void;

const state: GuestbookWidgetState = { isOpen: false };
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) {
    listener(state);
  }
}

export const guestbookStore = {
  getState(): GuestbookWidgetState {
    return state;
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(state);
    return () => {
      listeners.delete(listener);
    };
  },
  open() {
    if (state.isOpen) return;
    state.isOpen = true;
    emit();
  },
  close() {
    if (!state.isOpen) return;
    state.isOpen = false;
    emit();
  },
  toggle() {
    state.isOpen = !state.isOpen;
    emit();
  },
};
