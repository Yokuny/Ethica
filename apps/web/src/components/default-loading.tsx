import { Skeleton } from '@ethica/ui/components/skeleton';
import { Spinner } from '@ethica/ui/components/spinner';

// Port of ../DentalEase/DentalEase/src/components/default-loading.tsx —
// named export (`export function`), not default, to keep the existing call
// sites (`import { DefaultLoading } from '...'`) compiling without
// change (Tasks T12: "same call signature").
export function DefaultLoading() {
  return (
    <Skeleton className="flex h-48 w-full items-center justify-center">
      <Spinner className="text-primary" />
    </Skeleton>
  );
}
