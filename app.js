document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Navigation Mobile Toggle
  initMobileMenu();

  // 2. Fetch and initialize CSV product catalog
  fetchAndInitCatalog();
});

// Mobile navigation menu toggle logic
function initMobileMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => navLinks.classList.remove('active'));
    });
  }
}

// Global catalog state
let allProducts = [];
let activeCategory = 'all';
let searchQuery = '';

// Helper to normalize strings for robust category matching
function normalizeKey(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Asynchronously fetch and parse product_specs_and_nutrition.csv
async function fetchAndInitCatalog() {
  const productGrid = document.getElementById('productGrid');
  const catalogStatus = document.getElementById('catalogStatus');

  if (!productGrid) return;

  try {
    const response = await fetch('product_specs_and_nutrition.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const csvText = await response.text();
    allProducts = parseCSV(csvText);

    if (!allProducts || allProducts.length === 0) {
      productGrid.innerHTML = '<p class="status-message">No products available in the catalog at this time.</p>';
      if (catalogStatus) catalogStatus.textContent = 'Showing 0 product(s)';
      return;
    }

    // Initialize search/filter controls and render cards
    initControls();
    renderProducts();

  } catch (error) {
    console.error('Error loading product catalog CSV:', error);
    if (productGrid) {
      productGrid.innerHTML = '<p class="status-message error-message">Unable to load product catalog. Please try again later.</p>';
    }
    if (catalogStatus) catalogStatus.textContent = 'Error loading product catalog.';
  }
}

// Robust CSV Parser handling quotes, commas within cells, and normalized header keys
function parseCSV(text) {
  const lines = text.replace(/\r/g, '').trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVRow(lines[0]);
  const items = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVRow(line);
    const item = {};

    headers.forEach((header, index) => {
      const key = header.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
      item[key] = values[index] !== undefined ? values[index].trim() : '';
    });

    items.push(item);
  }

  return items;
}

// Helper function to extract individual fields from CSV rows
function parseCSVRow(rowText) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < rowText.length; i++) {
    const char = rowText[i];

    if (char === '"' && (i === 0 || rowText[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.replace(/^"|"$/g, '').trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.replace(/^"|"$/g, '').trim());
  return values;
}

// Bind search input, category filter chips, and grid event delegation
function initControls() {
  const searchInput = document.getElementById('productSearch');
  const filterChips = document.querySelectorAll('.chip');
  const productGrid = document.getElementById('productGrid');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderProducts();
    });
  }

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');

      activeCategory = chip.getAttribute('data-filter') || 'all';
      renderProducts();
    });
  });

  // Event Delegation for modal buttons on product grid
  if (productGrid) {
    productGrid.addEventListener('click', (e) => {
      const button = e.target.closest('.btn-card-action');
      if (!button) return;

      const sku = button.getAttribute('data-sku');
      const product = allProducts.find(p => String(p.sku || p.id).trim() === sku);
      if (product) {
        openProductModal(product);
      }
    });
  }

  initModalListeners();
}

// Render dynamic product cards to #productGrid based on current filter & search query
function renderProducts() {
  const productGrid = document.getElementById('productGrid');
  const catalogStatus = document.getElementById('catalogStatus');
  if (!productGrid) return;

  const normalizedFilter = normalizeKey(activeCategory);

  const filtered = allProducts.filter(product => {
    const title = (product.title || product.name || product.item || '').toLowerCase();
    const category = (product.category || product.cat || '').toLowerCase();
    const sku = (product.sku || product.id || '').toLowerCase();

    const matchesCategory = activeCategory === 'all' || normalizeKey(category).includes(normalizedFilter);
    const matchesSearch = !searchQuery || title.includes(searchQuery) || sku.includes(searchQuery) || category.includes(searchQuery);

    return matchesCategory && matchesSearch;
  });

  productGrid.innerHTML = '';

  if (filtered.length === 0) {
    productGrid.innerHTML = '<p class="status-message">No products found matching your search parameters.</p>';
    if (catalogStatus) catalogStatus.textContent = 'Showing 0 product(s)';
    return;
  }

  const fragment = document.createDocumentFragment();

  filtered.forEach(product => {
    const card = document.createElement('article');
    card.className = 'product-card';

    const title = product.title || product.name || product.item || 'Untitled Product';
    const brand = product.brand || product.badge || 'LIGO Brand';
    const categoryName = product.category_label || product.category || 'Food Products';
    const description = product.description || product.desc || 'Premium quality food product.';
    const pack = product.pack || product.pack_size || '-';
    const origin = product.origin || 'USA';

    const sku = String(product.sku || product.id || '').trim();

    // Primary target: SKU image -> image_url -> default image
    const primaryImageSrc = sku
        ? `images/${sku}.jpg`
        : (product.image_url || 'images/content_crate_corn_field.jpg');

    // Secondary fallback target if the primary image path fails to load
    const fallbackImageSrc = product.image_url || 'images/content_crate_corn_field.jpg';

    card.innerHTML = `
      <div class="card-badge">${escapeHtml(brand)}</div>
      <div class="card-img-wrapper">
        <img
          src="${escapeHtml(primaryImageSrc)}"
          alt="${escapeHtml(title)}"
          loading="lazy"
          data-fallback="${escapeHtml(fallbackImageSrc)}"
        >
      </div>
      <div class="card-content">
        <span class="card-category">${escapeHtml(categoryName)}</span>
        <h3 class="card-title">${escapeHtml(title)}</h3>
        <p class="card-description">${escapeHtml(description)}</p>
        <div class="card-meta">
          <span><strong>Pack:</strong> ${escapeHtml(pack)}</span>
          <span><strong>Origin:</strong> ${escapeHtml(origin)}</span>
        </div>
        <button 
          class="btn-card-action" 
          data-sku="${escapeHtml(sku)}"
          aria-haspopup="dialog"
          aria-label="View spec sheet and nutrition for ${escapeHtml(title)}"
        >
          View Spec Sheet &amp; Nutrition
        </button>
      </div>
    `;

    const img = card.querySelector('img');
    img.addEventListener('error', function handleImgError() {
      this.removeEventListener('error', handleImgError);
      const fallback = this.getAttribute('data-fallback');
      if (this.src !== fallback) {
        this.src = fallback;
      } else {
        this.src = 'images/content_crate_corn_field.jpg';
      }
    });

    fragment.appendChild(card);
  });

  productGrid.appendChild(fragment);

  if (catalogStatus) {
    catalogStatus.textContent = `Showing ${filtered.length} product(s)`;
  }
}

// Modal dialog listeners
function initModalListeners() {
  const productModal = document.getElementById('productModal');
  const modalClose = document.getElementById('modalClose');

  if (modalClose && productModal) {
    modalClose.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
      if (e.target === productModal) closeModal();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }
}

// Populate modal with product specifications & FDA nutrition table from CSV row
function openProductModal(product) {
  const productModal = document.getElementById('productModal');
  if (!productModal || !product) return;

  const modalTitle = document.getElementById('modalTitle');
  const modalSku = document.getElementById('modalSku');
  const modalDescription = document.getElementById('modalDescription');
  const specPack = document.getElementById('specPack');
  const specWeight = document.getElementById('specWeight');
  const specPort = document.getElementById('specPort');
  const specShelf = document.getElementById('specShelf');

  if (modalTitle) modalTitle.textContent = product.title || product.name || 'Product Details';

  if (modalSku) {
    const skuVal = product.sku || product.id;
    modalSku.textContent = skuVal ? `SKU: ${skuVal}` : 'SKU: -';
  }

  if (modalDescription) modalDescription.textContent = product.description || product.desc || '';
  if (specPack) specPack.textContent = product.pack || product.pack_size || '-';
  if (specWeight) specWeight.textContent = product.weight || product.net_weight || '-';
  if (specPort) specPort.textContent = product.port || 'San Francisco / Oakland, CA';
  if (specShelf) specShelf.textContent = product.shelf_life || '36 Months';

  const setElemText = (id, val, fallback = '-') => {
    const el = document.getElementById(id);
    if (el) el.textContent = val !== undefined && val !== '' ? val : fallback;
  };

  setElemText('nfServings', product.servings || product.servings_per_container || 'Approx. 4');
  setElemText('nfServingSize', product.serving_size || '1/2 cup (140g)');
  setElemText('nfCalories', product.calories || '100');
  setElemText('nfTotalFat', product.total_fat || '0g');
  setElemText('nfTotalFatDV', product.total_fat_dv || '0%');
  setElemText('nfSodium', product.sodium || '10mg');
  setElemText('nfSodiumDV', product.sodium_dv || '0%');
  setElemText('nfCarbs', product.carbs || product.total_carbohydrate || '24g');
  setElemText('nfCarbsDV', product.carbs_dv || '9%');
  setElemText('nfFiber', product.fiber || product.dietary_fiber || '1g');
  setElemText('nfFiberDV', product.fiber_dv || '4%');
  setElemText('nfSugars', product.sugars || product.total_sugars || '21g');
  setElemText('nfAddedSugars', product.added_sugars || '0g');
  setElemText('nfAddedSugarsDV', product.added_sugars_dv || '0%');
  setElemText('nfProtein', product.protein || '1g');
  setElemText('nfPotassium', product.potassium || '110mg');
  setElemText('nfPotassiumDV', product.potassium_dv || '2%');

  // --- Attach PDF Download Handler to Button ---
  const downloadBtn = document.getElementById('btnDownloadSpec');
  if (downloadBtn) {
    downloadBtn.onclick = (e) => {
      e.preventDefault();
      generateProductPDF(product);
    };
  }

  productModal.classList.add('active');
  productModal.setAttribute('aria-hidden', 'false');
}

/**
 * Generates and triggers download of a full PDF Spec Sheet for the active product,
 * including complete FDA Nutrition Facts details and product image.
 * Compatible with Chrome on GitHub Pages / HTTPS static hosting.
 */
async function generateProductPDF(product) {
  // 1. Ensure jsPDF is loaded
  const jspdfLib = window.jspdf ? window.jspdf : window.jsPDF;
  if (!jspdfLib) {
    alert('PDF generation library is loading. Please try again in a moment.');
    return;
  }

  const { jsPDF } = jspdfLib;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const redAccent = [217, 35, 46];
  const darkText = [30, 30, 30];
  const mutedText = [100, 100, 100];

  // Helper: Convert image URL or path to base64 Data URL safely for jsPDF canvas
  const loadImageAsBase64 = (url) => {
    return new Promise((resolve) => {
      if (!url) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'Anonymous'; // Fix CORS restrictions on Chrome/GitHub Pages
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/jpeg');
          resolve(dataURL);
        } catch (err) {
          console.warn('Image canvas conversion failed:', err);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  // --- Image Resolution Order (URL -> SKU -> Default) ---
  const sku = String(product.sku || product.id || '').trim();
  const DEFAULT_IMAGE = 'images/content_crate_corn_field.jpg';

  const imageCandidates = [
    product.image_url,
    sku ? `images/${sku}.jpg` : null,
    sku ? `images/${sku}.png` : null,
    DEFAULT_IMAGE
  ].filter(Boolean);

  let productImgBase64 = null;
  for (const candidateSrc of imageCandidates) {
    productImgBase64 = await loadImageAsBase64(candidateSrc);
    if (productImgBase64) break;
  }

  // --- 1. Top Accent & Header ---
  doc.setFillColor(...redAccent);
  doc.rect(0, 0, 210, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...darkText);
  doc.text('LIBERTY GOLD FRUIT COMPANY', 14, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedText);
  doc.text('Product Technical Specification Sheet | LIGO Brand', 14, 26);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 155, 26);

  doc.setDrawColor(220, 220, 220);
  doc.line(14, 29, 196, 29);

  // --- 2. Product Name & Metadata ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...redAccent);
  doc.text(product.title || product.name || 'Product Specification', 14, 37);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkText);
  doc.text(`Category: ${product.category_label || product.category || 'Food Products'}`, 14, 43);
  doc.text(`SKU: ${product.sku || product.id || 'N/A'}`, 140, 43);

  // --- Insert Product Image if successfully loaded ---
  let startTableY = 47;
  if (productImgBase64) {
    try {
      doc.addImage(productImgBase64, 'JPEG', 148, 47, 45, 35);
    } catch (e) {
      console.warn('Could not attach image to PDF:', e);
    }
  }

  // --- 3. Logistics & Packaging Specifications Table ---
  const specsData = [
    ['Packaging Format', product.pack || product.pack_size || 'N/A'],
    ['Net / Drain Weight', product.weight || product.net_weight || 'N/A'],
    ['Shelf Life', product.shelf_life || '36 Months'],
    ['Shipping Port', product.port || 'San Francisco / Oakland, CA'],
    ['Origin / Harvest Region', product.origin || 'USA']
  ];

  // Resolve autoTable plugin whether attached directly to doc or window.jspdf.autoTable
  const autoTableFn = doc.autoTable || (window.jspdf && window.jspdf.autoTable) || window.autoTable;

  if (typeof autoTableFn === 'function') {
    autoTableFn.call(doc, {
      startY: startTableY,
      margin: { right: productImgBase64 ? 68 : 14, left: 14 }, // Leave space for image if present
      head: [['Logistics & Packaging Specification', 'Details']],
      body: specsData,
      theme: 'grid',
      headStyles: { fillColor: redAccent, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' } }
    });

    let currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : 95;

    // --- 4. Comprehensive FDA Nutrition Facts Table ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...darkText);
    doc.text('FDA Nutrition Facts', 14, currentY);

    const nutritionData = [
      ['Servings Per Container', product.servings || product.servings_per_container || 'Approx. 4'],
      ['Serving Size', product.serving_size || '1/2 cup (140g)'],
      ['Calories', product.calories || '100'],
      ['Total Fat', product.total_fat || '0g', product.total_fat_dv || '0%'],
      ['  Saturated Fat', product.saturated_fat || '0g', product.saturated_fat_dv || '0%'],
      ['  Trans Fat', product.trans_fat || '0g', '-'],
      ['Cholesterol', product.cholesterol || '0mg', product.cholesterol_dv || '0%'],
      ['Sodium', product.sodium || '10mg', product.sodium_dv || '0%'],
      ['Total Carbohydrate', product.carbs || product.total_carbohydrate || '24g', product.carbs_dv || '9%'],
      ['  Dietary Fiber', product.fiber || product.dietary_fiber || '1g', product.fiber_dv || '4%'],
      ['  Total Sugars', product.sugars || product.total_sugars || '21g', '-'],
      ['    Includes Added Sugars', product.added_sugars || '14g', product.added_sugars_dv || '28%'],
      ['Protein', product.protein || '1g', '-'],
      ['Vitamin D', product.vitamin_d || '0mcg', product.vitamin_d_dv || '0%'],
      ['Calcium', product.calcium || '10mg', product.calcium_dv || '0%'],
      ['Iron', product.iron || '0.4mg', product.iron_dv || '2%'],
      ['Potassium', product.potassium || '110mg', product.potassium_dv || '2%']
    ];

    autoTableFn.call(doc, {
      startY: currentY + 3,
      margin: { left: 14, right: 14 },
      head: [['Nutrient Component', 'Amount Per Serving', '% Daily Value*']],
      body: nutritionData,
      theme: 'striped',
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 1.8 },
      columnStyles: {
        0: { cellWidth: 75 },
        1: { cellWidth: 60 },
        2: { cellWidth: 45, halign: 'right' }
      },
      didParseCell: function (data) {
        const boldRows = [2, 3, 6, 7, 8, 12];
        if (data.section === 'body' && boldRows.includes(data.row.index) && data.column.index === 0) {
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 5 : 250;

    // Daily Value Footnote
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...mutedText);
    doc.text(
        '* The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.',
        14,
        currentY,
        { maxWidth: 180 }
    );
  }

  // --- 5. Footer Contact Block ---
  doc.setDrawColor(220, 220, 220);
  doc.line(14, 275, 196, 275);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedText);
  doc.text('Liberty Gold Fruit Company LP | 500 Eccles Avenue, South San Francisco, CA 94080 USA', 14, 281);
  doc.text('Phone: (650) 583-4700 | Export Inquiries: sales@libertygold.com', 14, 286);

  // --- 6. Trigger Download ---
  const safeName = (product.title || product.name || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');

  // Safe trigger for Chrome on GitHub Pages / HTTPS static hosting
  doc.save(`LIGO_Spec_Sheet_${safeName}.pdf`);
}

function closeModal() {
  const productModal = document.getElementById('productModal');
  if (productModal) {
    productModal.classList.remove('active');
    productModal.setAttribute('aria-hidden', 'true');
  }
}

// XSS Prevention Utility
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (match) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return map[match];
  });
}
