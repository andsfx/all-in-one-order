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
      { name: 'Americano', price: 22000, category_index: 0, description: 'Espresso dengan air panas' },
      { name: 'Cafe Latte', price: 28000, category_index: 0, description: 'Espresso dengan susu steamed' },
      { name: 'Cappuccino', price: 28000, category_index: 0, description: 'Espresso dengan foam susu' },
      { name: 'Matcha Latte', price: 30000, category_index: 1, description: 'Matcha premium dengan susu' },
      { name: 'Coklat', price: 25000, category_index: 1, description: 'Coklat hangat atau dingin' },
      { name: 'Teh Tarik', price: 18000, category_index: 2, description: 'Teh susu klasik' },
      { name: 'Mango Smoothie', price: 28000, category_index: 3, description: 'Smoothie mangga segar' },
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
      { name: 'Nasi Goreng', price: 25000, category_index: 0, description: 'Nasi goreng spesial dengan telur' },
      { name: 'Mie Goreng', price: 23000, category_index: 0, description: 'Mie goreng dengan sayuran' },
      { name: 'Ayam Bakar', price: 35000, category_index: 0, description: 'Ayam bakar dengan sambal' },
      { name: 'Soto Ayam', price: 28000, category_index: 0, description: 'Soto ayam kuning dengan nasi' },
      { name: 'Pisang Goreng', price: 12000, category_index: 1, description: 'Pisang goreng crispy' },
      { name: 'Tahu Isi', price: 15000, category_index: 1, description: 'Tahu isi sayuran' },
      { name: 'Es Krim', price: 18000, category_index: 2, description: 'Es krim vanilla/coklat/strawberry' },
      { name: 'Es Teh Manis', price: 8000, category_index: 3, description: 'Es teh manis segar' },
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
      { name: 'Kaos Polos', price: 75000, category_index: 0, description: 'Kaos polos cotton combed 30s' },
      { name: 'Kemeja Casual', price: 150000, category_index: 0, description: 'Kemeja casual lengan panjang' },
      { name: 'Celana Jeans', price: 200000, category_index: 0, description: 'Celana jeans slim fit' },
      { name: 'Tas Ransel', price: 180000, category_index: 1, description: 'Tas ransel laptop 14 inch' },
      { name: 'Dompet Kulit', price: 120000, category_index: 1, description: 'Dompet kulit asli' },
      { name: 'Powerbank 10000mAh', price: 150000, category_index: 2, description: 'Powerbank fast charging' },
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
      { name: 'E-book Bisnis Online', price: 99000, category_index: 0, description: 'Panduan lengkap memulai bisnis online' },
      { name: 'Template Invoice', price: 49000, category_index: 1, description: 'Template invoice profesional' },
      { name: 'Template Proposal', price: 79000, category_index: 1, description: 'Template proposal bisnis' },
      { name: 'Plugin WordPress', price: 150000, category_index: 2, description: 'Plugin SEO optimizer' },
      { name: 'Kursus Digital Marketing', price: 299000, category_index: 3, description: 'Kursus digital marketing lengkap' },
    ],
    defaultFulfillment: ['digital'],
    defaultSettings: { allow_mixed_cart: 'true' },
  },
];

export function getPreset(type) {
  return BUSINESS_PRESETS.find(p => p.type === type);
}
