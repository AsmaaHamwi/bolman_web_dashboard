import { getMessages } from '../i18n';
import { useUiStore } from '../stores/useUiStore';

export function throwIfError(error: unknown) {
  if (error) {
    const rawMessage =
      typeof error === 'object' && error && 'message' in error
        ? String((error as any).message)
        : getMessages(useUiStore.getState().locale).common.unexpectedError;

    let userMessage = rawMessage;

    if (
      rawMessage.includes('payments_amount_check') ||
      rawMessage.includes('violates check constraint "payments_amount_check"')
    ) {
      userMessage =
        'فشل الحجز: سعر هذه الرحلة محدد بـ 0 ل.س. يرجى التوجه لصفحة "الرحلات" وتعديل سعر الرحلة ليكون أكبر من الصفر لتتمكن من إتمام الحجز.';
    }

    throw new Error(userMessage);
  }
}
