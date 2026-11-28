import { ItemDescription } from '@ethica/ui/components/item';
import { cn } from 'cn';
import type { ReactNode } from 'react';

// Label/value rows of a record (shadcnblocks/product-specs1 without the sample data), inside a `Panel` (AD-312).

export type ProductSpec = {
  label: ReactNode;
  value: ReactNode;
  // Complement under the label (badge, reason).
  description?: ReactNode;
  // Field not filled (AD-238): dimmed row, placed by the caller after the filled ones.
  muted?: boolean;
};

export function ProductSpecs({ specs }: { specs: ProductSpec[] }) {
  return (
    <table className="-my-2 w-full text-sm">
      <tbody>
        {specs.map((spec, index) => (
          <tr
            // biome-ignore lint/suspicious/noArrayIndexKey: rows without their own id
            key={index}
            className={cn('border-b last:border-0', spec.muted && 'opacity-60 [&>td]:font-normal')}
          >
            <td className="w-36 py-2 pr-4 align-top sm:w-56">
              <ItemDescription render={<div />} className="line-clamp-none">
                {spec.label}
              </ItemDescription>
              {spec.description && <div className="mt-1">{spec.description}</div>}
            </td>
            <td className="py-2 align-top font-medium whitespace-pre-wrap">{spec.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
