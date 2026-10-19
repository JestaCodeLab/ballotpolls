import { create } from 'zustand'

export interface ConfirmOptions {
  title: string
  message: string
  // Text on the red button, e.g. "Delete election".
  confirmLabel?: string
}

interface ConfirmState {
  pending: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null
  close: (ok: boolean) => void
}

export const useConfirmStore = create<ConfirmState>()((set, get) => ({
  pending: null,
  close: (ok) => {
    get().pending?.resolve(ok)
    set({ pending: null })
  },
}))

// Asks the person to confirm before something is deleted. Resolves true only if they press the red button.
//   if (!(await confirmDelete({ title: 'Delete election?', message: '…' }))) return
export const confirmDelete = (options: ConfirmOptions) =>
  new Promise<boolean>((resolve) => {
    // A second request while one is open cancels the first, so nothing is left waiting.
    useConfirmStore.getState().pending?.resolve(false)
    useConfirmStore.setState({ pending: { ...options, resolve } })
  })
