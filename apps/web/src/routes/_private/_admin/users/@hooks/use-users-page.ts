import { useQuery } from '@tanstack/react-query';
import { userDirectoryQuery } from '../@query/user-directory.js';

export function useUsersPage() {
  const query = useQuery(userDirectoryQuery);
  return { query };
}
