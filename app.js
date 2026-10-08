/**
 * Application Entry Point
 * Listens for the DOM to be fully loaded before initializing core interactive features and loading catalog data.
 */
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  fetchAndInitCatalog();
});

/**
 * Initializes mobile navigation menu toggling and auto-closes the menu when links are clicked.
 */
function initMobileMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');

  if (menuToggle && navLinks) {
    // Toggle 'active' class on menu button click
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });

    // Close mobile drawer upon selecting any navigation link
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => navLinks.classList.remove('active'));
    });
  }
}

// Global State Management
let allProducts = [];      // Stores parsed product data loaded from CSV
let activeCategory = 'all'; // Currently selected category filter
let searchQuery = '';      // Active user search keyword

/**
 * Normalizes input strings by converting to lowercase and stripping non-alphanumeric characters.
 * @param {string} str Raw input string
 * @returns {string} Sanitized string
 */
function normalizeKey(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Extracts floating point values from string input (e.g., "140g" -> 140).
 * @param {string} str Input value containing potential numeric characters
 * @returns {number} Extracted number or 0
 */
function parseNutrientValue(str) {
  if (!str) return 0;
  const match = String(str).match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Calculates percentage Daily Value (% DV) based on standard FDA recommendation values.
 * Returns '0%' if there is no value or if the value is zero.
 * @param {string} valStr Nutrient raw quantity string (e.g., "10mg")
 * @param {number} standardDV Daily recommended reference standard
 * @returns {string} Percentage representation (e.g., "5%", "0%")
 */
function getDV(valStr, standardDV) {
  if (!standardDV) return '-';
  const num = parseNutrientValue(valStr);
  if (isNaN(num) || num === 0) return '0%';
  const pct = Math.round((num / standardDV) * 100);
  return pct + '%';
}

/**
 * Formats nutrient text to ensure standard unit postfix appending (e.g., "10" -> "10mg").
 * Returns '0' + defaultUnit if value is empty or missing.
 * @param {string|number} val Raw nutrient magnitude
 * @param {string} defaultUnit Measurement unit suffix (e.g., 'g', 'mg', 'mcg')
 * @returns {string} Formatted text display
 */
function formatNutrient(val, defaultUnit) {
  if (val === undefined || val === null || String(val).trim() === '') {
    return '0' + defaultUnit;
  }
  const str = String(val).trim();
  if (/[a-zA-Z]+$/.test(str)) {
    return str;
  }
  return str + defaultUnit;
}

/**
 * Fetches the CSV file from the server, parses product details, and renders the initial catalog.
 */
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

/**
 * Converts raw CSV string content into an array of product objects using standard headers as keys.
 * @param {string} text Raw CSV text block
 * @returns {Array<Object>} Array of product key-value records
 */
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
      // Convert headers to standardized snake_case keys
      const key = header.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
      item[key] = values[index] !== undefined ? values[index].trim() : '';
    });

    items.push(item);
  }
  return items;
}

/**
 * Parses a single line/row of CSV content, supporting double-quoted fields.
 * @param {string} rowText Single line string from CSV file
 * @returns {Array<string>} Parsed field values
 */
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

/**
 * Initializes interactive controls including live search input, filter chips, clear button, and card event delegation.
 */
function initControls() {
  const searchInput = document.getElementById('productSearch');
  const clearBtn = document.getElementById('clearSearch');
  const searchIcon = document.getElementById('searchIcon');
  const filterChips = document.querySelectorAll('.chip');
  const productGrid = document.getElementById('productGrid');

  // Updates search bar iconography and toggle states based on activity
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

  // Attach event listener for real-time text input filter
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      updateSearchIcon();
      renderProducts();
    });
  }

  // Reset search queries and reset category selections on clear button trigger
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

  // Category filter click events
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

  // Delegated click listener on the grid for modal opening action buttons
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

/**
 * Filters all products against selected category and query text, building and rendering dynamic HTML product cards.
 */
function renderProducts() {
  const productGrid = document.getElementById('productGrid');
  const catalogStatus = document.getElementById('catalogStatus');
  if (!productGrid) return;

  const normalizedFilter = normalizeKey(activeCategory);

  // Apply filtering matching category and query input
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

  // Utilize DocumentFragment to perform high-efficiency DOM batch rendering
  const fragment = document.createDocumentFragment();

  filtered.forEach(product => {
    const card = document.createElement('article');
    card.className = 'product-card';

    const title = product.title || product.name || product.item || 'Untitled Product';
    const brand = product.brand || product.badge || 'LIGO Brand';
    const categoryName = product.category_label || product.category || 'Food Products';
    const description = product.description || product.desc || '';
    const pack = product.pack || product.pack_size || '-';
    const origin = product.origin || 'USA';
    const sku = String(product.sku || product.id || '').trim();
    const primaryImageSrc = product.image_url || 'images/ligo_Content-fullGrocery.jpg';
    const fallbackImageSrc = 'images/ligo_Content-fullGrocery.jpg';

    card.innerHTML = `
            <div class="card-badge">${escapeHtml(brand)}</div>
            <div class="card-img-wrapper">
                <img src="${escapeHtml(primaryImageSrc)}" alt="${escapeHtml(title)}" loading="lazy" data-fallback="${escapeHtml(fallbackImageSrc)}">
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
                <button class="btn-card-action" data-sku="${escapeHtml(sku)}" aria-haspopup="dialog" aria-label="View spec sheet and nutrition for ${escapeHtml(title)}">
                    View Spec Sheet &amp; Nutrition
                </button>
            </div>
        `;

    // Handle missing or broken image URLs with fallback images
    const img = card.querySelector('img');
    img.addEventListener('error', function handleImgError() {
      this.removeEventListener('error', handleImgError);
      const fallback = this.getAttribute('data-fallback');
      if (this.src !== fallback) {
        this.src = fallback;
      } else {
        this.src = 'images/ligo_Content-fullGrocery.jpg';
      }
    });

    fragment.appendChild(card);
  });

  productGrid.appendChild(fragment);

  if (catalogStatus) {
    catalogStatus.textContent = `Showing ${filtered.length} product(s)`;
  }
}

/**
 * Initializes global event handlers for modal actions (closing via backdrop click, button, or Escape key).
 */
function initModalListeners() {
  const productModal = document.getElementById('productModal');
  const modalClose = document.getElementById('modalClose');

  if (productModal) {
    if (modalClose) {
      modalClose.addEventListener('click', closeModal);
    }

    // Close on clicking modal backdrop area outside modal body
    productModal.addEventListener('click', (e) => {
      if (e.target === productModal) {
        closeModal();
      }
    });

    // Close when pressing the Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }
}

/**
 * Opens product dialog modal and populates specification details and FDA nutrition values.
 * @param {Object} product Product detail payload object
 */
function openProductModal(product) {
  const productModal = document.getElementById('productModal');
  if (!productModal || !product) return;

  // Element selection
  const modalTitle = document.getElementById('modalTitle');
  const modalSku = document.getElementById('modalSku');
  const modalDescription = document.getElementById('modalDescription');
  const specPack = document.getElementById('specPack');
  const specWeight = document.getElementById('specWeight');
  const specCaseWeight = document.getElementById('specCaseWeight');
  const specCaseCube = document.getElementById('specCaseCube');
  const specCaseDimensions = document.getElementById('specCaseDimensions');
  const specCasesPerPallet = document.getElementById('specCasesPerPallet');
  const specPalletPattern = document.getElementById('specPalletPattern');

  // Populate logistics and specification content
  if (modalTitle) modalTitle.textContent = product.title || product.name || 'Product Details';
  if (modalSku) {
    const skuVal = product.sku || product.id;
    modalSku.textContent = skuVal ? `SKU: ${skuVal}` : 'SKU: -';
  }
  if (modalDescription) modalDescription.textContent = product.description || product.desc || '';
  if (specPack) specPack.textContent = product.pack || product.pack_size || '-';
  if (specWeight) specWeight.textContent = product.weight || product.net_weight || '-';
  if (specCaseWeight) specCaseWeight.textContent = product.case_weight || product.caseWeight || '-';
  if (specCaseCube) specCaseCube.textContent = product.case_cube || product.caseCube || '-';
  if (specCaseDimensions) specCaseDimensions.textContent = product.case_dimensions || product.caseDimensions || '-';
  if (specCasesPerPallet) specCasesPerPallet.textContent = product.cases_per_pallet || product.casesPerPallet || '-';
  if (specPalletPattern) specPalletPattern.textContent = product.pallet_pattern || product.palletPattern || '-';

  // Text assignment helper
  const setElemText = (id, val, fallback = '-') => {
    const el = document.getElementById(id);
    if (el) el.textContent = val !== undefined && val !== '' ? val : fallback;
  };

  // Extract raw nutrition data
  const rawFat = product.total_fat || product.total_fat_g || '';
  const rawSodium = product.sodium || product.sodium_mg || '';
  const rawCarbs = product.carbs || product.total_carbohydrates_g || '';
  const rawFiber = product.fiber || product.dietary_fiber_g || '';
  const rawSugars = product.sugars || product.total_sugars_g || '';
  const rawAddedSugars = product.added_sugars || product.added_sugars_g || '';
  const rawProtein = product.protein || product.protein_g || '';
  const rawVitD = product.vitamin_d || product.vitamin_d_mcg || '';
  const rawCalcium = product.calcium || product.calcium_mg || '';
  const rawIron = product.iron || product.iron_mg || '';
  const rawPotassium = product.potassium || product.potassium_mg || '';

  // Format unit metrics
  const totalFatStr = formatNutrient(rawFat, 'g');
  const sodiumStr = formatNutrient(rawSodium, 'mg');
  const carbsStr = formatNutrient(rawCarbs, 'g');
  const fiberStr = formatNutrient(rawFiber, 'g');
  const sugarsStr = formatNutrient(rawSugars, 'g');
  const addedSugarsStr = formatNutrient(rawAddedSugars, 'g');
  const proteinStr = formatNutrient(rawProtein, 'g');
  const vitDStr = formatNutrient(rawVitD, 'mcg');
  const calciumStr = formatNutrient(rawCalcium, 'mg');
  const ironStr = formatNutrient(rawIron, 'mg');
  const potassiumStr = formatNutrient(rawPotassium, 'mg');

  // Populate nutrition facts grid elements and Daily Values
  setElemText('nfServings', product.servings || product.servings_per_container || 'Approx. 4');
  setElemText('nfServingSize', product.serving_size || '1/2 cup (140g)');
  setElemText('nfCalories', product.calories || '0');
  setElemText('nfTotalFat', totalFatStr);
  setElemText('nfTotalFatDV', getDV(totalFatStr, 78));
  setElemText('nfSodium', sodiumStr);
  setElemText('nfSodiumDV', getDV(sodiumStr, 2300));
  setElemText('nfCarbs', carbsStr);
  setElemText('nfCarbsDV', getDV(carbsStr, 275));
  setElemText('nfFiber', fiberStr);
  setElemText('nfFiberDV', getDV(fiberStr, 28));
  setElemText('nfSugars', sugarsStr);
  setElemText('nfAddedSugars', addedSugarsStr);
  setElemText('nfAddedSugarsDV', getDV(addedSugarsStr, 50));
  setElemText('nfProtein', proteinStr);
  setElemText('nfVitaminD', vitDStr);
  setElemText('nfVitaminDDV', getDV(vitDStr, 20));
  setElemText('nfCalcium', calciumStr);
  setElemText('nfCalciumDV', getDV(calciumStr, 1300));
  setElemText('nfIron', ironStr);
  setElemText('nfIronDV', getDV(ironStr, 18));
  setElemText('nfPotassium', potassiumStr);
  setElemText('nfPotassiumDV', getDV(potassiumStr, 4700));

  // Bind spec sheet PDF export handler button
  const downloadBtn = document.getElementById('btnDownloadSpec');
  if (downloadBtn) {
    downloadBtn.onclick = (e) => {
      e.preventDefault();
      generateProductPDF(product);
    };
  }

  // Display modal
  productModal.classList.add('active');
  productModal.setAttribute('aria-hidden', 'false');
}

/**
 * Generates and downloads a spec sheet PDF document for a given product using jsPDF & autoTable.
 * @param {Object} product Target product data record
 * */
async function generateProductPDF(product) {
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

  // Theme branding color palette definitions
  const navyBlue = [10, 25, 47];
  const goldenSun = [244, 209, 96];
  const darkText = [30, 30, 30];
  const mutedText = [102, 102, 102];

  /**
   * Helper to load images via HTML Canvas converting to Base64 Data URL for jsPDF embedding
   */
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
        resolve({
          dataURL: canvas.toDataURL('image/png'),
          width: img.width,
          height: img.height
        });
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  // Helper to safely extract present value across multiple possible property key aliases
  const getValue = (keys) => {
    for (const k of keys) {
      const val = product[k];
      if (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== 'NaN') {
        return String(val).trim();
      }
    }
    return null;
  };

  // Helper to format values with standard unit suffix
  const formatNutrientVal = (val, defaultUnit) => {
    if (!val) return null;
    if (val === '-' || /[a-zA-Z%]/.test(val)) return val;
    return `${val}${defaultUnit}`;
  };

  // Helper to compute % Daily Value (% DV)
  const calculateDV = (val, refDailyVal) => {
    if (!val || !refDailyVal) return '-';
    const num = parseFloat(val);
    if (isNaN(num)) return '-';
    return `${Math.round((num / refDailyVal) * 100)}%`;
  };

  // Render header branding logo
  const logoData = await loadImageAsBase64('images/navbar_liberty-gold.png');
  if (logoData) {
    const logoW = 32;
    const logoH = (logoData.height / logoData.width) * logoW;
    doc.addImage(logoData.dataURL, 'PNG', 14, 10, logoW, logoH);
  }

  // PDF Header Typography & Company Details
  const textStartX = 50;
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...navyBlue);
  doc.text('LIBERTY GOLD', textStartX, 16);

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...mutedText);
  doc.text('Growing, harvesting, processing and marketing...', textStartX, 21.5);

  doc.setFont('times', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(...navyBlue);
  doc.text('The Best Foods the World Has to Offer', textStartX, 27.5);

  // Golden accent divider line
  doc.setDrawColor(...goldenSun);
  doc.setLineWidth(0.85);
  doc.line(14, 31, 196, 31);

  // Product Title & Metadata
  const sku = String(product.sku || product.id || '').trim();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...darkText);
  doc.text(product.title || product.name || 'Product Specification', 14, 43);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedText);
  doc.text(`Category: ${product.category_label || product.category || 'N/A'} | SKU: ${sku}`, 14, 49);

  // Logistics & Packaging Table Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...navyBlue);
  doc.text('Logistics & Packaging Specifications', 14, 58);

  const specsData = [
    ['Packaging Format / Pack Size', product.pack || product.pack_size || product['Pack Size'] || 'N/A'],
    ['Net Weight', product.weight || product.net_weight || product['Net Weight'] || 'N/A'],
    ['Country of Origin', product.origin || product.country_of_origin || product['Country of Origin'] || 'USA'],
    ['Case Weight', product.case_weight || product.caseWeight || product['Case Weight'] || 'N/A'],
    ['Case Cube', product.case_cube || product.caseCube || product['Case Cube'] || 'N/A'],
    ['Case Dimensions', product.case_dimensions || product.caseDimensions || product['Case Dimensions'] || 'N/A'],
    ['Cases Per Pallet', product.cases_per_pallet || product.casesPerPallet || product['Cases Per Pallet'] || 'N/A'],
    ['Pallet Pattern', product.pallet_pattern || product.palletPattern || product['Pallet Pattern'] || 'N/A']
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

  // Render Product Image inside framed box
  const defaultImage = 'images/ligo_Content-fullGrocery.jpg';
  const candidateImageUrl = product.image_url || defaultImage;
  let productImgData = await loadImageAsBase64(candidateImageUrl);
  if (!productImgData) {
    productImgData = await loadImageAsBase64(defaultImage);
  }

  if (productImgData) {
    const imgBoxX = 150;
    const imgBoxY = 61;
    const imgBoxW = 42;
    const imgBoxH = 45;

    // Draw image placeholder border
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(252, 252, 252);
    doc.roundedRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 2, 2, 'FD');

    // Scale image while preserving aspect ratio
    const ratio = Math.min(imgBoxW / productImgData.width, imgBoxH / productImgData.height);
    const renderW = productImgData.width * ratio * 0.9;
    const renderH = productImgData.height * ratio * 0.9;
    const renderX = imgBoxX + (imgBoxW - renderW) / 2;
    const renderY = imgBoxY + (imgBoxH - renderH) / 2;

    doc.addImage(productImgData.dataURL, 'PNG', renderX, renderY, renderW, renderH);
  }

  // --- MANDATORY FDA NUTRITION FACTS TABLE ---
  let currentY = Math.max(doc.lastAutoTable.finalY, 110) + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...navyBlue);

  const servingSize = getValue(['serving_size', 'Serving Size']) || '1/2 cup';
  const servings = getValue(['servings', 'servings_per_container', 'Servings Per Container']) || 'Approx. 4';
  doc.text(`FDA Nutrition Facts (Serving Size: ${servingSize}, Servings: ${servings})`, 14, currentY);

  // Configuration ONLY for mandatory FDA nutrients above the disclaimer
  const mandatoryNutrientConfig = [
    { label: 'Calories', keys: ['calories', 'Calories'], unit: '', dvRef: null },
    { label: 'Total Fat', keys: ['total_fat', 'total_fat_g', 'Total Fat (g)'], unit: 'g', dvRef: 78 },
    { label: 'Saturated Fat', keys: ['saturated_fat', 'saturated_fat_g', 'Saturated Fat (g)'], unit: 'g', dvRef: 20 },
    { label: 'Trans Fat', keys: ['trans_fat', 'trans_fat_g', 'Trans Fat (g)'], unit: 'g', dvRef: null },
    { label: 'Cholesterol', keys: ['cholesterol', 'cholesterol_mg', 'Cholesterol (mg)'], unit: 'mg', dvRef: 300 },
    { label: 'Sodium', keys: ['sodium', 'sodium_mg', 'Sodium (mg)'], unit: 'mg', dvRef: 2300 },
    { label: 'Total Carbohydrates', keys: ['carbs', 'total_carbohydrates_g', 'total_carbohydrates', 'Total Carbohydrates (g)'], unit: 'g', dvRef: 275 },
    { label: 'Dietary Fiber', keys: ['fiber', 'dietary_fiber_g', 'Dietary Fiber (g)'], unit: 'g', dvRef: 28 },
    { label: 'Total Sugars', keys: ['sugars', 'total_sugars_g', 'Total Sugars (g)'], unit: 'g', dvRef: null },
    { label: 'Added Sugars', keys: ['added_sugars', 'added_sugars_g', 'Added Sugars (g)'], unit: 'g', dvRef: 50 },
    { label: 'Protein', keys: ['protein', 'protein_g', 'Protein (g)'], unit: 'g', dvRef: null },
    { label: 'Vitamin D', keys: ['vitamin_d', 'vitamin_d_mcg', 'Vitamin D (mcg)'], unit: 'mcg', dvRef: 20 },
    { label: 'Calcium', keys: ['calcium', 'calcium_mg', 'Calcium (mg)'], unit: 'mg', dvRef: 1300 },
    { label: 'Iron', keys: ['iron', 'iron_mg', 'Iron (mg)'], unit: 'mg', dvRef: 18 },
    { label: 'Potassium', keys: ['potassium', 'potassium_mg', 'Potassium (mg)'], unit: 'mg', dvRef: 4700 }
  ];

  // Build mandatory table body
  const nutritionData = [];
  mandatoryNutrientConfig.forEach(cfg => {
    const rawVal = getValue(cfg.keys);
    if (rawVal !== null) {
      const formattedVal = formatNutrientVal(rawVal, cfg.unit);
      const dvVal = cfg.dvRef ? calculateDV(rawVal, cfg.dvRef) : '-';
      nutritionData.push([cfg.label, formattedVal, dvVal]);
    }
  });

  autoTableFn.call(doc, {
    startY: currentY + 3,
    margin: { left: 14, right: 14 },
    head: [['Nutrient / Mineral / Vitamin', 'Amount Per Serving', '% Daily Value (% DV)*']],
    body: nutritionData,
    theme: 'striped',
    headStyles: { fillColor: [70, 70, 70] },
    styles: { fontSize: 8, cellPadding: 1.5 }
  });

  // --- MANDATORY FDA DISCLAIMER FOOTNOTE ---
  let footerY = doc.lastAutoTable.finalY + 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...mutedText);
  doc.text('* The % Daily Value (DV) tells you how much a nutrient in a serving contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.', 14, footerY, { maxWidth: 182 });

  // Advance vertical tracking position past the mandatory disclaimer
  currentY = footerY + 6;

  // --- EXTRA INFORMATION SECTION (AFTER DISCLAIMER) ---

  // 1. Ingredients
  const ingredientsVal = getValue(['ingredients', 'Ingredients']);
  if (ingredientsVal) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...navyBlue);
    doc.text('INGREDIENTS:', 14, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(50, 50, 50);
    const splitIng = doc.splitTextToSize(ingredientsVal, 145);
    doc.text(splitIng, 38, currentY);
    currentY += Math.max(splitIng.length * 3.5, 6);
  }

  // 2. Allergens
  const allergensVal = getValue(['allergens', 'Allergens']);
  if (allergensVal) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 0, 0);
    doc.text('ALLERGENS:', 14, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(50, 50, 50);
    const splitAllergens = doc.splitTextToSize(allergensVal, 145);
    doc.text(splitAllergens, 38, currentY);
    currentY += Math.max(splitAllergens.length * 3.5, 6);
  }

  // 3. Optional / Voluntary Vitamins or Additional Nutrients
  const extraNutrientsConfig = [
    { label: 'Vitamin A', keys: ['vitamin_a', 'vitamin_a_pct', 'Vitamin A (%)'], unit: '%' },
    { label: 'Vitamin C', keys: ['vitamin_c', 'vitamin_c_pct', 'vitamin_c_mcg', 'Vitamin C (%)', 'Vitamin C (mcg)'], unit: '%' }
  ];

  const extraNutrientsList = [];
  extraNutrientsConfig.forEach(cfg => {
    const rawVal = getValue(cfg.keys);
    if (rawVal !== null) {
      extraNutrientsList.push(`${cfg.label}: ${formatNutrientVal(rawVal, cfg.unit)}`);
    }
  });

  if (extraNutrientsList.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...navyBlue);
    doc.text('ADDITIONAL NUTRIENTS:', 14, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(50, 50, 50);
    doc.text(extraNutrientsList.join(' | '), 52, currentY);
  }

  // --- PAGE FOOTER DETAILS ---
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...goldenSun);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 16, 196, pageHeight - 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...navyBlue);
  doc.text('LIBERTY GOLD FRUIT COMPANY LP', 14, pageHeight - 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedText);
  doc.text('500 Eccles Avenue, South San Francisco, CA 94080 USA | Phone: (650) 583-4700 | Email: tim@libertygold.com', 14, pageHeight - 8);
  doc.text('© 2026 Liberty Gold Fruit Co., Inc. All Rights Reserved.', 14, pageHeight - 4);

  // Save and download generated PDF document
  doc.save(`LIGO_Spec_${sku || 'product'}.pdf`);
}
// async function generateProductPDF(product) {
//   const jspdfLib = window.jspdf ? window.jspdf : window.jsPDF;
//   if (!jspdfLib) {
//     alert('PDF generation library is loading. Please try again in a moment.');
//     return;
//   }
//
//   const { jsPDF } = jspdfLib;
//   const doc = new jsPDF({
//     orientation: 'portrait',
//     unit: 'mm',
//     format: 'a4'
//   });
//
//   // Theme branding color palette definitions
//   const navyBlue = [10, 25, 47];
//   const goldenSun = [244, 209, 96];
//   const darkText = [30, 30, 30];
//   const mutedText = [102, 102, 102];
//
//   /**
//    * Helper to load images via HTML Canvas converting to Base64 Data URL for jsPDF embedding
//    */
//   const loadImageAsBase64 = (url) => {
//     return new Promise((resolve) => {
//       if (!url) return resolve(null);
//       const img = new Image();
//       img.crossOrigin = 'Anonymous';
//       img.onload = () => {
//         const canvas = document.createElement('canvas');
//         canvas.width = img.width;
//         canvas.height = img.height;
//         const ctx = canvas.getContext('2d');
//         ctx.drawImage(img, 0, 0);
//         resolve({
//           dataURL: canvas.toDataURL('image/png'),
//           width: img.width,
//           height: img.height
//         });
//       };
//       img.onerror = () => resolve(null);
//       img.src = url;
//     });
//   };
//
//   // Render header branding logo
//   const logoData = await loadImageAsBase64('images/navbar_liberty-gold.png');
//   if (logoData) {
//     const logoW = 32;
//     const logoH = (logoData.height / logoData.width) * logoW;
//     doc.addImage(logoData.dataURL, 'PNG', 14, 10, logoW, logoH);
//   }
//
//   // PDF Header Typography & Company Details
//   const textStartX = 50;
//   doc.setFont('times', 'bold');
//   doc.setFontSize(18);
//   doc.setTextColor(...navyBlue);
//   doc.text('LIBERTY GOLD', textStartX, 16);
//
//   doc.setFont('times', 'normal');
//   doc.setFontSize(9.5);
//   doc.setTextColor(...mutedText);
//   doc.text('Growing, harvesting, processing and marketing...', textStartX, 21.5);
//
//   doc.setFont('times', 'italic');
//   doc.setFontSize(11);
//   doc.setTextColor(...navyBlue);
//   doc.text('The Best Foods the World Has to Offer', textStartX, 27.5);
//
//   // Golden accent divider line
//   doc.setDrawColor(...goldenSun);
//   doc.setLineWidth(0.85);
//   doc.line(14, 31, 196, 31);
//
//   // Product Title & Metadata
//   const sku = String(product.sku || product.id || '').trim();
//   doc.setFont('helvetica', 'bold');
//   doc.setFontSize(15);
//   doc.setTextColor(...darkText);
//   doc.text(product.title || product.name || 'Product Specification', 14, 43);
//
//   doc.setFontSize(9);
//   doc.setFont('helvetica', 'normal');
//   doc.setTextColor(...mutedText);
//   doc.text(`Category: ${product.category_label || product.category || 'N/A'} | SKU: ${sku}`, 14, 49);
//
//   // Logistics & Packaging Table Section
//   doc.setFont('helvetica', 'bold');
//   doc.setFontSize(11);
//   doc.setTextColor(...navyBlue);
//   doc.text('Logistics & Packaging Specifications', 14, 58);
//
//   const specsData = [
//     ['Packaging Format / Pack Size', product.pack || product.pack_size || 'N/A'],
//     ['Net Weight', product.weight || product.net_weight || 'N/A'],
//     ['Country of Origin', product.origin || product.country_of_origin || 'USA'],
//     ['Case Weight', product.case_weight || product.caseWeight || 'N/A'],
//     ['Case Cube', product.case_cube || product.caseCube || 'N/A'],
//     ['Case Dimensions', product.case_dimensions || product.caseDimensions || 'N/A'],
//     ['Cases Per Pallet', product.cases_per_pallet || product.casesPerPallet || 'N/A'],
//     ['Pallet Pattern', product.pallet_pattern || product.palletPattern || 'N/A']
//   ];
//
//   const autoTableFn = doc.autoTable || (window.jspdf && window.jspdf.autoTable);
//   autoTableFn.call(doc, {
//     startY: 61,
//     margin: { left: 14, right: 65 },
//     head: [['Specification Feature', 'Details']],
//     body: specsData,
//     theme: 'grid',
//     headStyles: { fillColor: navyBlue, textColor: [255, 255, 255] },
//     styles: { fontSize: 7.5, cellPadding: 1.5 }
//   });
//
//   // Render Product Image inside framed box
//   const defaultImage = 'images/ligo_Content-fullGrocery.jpg';
//   const candidateImageUrl = product.image_url || defaultImage;
//   let productImgData = await loadImageAsBase64(candidateImageUrl);
//   if (!productImgData) {
//     productImgData = await loadImageAsBase64(defaultImage);
//   }
//
//   if (productImgData) {
//     const imgBoxX = 150;
//     const imgBoxY = 61;
//     const imgBoxW = 42;
//     const imgBoxH = 45;
//
//     // Draw image placeholder border
//     doc.setDrawColor(200, 200, 200);
//     doc.setFillColor(252, 252, 252);
//     doc.roundedRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 2, 2, 'FD');
//
//     // Scale image while preserving aspect ratio
//     const ratio = Math.min(imgBoxW / productImgData.width, imgBoxH / productImgData.height);
//     const renderW = productImgData.width * ratio * 0.9;
//     const renderH = productImgData.height * ratio * 0.9;
//     const renderX = imgBoxX + (imgBoxW - renderW) / 2;
//     const renderY = imgBoxY + (imgBoxH - renderH) / 2;
//
//     doc.addImage(productImgData.dataURL, 'PNG', renderX, renderY, renderW, renderH);
//   }
//
//   // Nutrition Facts Section
//   let currentY = Math.max(doc.lastAutoTable.finalY, 110) + 10;
//   doc.setFont('helvetica', 'bold');
//   doc.setFontSize(11);
//   doc.setTextColor(...navyBlue);
//   doc.text(`FDA Nutrition Facts (Serving Size: ${product.serving_size || '1/2 cup'}, Servings: ${product.servings || product.servings_per_container || 'Approx. 4'})`, 14, currentY);
//
//   const totalFatVal = formatNutrient(product.total_fat || product.total_fat_g || '', 'g');
//   const sodiumVal = formatNutrient(product.sodium || product.sodium_mg || '', 'mg');
//   const carbsVal = formatNutrient(product.carbs || product.total_carbohydrates_g || '', 'g');
//   const fiberVal = formatNutrient(product.fiber || product.dietary_fiber_g || '', 'g');
//   const sugarsVal = formatNutrient(product.sugars || product.total_sugars_g || '', 'g');
//   const addedSugarsVal = formatNutrient(product.added_sugars || product.added_sugars_g || '', 'g');
//   const proteinVal = formatNutrient(product.protein || product.protein_g || '', 'g');
//   const vitDVal = formatNutrient(product.vitamin_d || product.vitamin_d_mcg || '', 'mcg');
//   const calciumVal = formatNutrient(product.calcium || product.calcium_mg || '', 'mg');
//   const ironVal = formatNutrient(product.iron || product.iron_mg || '', 'mg');
//   const potassiumVal = formatNutrient(product.potassium || product.potassium_mg || '', 'mg');
//
//   const nutritionData = [
//     ['Calories', String(product.calories || '0'), '-'],
//     ['Total Fat', totalFatVal, getDV(totalFatVal, 78)],
//     ['Sodium', sodiumVal, getDV(sodiumVal, 2300)],
//     ['Total Carbohydrates', carbsVal, getDV(carbsVal, 275)],
//     ['Dietary Fiber', fiberVal, getDV(fiberVal, 28)],
//     ['Total Sugars', sugarsVal, '-'],
//     ['Added Sugars', addedSugarsVal, getDV(addedSugarsVal, 50)],
//     ['Protein', proteinVal, '-'],
//     ['Vitamin D', vitDVal, getDV(vitDVal, 20)],
//     ['Calcium', calciumVal, getDV(calciumVal, 1300)],
//     ['Iron', ironVal, getDV(ironVal, 18)],
//     ['Potassium', potassiumVal, getDV(potassiumVal, 4700)]
//   ];
//
//   autoTableFn.call(doc, {
//     startY: currentY + 3,
//     margin: { left: 14, right: 14 },
//     head: [['Nutrient / Mineral / Vitamin', 'Amount Per Serving', '% Daily Value (% DV)*']],
//     body: nutritionData,
//     theme: 'striped',
//     headStyles: { fillColor: [70, 70, 70] },
//     styles: { fontSize: 8, cellPadding: 1.5 }
//   });
//
//   // FDA Disclaimer & Footer Details
//   let footerY = doc.lastAutoTable.finalY + 5;
//   doc.setFont('helvetica', 'italic');
//   doc.setFontSize(7);
//   doc.setTextColor(...mutedText);
//   doc.text('* The % Daily Value (DV) tells you how much a nutrient in a serving contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.', 14, footerY, { maxWidth: 182 });
//
//   const pageHeight = doc.internal.pageSize.getHeight();
//   doc.setDrawColor(...goldenSun);
//   doc.setLineWidth(0.5);
//   doc.line(14, pageHeight - 16, 196, pageHeight - 16);
//
//   doc.setFont('helvetica', 'bold');
//   doc.setFontSize(8);
//   doc.setTextColor(...navyBlue);
//   doc.text('LIBERTY GOLD FRUIT COMPANY LP', 14, pageHeight - 12);
//
//   doc.setFont('helvetica', 'normal');
//   doc.setFontSize(7.5);
//   doc.setTextColor(...mutedText);
//   doc.text('500 Eccles Avenue, South San Francisco, CA 94080 USA | Phone: (650) 583-4700 | Email: tim@libertygold.com', 14, pageHeight - 8);
//   doc.text('© 2026 Liberty Gold Fruit Co., Inc. All Rights Reserved.', 14, pageHeight - 4);
//
//   // Save and download generated PDF document
//   doc.save(`LIGO_Spec_${sku || 'product'}.pdf`);
// }

/**
 * Hides and deactivates the modal view.
 */
function closeModal() {
  const productModal = document.getElementById('productModal');
  if (productModal) {
    productModal.classList.remove('active');
    productModal.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Escapes unsafe special characters to prevent HTML XSS cross-site scripting vulnerabilities.
 * @param {string} str Raw string
 * @returns {string} Safe HTML escaped string
 */
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