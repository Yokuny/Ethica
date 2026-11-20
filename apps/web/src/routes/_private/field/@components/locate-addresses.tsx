import { Button } from '@ethica/ui/components/button';
import { Spinner } from '@ethica/ui/components/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@ethica/ui/components/tooltip';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPinned } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { t } from '@/lib/helpers/translate.helper.js';
import { type DayInspection, geocodeMutation } from '@/query/inspection.js';

// Addresses still without a point on the map (AD-131): geocoded one by one by the API. The spinner covers the whole
// run, not each call, so it does not blink between addresses.
export function LocateAddresses({ items }: { items: DayInspection[] }) {
  const queryClient = useQueryClient();
  const geocode = useMutation(geocodeMutation(queryClient));
  const [locating, setLocating] = useState(false);
  const withoutPoint = items.filter((item) => item.appointment.location && !item.appointment.coordinates);
  if (!withoutPoint.length && !locating) return null;

  async function locate() {
    setLocating(true);
    for (const item of withoutPoint) {
      await geocode.mutateAsync({ id: item.appointment.id }).catch((error: Error) => toast.error(error.message));
    }
    setLocating(false);
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant="outline" className="shadow-sm" disabled={locating} onClick={() => void locate()}>
            {locating ? <Spinner /> : <MapPinned />}
            {t('locate_addresses')}
          </Button>
        }
      />
      <TooltipContent>{t('locate_addresses_hint')}</TooltipContent>
    </Tooltip>
  );
}
