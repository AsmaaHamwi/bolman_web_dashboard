import { getMessages } from '../i18n';
import { useUiStore } from '../stores/useUiStore';

export function throwIfError(error: unknown) {
  if (error) {
    const message =
      typeof error === 'object' && error && 'message' in error
        ? String((error as any).message)
        : getMessages(useUiStore.getState().locale).common.unexpectedError;

    throw new Error(message);
  }
}
