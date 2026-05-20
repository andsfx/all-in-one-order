export const BUSINESS_PRESETS = [
  {
    type: 'beverage',
    label: 'Kedai Minuman',
    icon: 'Coffee',
    description: 'Untuk kedai kopi, juice bar, bubble tea, atau usaha minuman',
    categories: [
      { name: 'Coffee', sort_order: 1 },
      { name: 'Non-Coffee', sort_order: 2 },
      { name: 'Tea', sort_order: 3 },
      { name: 'Juice & Smoothie', sort_order: 4 },
    ],
    optionTemplates: [
      {
        name: 'Ukuran',
        type: 'single',
        choices: [
          { label: 'Regular', value: 'regular', price_delta: 0 },
          { label: 'Large', value: 'large', price_delta: 5000 },
        ],
      },
      {
        name: 'Tingkat Gula',
        type: 'single',
        choices: [
          { label: 'Normal', value: 'normal', price_delta: 0 },
          { label: 'Less Sugar', value: 'less', price_delta: 0 },
          { label: 'No Sugar', value: 'no_sugar', price_delta: 0 },
        ],
      },
      {
        name: 'Es',
        type: 'single',
        choices: [
          { label: 'Normal Ice', value: 'normal', price_delta: 0 },
          { label: 'Less Ice', value: 'less', price_delta: 0 },
          { label: 'No Ice', value: 'no_ice', price_delta: 0 },
        ],
      },
    ],
    starterProducts: [
      { name: 'Americano', price: 22000, category_index: 0, description: 'Espresso dengan air panas', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Americano' },
      { name: 'Cafe Latte', price: 28000, category_index: 0, description: 'Espresso dengan susu steamed', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Cafe+Latte' },
      { name: 'Cappuccino', price: 28000, category_index: 0, description: 'Espresso dengan foam susu', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Cappuccino' },
      { name: 'Matcha Latte', price: 30000, category_index: 1, description: 'Matcha premium dengan susu', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Matcha+Latte' },
      { name: 'Coklat', price: 25000, category_index: 1, description: 'Coklat hangat atau dingin', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Coklat' },
      { name: 'Teh Tarik', price: 18000, category_index: 2, description: 'Teh susu klasik', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Teh+Tarik' },
      { name: 'Mango Smoothie', price: 28000, category_index: 3, description: 'Smoothie mangga segar', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Mango+Smoothie' },
    ],
    defaultFulfillment: ['dine_in', 'takeaway'],
    defaultSettings: { allow_mixed_cart: 'false' },
  },
  {
    type: 'food',
    label: 'Restoran / Makanan',
    icon: 'UtensilsCrossed',
    description: 'Untuk restoran, warung, catering, atau usaha makanan',
    categories: [
      { name: 'Makanan Utama', sort_order: 1 },
      { name: 'Snack', sort_order: 2 },
      { name: 'Dessert', sort_order: 3 },
      { name: 'Minuman', sort_order: 4 },
    ],
    optionTemplates: [
      {
        name: 'Porsi',
        type: 'single',
        choices: [
          { label: 'Regular', value: 'regular', price_delta: 0 },
          { label: 'Large', value: 'large', price_delta: 10000 },
        ],
      },
      {
        name: 'Level Pedas',
        type: 'single',
        choices: [
          { label: 'Tidak Pedas', value: 'no_spicy', price_delta: 0 },
          { label: 'Sedang', value: 'medium', price_delta: 0 },
          { label: 'Pedas', value: 'spicy', price_delta: 0 },
          { label: 'Extra Pedas', value: 'extra_spicy', price_delta: 0 },
        ],
      },
      {
        name: 'Topping',
        type: 'multiple',
        choices: [
          { label: 'Keju', value: 'cheese', price_delta: 5000 },
          { label: 'Telur', value: 'egg', price_delta: 3000 },
          { label: 'Saus Extra', value: 'extra_sauce', price_delta: 2000 },
        ],
      },
    ],
    starterProducts: [
      { name: 'Nasi Goreng', price: 25000, category_index: 0, description: 'Nasi goreng spesial dengan telur', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Nasi+Goreng' },
      { name: 'Mie Goreng', price: 23000, category_index: 0, description: 'Mie goreng dengan sayuran', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Mie+Goreng' },
      { name: 'Ayam Bakar', price: 35000, category_index: 0, description: 'Ayam bakar dengan sambal', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Ayam+Bakar' },
      { name: 'Soto Ayam', price: 28000, category_index: 0, description: 'Soto ayam kuning dengan nasi', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Soto+Ayam' },
      { name: 'Pisang Goreng', price: 12000, category_index: 1, description: 'Pisang goreng crispy', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Pisang+Goreng' },
      { name: 'Tahu Isi', price: 15000, category_index: 1, description: 'Tahu isi sayuran', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Tahu+Isi' },
      { name: 'Es Krim', price: 18000, category_index: 2, description: 'Es krim vanilla/coklat/strawberry', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Es+Krim' },
      { name: 'Es Teh Manis', price: 8000, category_index: 3, description: 'Es teh manis segar', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Es+Teh+Manis' },
    ],
    defaultFulfillment: ['dine_in', 'takeaway', 'delivery'],
    defaultSettings: { allow_mixed_cart: 'false' },
  },
  {
    type: 'physical',
    label: 'Toko Fisik / Retail',
    icon: 'ShoppingBag',
    description: 'Untuk toko pakaian, aksesoris, elektronik, atau retail',
    categories: [
      { name: 'Pakaian', sort_order: 1 },
      { name: 'Aksesoris', sort_order: 2 },
      { name: 'Elektronik', sort_order: 3 },
    ],
    optionTemplates: [
      {
        name: 'Ukuran',
        type: 'single',
        choices: [
          { label: 'S', value: 's', price_delta: 0 },
          { label: 'M', value: 'm', price_delta: 0 },
          { label: 'L', value: 'l', price_delta: 0 },
          { label: 'XL', value: 'xl', price_delta: 0 },
        ],
      },
      {
        name: 'Warna',
        type: 'single',
        choices: [
          { label: 'Hitam', value: 'black', price_delta: 0 },
          { label: 'Putih', value: 'white', price_delta: 0 },
          { label: 'Navy', value: 'navy', price_delta: 0 },
          { label: 'Abu-abu', value: 'gray', price_delta: 0 },
        ],
      },
    ],
    starterProducts: [
      { name: 'Kaos Polos', price: 75000, category_index: 0, description: 'Kaos polos cotton combed 30s', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Kaos+Polos' },
      { name: 'Kemeja Casual', price: 150000, category_index: 0, description: 'Kemeja casual lengan panjang', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Kemeja+Casual' },
      { name: 'Celana Jeans', price: 200000, category_index: 0, description: 'Celana jeans slim fit', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Celana+Jeans' },
      { name: 'Tas Ransel', price: 180000, category_index: 1, description: 'Tas ransel laptop 14 inch', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Tas+Ransel' },
      { name: 'Dompet Kulit', price: 120000, category_index: 1, description: 'Dompet kulit asli', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Dompet+Kulit' },
      { name: 'Powerbank 10000mAh', price: 150000, category_index: 2, description: 'Powerbank fast charging', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Powerbank+10000mAh' },
    ],
    defaultFulfillment: ['delivery'],
    defaultSettings: { allow_mixed_cart: 'true' },
  },
  {
    type: 'digital',
    label: 'Produk Digital',
    icon: 'Download',
    description: 'Untuk e-book, template, software, kursus online',
    categories: [
      { name: 'E-book', sort_order: 1 },
      { name: 'Template', sort_order: 2 },
      { name: 'Software', sort_order: 3 },
      { name: 'Course', sort_order: 4 },
    ],
    optionTemplates: [
      {
        name: 'Lisensi',
        type: 'single',
        choices: [
          { label: 'Personal', value: 'personal', price_delta: 0 },
          { label: 'Commercial', value: 'commercial', price_delta: 50000 },
        ],
      },
      {
        name: 'Format',
        type: 'single',
        choices: [
          { label: 'PDF', value: 'pdf', price_delta: 0 },
          { label: 'DOCX', value: 'docx', price_delta: 0 },
          { label: 'ZIP', value: 'zip', price_delta: 0 },
        ],
      },
    ],
    starterProducts: [
      { name: 'E-book Bisnis Online', price: 99000, category_index: 0, description: 'Panduan lengkap memulai bisnis online', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=E-book+Bisnis+Online' },
      { name: 'Template Invoice', price: 49000, category_index: 1, description: 'Template invoice profesional', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Template+Invoice' },
      { name: 'Template Proposal', price: 79000, category_index: 1, description: 'Template proposal bisnis', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Template+Proposal' },
      { name: 'Plugin WordPress', price: 150000, category_index: 2, description: 'Plugin SEO optimizer', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Plugin+WordPress' },
      { name: 'Kursus Digital Marketing', price: 299000, category_index: 3, description: 'Kursus digital marketing lengkap', image_url: 'https://placehold.co/400x400/e2e8f0/64748b?text=Kursus+Digital+Marketing' },
    ],
    defaultFulfillment: ['digital'],
    defaultSettings: { allow_mixed_cart: 'true' },
  },
];

export function getPreset(type) {
  return BUSINESS_PRESETS.find(p => p.type === type);
}
