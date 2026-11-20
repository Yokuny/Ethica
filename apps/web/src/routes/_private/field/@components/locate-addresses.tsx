import { Button } from '@ethica/ui/components/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPinned } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '@/lib/helpers/translate.helper.js';
import { type DayInspection, geocodeMutation } from '@/query/inspection.js';

// Addresses still without a point on the map (AD-131): geocoded one by one by the API.
export function LocateAddresses({ items }: { items: DayInspection[] }) {
  const queryClient = useQueryClient();
  const geocode = useMutation(geocodeMutation(queryClient));
  const withoutPoint = items.filter((item) => item.appointment.location && !item.appointment.coordinates);
  if (!withoutPoint.length) return null;

  async function locate() {
    for (const item of withoutPoint) {
      await geocode.mutateAsync({ id: item.appointment.id }).catch((error: Error) => toast.error(error.message));
    }
  }

  return (
    <Button variant="outline" disabled={geocode.isPending} onClick={() => void locate()}>
      <MapPinned />
      {t('locate_addresses')} ({withoutPoint.length})
    </Button>
  );
}
