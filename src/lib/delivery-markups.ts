// Delivery markup data: verified in-store vs delivery-platform price pairs.
//
// Only restaurants listed here show markup info in the UI. Every number below
// was verified against the in-store menu and the delivery listing — never add
// estimated or guessed markups.

export interface DeliveryMarkupItem {
  item: string;
  inStorePrice: number;
  deliveryPrice: number | null; // null = not listed on the delivery platform
  markupPct: number | null; // vs the in-store price, as a percentage
}

export interface DeliveryMarkup {
  platform: string;
  collectedAt: string;
  note: string;
  items: DeliveryMarkupItem[];
}

interface DeliveryMarkupEntry {
  matchKeys: string[]; // lowercase substrings matched against the restaurant name
  data: DeliveryMarkup;
}

const MARKUPS: DeliveryMarkupEntry[] = [
  {
    // Dosa Confessions, Milpitas — in-store menu photo vs DoorDash listings,
    // collected 2026-09-20. Prices are pre-tax menu prices; DoorDash's own
    // service/delivery fees sit on top of these.
    matchKeys: ['dosa confessions'],
    data: {
      platform: 'DoorDash',
      collectedAt: '2026-09-20',
      note: 'DoorDash menu prices run about 30–38% above in-store prices (Pulihora Dosa is the outlier at +45.5%). Ordering direct saves roughly a third on the food alone, before DoorDash fees.',
      items: [
        // Kid's menu
        { item: "Kid's Chocolate Dosa", inStorePrice: 7.99, deliveryPrice: 10.99, markupPct: 37.5 },
        { item: "Kid's Cheesy Dosa", inStorePrice: 8.99, deliveryPrice: 11.99, markupPct: 33.4 },
        // Idli's
        { item: 'Plain Idli', inStorePrice: 6.99, deliveryPrice: 9.49, markupPct: 35.8 },
        { item: 'Fried Idli', inStorePrice: 7.99, deliveryPrice: 10.99, markupPct: 37.5 },
        { item: 'Ghee Idli', inStorePrice: 7.99, deliveryPrice: 10.99, markupPct: 37.5 },
        { item: 'Ghee Podi Idli', inStorePrice: 7.99, deliveryPrice: 10.99, markupPct: 37.5 },
        { item: 'Sambar Idli', inStorePrice: 7.99, deliveryPrice: 10.99, markupPct: 37.5 },
        { item: 'Tawa Idli', inStorePrice: 7.99, deliveryPrice: 10.99, markupPct: 37.5 },
        { item: 'Karvepaku Karam Idli', inStorePrice: 7.99, deliveryPrice: 10.99, markupPct: 37.5 },
        { item: 'Kobbari Podi Idli', inStorePrice: 7.99, deliveryPrice: 10.99, markupPct: 37.5 },
        { item: 'Nalla Kaaram Idli', inStorePrice: 7.99, deliveryPrice: 10.99, markupPct: 37.5 },
        // Dosa's
        { item: 'Plain Dosa', inStorePrice: 8.99, deliveryPrice: 11.99, markupPct: 33.4 },
        { item: 'Ghee Roast Dosa', inStorePrice: 9.99, deliveryPrice: 13.49, markupPct: 35.0 },
        { item: 'Onion Chilli Dosa', inStorePrice: 9.99, deliveryPrice: 13.49, markupPct: 35.0 },
        { item: 'Onion Dosa', inStorePrice: 9.99, deliveryPrice: 13.49, markupPct: 35.0 },
        { item: 'Set Dosa', inStorePrice: 9.99, deliveryPrice: 13.49, markupPct: 35.0 },
        { item: 'Ghee Podi Dosa', inStorePrice: 10.99, deliveryPrice: 14.99, markupPct: 36.4 },
        { item: 'Guntur Ghee Karam Dosa', inStorePrice: 10.99, deliveryPrice: 14.99, markupPct: 36.4 },
        { item: 'Onion Chilli Pesarattu', inStorePrice: 10.99, deliveryPrice: 14.99, markupPct: 36.4 },
        { item: 'Pulihora Dosa', inStorePrice: 10.99, deliveryPrice: 15.99, markupPct: 45.5 },
        { item: 'Upma Dosa', inStorePrice: 10.99, deliveryPrice: 14.99, markupPct: 36.4 },
        { item: 'Masala Dosa', inStorePrice: 10.99, deliveryPrice: 14.99, markupPct: 36.4 },
        { item: 'Mysore Masala Dosa', inStorePrice: 10.99, deliveryPrice: 14.99, markupPct: 36.4 },
        { item: 'Teenmar Dosa', inStorePrice: 11.99, deliveryPrice: 15.99, markupPct: 33.4 },
        { item: 'Upma Pesarattu', inStorePrice: 11.99, deliveryPrice: 15.99, markupPct: 33.4 },
        { item: 'Bezawada Paneer Dosa', inStorePrice: 11.99, deliveryPrice: 15.99, markupPct: 33.4 },
        { item: 'Hyderabadi Bandi Dosa', inStorePrice: 11.99, deliveryPrice: 15.99, markupPct: 33.4 },
        { item: 'Kurnool Karam Dosa', inStorePrice: 11.99, deliveryPrice: 15.99, markupPct: 33.4 },
        { item: 'Pizza Dosa', inStorePrice: 12.99, deliveryPrice: 17.49, markupPct: 34.6 },
        // Snacks & street food
        { item: 'Samosa (2)', inStorePrice: 4.99, deliveryPrice: 6.49, markupPct: 30.1 },
        { item: 'Onion Samosa (4)', inStorePrice: 5.99, deliveryPrice: 7.99, markupPct: 33.4 },
        { item: 'Punugulu', inStorePrice: 6.99, deliveryPrice: 9.49, markupPct: 35.8 },
        { item: 'Cut Mirchi', inStorePrice: 6.99, deliveryPrice: 9.49, markupPct: 35.8 },
        { item: 'Mirchi Bajji (3)', inStorePrice: 6.99, deliveryPrice: 9.49, markupPct: 35.8 },
        { item: 'Onion Pakoda', inStorePrice: 6.99, deliveryPrice: 9.49, markupPct: 35.8 },
        { item: 'Stuffed Mirchi (3)', inStorePrice: 7.99, deliveryPrice: 10.99, markupPct: 37.5 },
        { item: 'Gobi 65', inStorePrice: 7.99, deliveryPrice: null, markupPct: null },
        // Chat corner
        { item: 'Muntha Masala', inStorePrice: 6.99, deliveryPrice: 9.49, markupPct: 35.8 },
        { item: 'Banana Bajji Masala', inStorePrice: 7.99, deliveryPrice: 10.99, markupPct: 37.5 },
        { item: 'Bandi Bajji Masala', inStorePrice: 7.99, deliveryPrice: 10.99, markupPct: 37.5 },
        { item: 'Tomato Bajji Masala', inStorePrice: 8.99, deliveryPrice: 11.99, markupPct: 33.4 },
        // Fresh & fruity
        { item: 'Mango Lassi', inStorePrice: 3.99, deliveryPrice: 5.49, markupPct: 37.6 },
        { item: 'Chikoo Shake', inStorePrice: 4.99, deliveryPrice: null, markupPct: null },
        { item: 'Mohabbat Ka Sharbat', inStorePrice: 4.99, deliveryPrice: null, markupPct: null },
        { item: 'Sithaphal Shake', inStorePrice: 5.99, deliveryPrice: null, markupPct: null },
      ],
    },
  },
];

export function getDeliveryMarkup(restaurantName: string): DeliveryMarkup | null {
  const name = restaurantName.toLowerCase();
  const entry = MARKUPS.find((e) => e.matchKeys.some((k) => name.includes(k)));
  return entry ? entry.data : null;
}
