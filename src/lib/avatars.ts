/**
 * Avatar filenames in public/avatars are zero-padded: avatar-01.png, avatar-04.png, etc.
 * Normalize avatar_id (e.g. "avatar-4") to match filenames ("avatar-04").
 */
export function avatarImagePath(avatarId: string | null | undefined): string | null {
  if (!avatarId || typeof avatarId !== 'string') return null;
  const match = avatarId.match(/^avatar-(\d+)$/i);
  if (match) {
    const num = match[1].padStart(2, '0');
    return `/avatars/avatar-${num}.png`;
  }
  return `/avatars/${avatarId}.png`;
}

/** Normalize avatar_id for storage (e.g. "avatar-4" → "avatar-04"). */
export function normalizeAvatarId(avatarId: string | null | undefined): string | null {
  if (!avatarId || typeof avatarId !== 'string') return null;
  const trimmed = avatarId.trim();
  const match = trimmed.match(/^avatar-(\d+)$/i);
  if (match) return `avatar-${match[1].padStart(2, '0')}`;
  return trimmed || null;
}
