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
      productGrid.innerHTML = '<p class="status-message error-message">Unable to load product catalog. Please ensure you are running via a local web server (e.g. VS Code Live Server or Python http.server) rather than opening directly via file://.</p>';
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

// Bind search input, category filter chips, and clear search button toggle
function initControls() {
  const searchInput = document.getElementById('productSearch');
  const clearBtn = document.getElementById('clearSearch');
  const searchIcon = document.getElementById('searchIcon');
  const filterChips = document.querySelectorAll('.chip');
  const productGrid = document.getElementById('productGrid');

  // Sync icon state between Magnifying Glass ('🔍') and Clear Cross ('✕')
  function updateSearchIcon() {
    const hasSearchText = searchInput && searchInput.value.trim().length > 0;
    const isCategoryFiltered = activeCategory !== 'all';

    if (hasSearchText || isCategoryFiltered) {
      if (searchIcon) searchIcon.textContent = '✕';
      if (clearBtn) {
        clearBtn.classList.add('is-active');
        clearBtn.setAttribute('title', 'Clear search and filters');
      }
    } else {
      if (searchIcon) searchIcon.textContent = '🔍';
      if (clearBtn) {
        clearBtn.classList.remove('is-active');
        clearBtn.removeAttribute('title');
      }
    }
  }

  // Handle input search changes
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      updateSearchIcon();
      renderProducts();
    });
  }

  // Handle Clear Button clicks
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!clearBtn.classList.contains('is-active')) return;

      if (searchInput) searchInput.value = '';
      searchQuery = '';

      activeCategory = 'all';
      filterChips.forEach(c => {
        const isAll = c.getAttribute('data-filter') === 'all';
        c.classList.toggle('active', isAll);
        c.setAttribute('aria-selected', isAll ? 'true' : 'false');
      });

      updateSearchIcon();
      renderProducts();
    });
  }

  // Handle Category Filter Chips clicks
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');

      activeCategory = chip.getAttribute('data-filter') || 'all';
      updateSearchIcon();
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

    // Primary target: image_url from CSV -> fallback to default image
    const primaryImageSrc = product.image_url || 'images/content_crate_corn_field.jpg';

// Secondary fallback target if the primary image path fails to load
    const fallbackImageSrc = 'images/content_crate_corn_field.jpg';

    // // Primary target: image_url -> SKU image -> default image
    // const primaryImageSrc = product.image_url
    //     || (sku ? `images/${sku}.jpg` : 'images/content_crate_corn_field.jpg');
    //
    // // Secondary fallback target if the primary image path fails to load
    // const fallbackImageSrc = sku && product.image_url
    //     ? `images/${sku}.jpg`
    //     : 'images/content_crate_corn_field.jpg';

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
        <p class="card-sku"><strong>SKU:</strong> ${escapeHtml(sku)}</p>
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
// Fixed Modal dialog listeners (Reliable outside-click backdrop detection)
function initModalListeners() {
  const productModal = document.getElementById('productModal');
  const modalClose = document.getElementById('modalClose');

  if (productModal) {
    if (modalClose) {
      modalClose.addEventListener('click', closeModal);
    }
    // Listen for clicks on the backdrop overlay
    productModal.addEventListener('click', (e) => {
      // If the click is directly on the overlay backdrop (and not inside modal-content)
      if (e.target === productModal) {
        closeModal();
      }
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

  // Specification Elements matching index.html
  const specPack = document.getElementById('specPack');
  const specWeight = document.getElementById('specWeight');
  const specCaseWeight = document.getElementById('specCaseWeight');
  const specCaseCube = document.getElementById('specCaseCube');
  const specCaseDimensions = document.getElementById('specCaseDimensions');
  const specCasesPerPallet = document.getElementById('specCasesPerPallet');
  const specPalletPattern = document.getElementById('specPalletPattern');

  if (modalTitle) modalTitle.textContent = product.title || product.name || 'Product Details';

  if (modalSku) {
    const skuVal = product.sku || product.id;
    modalSku.textContent = skuVal ? `SKU: ${skuVal}` : 'SKU: -';
  }

  if (modalDescription) modalDescription.textContent = product.description || product.desc || '';

  // Populate Logistics & Packaging Specifications (Drained weight, shelf life, and port removed)
  if (specPack) specPack.textContent = product.pack || product.pack_size || '-';
  if (specWeight) specWeight.textContent = product.weight || product.net_weight || '-';
  if (specCaseWeight) specCaseWeight.textContent = product.case_weight || product.caseWeight || '-';
  if (specCaseCube) specCaseCube.textContent = product.case_cube || product.caseCube || '-';
  if (specCaseDimensions) specCaseDimensions.textContent = product.case_dimensions || product.caseDimensions || '-';
  if (specCasesPerPallet) specCasesPerPallet.textContent = product.cases_per_pallet || product.casesPerPallet || '-';
  if (specPalletPattern) specPalletPattern.textContent = product.pallet_pattern || product.palletPattern || '-';

  const setElemText = (id, val, fallback = '-') => {
    const el = document.getElementById(id);
    if (el) el.textContent = val !== undefined && val !== '' ? val : fallback;
  };

  // FDA Nutrition Facts & Minerals
  setElemText('nfServings', product.servings || product.servings_per_container || 'Approx. 4');
  setElemText('nfServingSize', product.serving_size || '1/2 cup (140g)');
  setElemText('nfCalories', product.calories || '100');
  setElemText('nfTotalFat', product.total_fat || product.total_fat_g || '0g');
  setElemText('nfTotalFatDV', product.total_fat_dv || '0%');
  setElemText('nfSodium', product.sodium || product.sodium_mg || '10mg');
  setElemText('nfSodiumDV', product.sodium_dv || '0%');
  setElemText('nfCarbs', product.carbs || product.total_carbohydrates_g || '24g');
  setElemText('nfCarbsDV', product.carbs_dv || '9%');
  setElemText('nfFiber', product.fiber || product.dietary_fiber_g || '1g');
  setElemText('nfFiberDV', product.fiber_dv || '4%');
  setElemText('nfSugars', product.sugars || product.total_sugars_g || '21g');
  setElemText('nfAddedSugars', product.added_sugars || product.added_sugars_g || '0g');
  setElemText('nfAddedSugarsDV', product.added_sugars_dv || '0%');
  setElemText('nfProtein', product.protein || product.protein_g || '1g');
  setElemText('nfVitaminD', product.vitamin_d || product.vitamin_d_mcg || '0mcg');
  setElemText('nfVitaminDDV', product.vitamin_d_dv || '0%');
  setElemText('nfCalcium', product.calcium || product.calcium_mg || '10mg');
  setElemText('nfCalciumDV', product.calcium_dv || '0%');
  setElemText('nfIron', product.iron || product.iron_mg || '0.4mg');
  setElemText('nfIronDV', product.iron_dv || '2%');
  setElemText('nfPotassium', product.potassium || product.potassium_mg || '110mg');
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
async function generateProductPDF(product) {
  const jspdfLib = window.jspdf ? window.jspdf : window.jsPDF;
  if (!jspdfLib) {
    alert('PDF generation library is loading. Please try again in a moment.');
    return;
  }

  const { jsPDF } = jspdfLib;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Branding Constants
  const navyBlue = [10, 25, 47];
  const goldSun = [244, 209, 96];
  const darkText = [30, 30, 30];
  const mutedText = [100, 100, 100];

  // Helper for Logo/Images
  const loadImageAsBase64 = (url) => {
    return new Promise((resolve) => {
      if (!url) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve({ dataURL: canvas.toDataURL('image/png'), width: img.width, height: img.height });
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  // 1. LETTERHEAD: Logo and Navbar Text
  const logoData = await loadImageAsBase64('images/navbar_liberty-gold.png');
  if (logoData) {
    const logoW = 35;
    const logoH = (logoData.height / logoData.width) * logoW;
    doc.addImage(logoData.dataURL, 'PNG', 14, 10, logoW, logoH);
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navyBlue);

  // Title (NAV-TITLE)
  doc.setFontSize(22);
  doc.text('LIBERTY GOLD', 52, 18);

  // Subtitle (NAV-SUBTITLE)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Growing, harvesting, processing and marketing...', 52, 23);

  // Slogan (NAV-SLOGAN)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...navyBlue);
  doc.text('The Best Foods the World Has to Offer', 52, 30);

  doc.setDrawColor(...goldSun);
  doc.setLineWidth(1);
  doc.line(14, 35, 196, 35);

  // 2. PRODUCT TITLE & CATEGORY
  const sku = String(product.sku || product.id || '').trim();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...darkText);
  doc.text(product.title || product.name || 'Product Specification', 14, 43);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedText);
  doc.text(`Category: ${product.category_label || product.category || 'N/A'} | SKU: ${sku}`, 14, 49);

  // 3. LOGISTICS & PACKAGING SPECIFICATIONS TABLE & PRODUCT IMAGE SIDE-BY-SIDE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...navyBlue);
  doc.text('Logistics & Packaging Specifications', 14, 58);

  const specsData = [
    ['Packaging Format / Pack Size', product.pack || product.pack_size || 'N/A'],
    ['Net Weight', product.weight || product.net_weight || 'N/A'],
    ['Country of Origin', product.origin || product.country_of_origin || 'USA'],
    ['Case Weight', product.case_weight || product.caseWeight || 'N/A'],
    ['Case Cube', product.case_cube || product.caseCube || 'N/A'],
    ['Case Dimensions', product.case_dimensions || product.caseDimensions || 'N/A'],
    ['Cases Per Pallet', product.cases_per_pallet || product.casesPerPallet || 'N/A'],
    ['Pallet Pattern', product.pallet_pattern || product.palletPattern || 'N/A']
  ];

  const autoTableFn = doc.autoTable || (window.jspdf && window.jspdf.autoTable);

  autoTableFn.call(doc, {
    startY: 61,
    margin: { left: 14, right: 65 },
    head: [['Specification Feature', 'Details']],
    body: specsData,
    theme: 'grid',
    headStyles: { fillColor: navyBlue, textColor: [255, 255, 255] },
    styles: { fontSize: 7.5, cellPadding: 1.5 }
  });

  // // Product Image Box on the Right (image_url -> sku -> default image fallback)
  // const defaultImage = 'images/content_crate_corn_field.jpg';
  // const candidateImageUrl = product.image_url || (sku ? `images/${sku}.png` : null) || (sku ? `images/${sku}.jpg` : null) || defaultImage;
  // let productImgData = await loadImageAsBase64(candidateImageUrl);
  //
  // // Fallback to jpg if png failed or vice versa if SKU is present
  // if (!productImgData && sku) {
  //   productImgData = await loadImageAsBase64(`images/${sku}.jpg`);
  // }
  // if (!productImgData) {
  //   productImgData = await loadImageAsBase64(defaultImage);
  // }
  //


  // Product Image Box on the Right (image_url -> default image fallback)
  const defaultImage = 'images/content_crate_corn_field.jpg';
  const candidateImageUrl = product.image_url || defaultImage;
  let productImgData = await loadImageAsBase64(candidateImageUrl);

// Final fallback to default image if loading fails
  if (!productImgData) {
    productImgData = await loadImageAsBase64(defaultImage);
  }

  if (productImgData) {
    const imgBoxX = 150;
    const imgBoxY = 61;
    const imgBoxW = 42;
    const imgBoxH = 45;

    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(252, 252, 252);
    doc.roundedRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 2, 2, 'FD');

    const ratio = Math.min(imgBoxW / productImgData.width, imgBoxH / productImgData.height);
    const renderW = productImgData.width * ratio * 0.9;
    const renderH = productImgData.height * ratio * 0.9;
    const renderX = imgBoxX + (imgBoxW - renderW) / 2;
    const renderY = imgBoxY + (imgBoxH - renderH) / 2;

    doc.addImage(productImgData.dataURL, 'PNG', renderX, renderY, renderW, renderH);
  }

  // 4. ADDED SPACE & FDA NUTRITION FACTS TABLE
  let currentY = Math.max(doc.lastAutoTable.finalY, 110) + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...navyBlue);
  doc.text(`FDA Nutrition Facts (Serving Size: ${product.serving_size || '1/2 cup'}, Servings: ${product.servings || product.servings_per_container || 'Approx. 4'})`, 14, currentY);

  const nutritionData = [
    ['Calories', String(product.calories || '100'), '-'],
    ['Total Fat', (product.total_fat || product.total_fat_g || '0') + 'g', '0%'],
    ['Sodium', (product.sodium || product.sodium_mg || '10') + 'mg', '0%'],
    ['Total Carbohydrates', (product.carbs || product.total_carbohydrates_g || '24') + 'g', '9%'],
    ['Dietary Fiber', (product.fiber || product.dietary_fiber_g || '1') + 'g', '4%'],
    ['Total Sugars', (product.sugars || product.total_sugars_g || '21') + 'g', '-'],
    ['Added Sugars', (product.added_sugars || product.added_sugars_g || '0') + 'g', '0%'],
    ['Protein', (product.protein || product.protein_g || '1') + 'g', '-'],
    ['Vitamin D', (product.vitamin_d || product.vitamin_d_mcg || '0') + 'mcg', '0%'],
    ['Calcium', (product.calcium || product.calcium_mg || '10') + 'mg', '0%'],
    ['Iron', (product.iron || product.iron_mg || '0.4') + 'mg', '2%'],
    ['Potassium', (product.potassium || product.potassium_mg || '110') + 'mg', '2%']
  ];

  autoTableFn.call(doc, {
    startY: currentY + 3,
    margin: { left: 14, right: 14 },
    head: [['Nutrient / Mineral / Vitamin', 'Amount Per Serving', '% Daily Value (% DV)*']],
    body: nutritionData,
    theme: 'striped',
    headStyles: { fillColor: [70, 70, 70] },
    styles: { fontSize: 8, cellPadding: 1.5 }
  });

  // Footer note on DV
  let footerY = doc.lastAutoTable.finalY + 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...mutedText);
  doc.text('* The % Daily Value (DV) tells you how much a nutrient in a serving contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.', 14, footerY, { maxWidth: 182 });

  // 5. CORPORATE FOOTER
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...goldSun);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 16, 196, pageHeight - 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...navyBlue);
  doc.text('LIBERTY GOLD FRUIT COMPANY LP', 14, pageHeight - 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedText);
  doc.text('500 Eccles Avenue, South San Francisco, CA 94080 USA  |  Phone: (650) 583-4700  |  Email: tim@libertygold.com', 14, pageHeight - 8);
  doc.text('© 2026 Liberty Gold Fruit Co., Inc. All Rights Reserved.', 14, pageHeight - 4);

  doc.save(`LIGO_Spec_${sku || 'product'}.pdf`);
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