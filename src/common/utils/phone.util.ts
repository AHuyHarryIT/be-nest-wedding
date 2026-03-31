export function normalizeVietnamesePhoneNumber(phoneNumber: string): string {
  const trimmed = phoneNumber.trim();
  const compact = trimmed.replace(/[\s\-().]/g, '');

  if (compact.startsWith('+84')) {
    return `0${compact.slice(3)}`;
  }

  if (compact.startsWith('84')) {
    return `0${compact.slice(2)}`;
  }

  return compact;
}
