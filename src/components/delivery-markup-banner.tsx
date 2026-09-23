'use client';

import { useState } from 'react';
import { Truck, ChevronDown } from 'lucide-react';
import { getDeliveryMarkup } from '@/lib/delivery-markups';

function formatPrice(n: number | null): string {
  return n === null ? '—' : `$${n.toFixed(2)}`;
}

export default function DeliveryMarkupBanner({ restaurantName }: { restaurantName: string }) {
  const markup = getDeliveryMarkup(restaurantName);
  const [expanded, setExpanded] = useState(false);

  // Additive: renders nothing for restaurants without verified markup data.
  if (!markup) return null;

  return (
    <div className="px-6 pt-4">
      <div className="border border-amber-200 bg-amber-50 rounded-md p-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-2 text-left"
        >
          <Truck size={16} className="text-amber-600 shrink-0" />
          <span className="text-sm font-medium text-gray-800">
            {markup.platform} prices vs in-store
          </span>
          <span className="ml-auto text-xs text-gray-500">
            {expanded ? 'Hide' : 'Show'} item-by-item
          </span>
          <ChevronDown
            size={14}
            className={`text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
        <p className="mt-1 text-xs leading-relaxed text-gray-600">{markup.note}</p>

        {expanded && (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-amber-200">
                  <th className="py-1 pr-2 font-medium">Item</th>
                  <th className="py-1 pr-2 font-medium text-right">In-store</th>
                  <th className="py-1 pr-2 font-medium text-right">{markup.platform}</th>
                  <th className="py-1 font-medium text-right">Markup</th>
                </tr>
              </thead>
              <tbody>
                {markup.items.map((m) => (
                  <tr key={m.item} className="border-b border-amber-100 last:border-0">
                    <td className="py-1 pr-2 text-gray-700">{m.item}</td>
                    <td className="py-1 pr-2 text-right text-gray-700">{formatPrice(m.inStorePrice)}</td>
                    <td className="py-1 pr-2 text-right text-gray-700">
                      {m.deliveryPrice === null ? (
                        <span className="text-gray-400">not listed</span>
                      ) : (
                        formatPrice(m.deliveryPrice)
                      )}
                    </td>
                    <td className="py-1 text-right font-medium text-amber-700">
                      {m.markupPct === null ? '—' : `+${m.markupPct.toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-gray-400">
              Verified {markup.collectedAt}; pre-tax menu prices, before delivery fees.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
