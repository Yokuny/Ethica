import { ItemTitle } from '@ethica/ui/components/item';
import { Link } from '@tanstack/react-router';

// Ethica mark of the public pages: the app icon and the name, back to the start.
export function Brand() {
  return (
    <Link to="/" className="flex w-fit items-center gap-2">
      <img src="/favicon.svg" alt="" className="size-8" />
      <ItemTitle className="text-lg font-semibold">Ethica</ItemTitle>
    </Link>
  );
}
