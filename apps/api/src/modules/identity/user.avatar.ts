// ACC-06: photo path with the version in the query — the URL changes when the photo changes,
// so the image response can be cached forever.
export const avatarPath = (userId: string, updatedAt: Date): string =>
  `/auth/users/${userId}/avatar?v=${updatedAt.getTime()}`;
