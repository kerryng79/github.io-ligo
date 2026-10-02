document.addEventListener('DOMContentLoaded', () => {
  // Navigation Mobile Toggle
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

  // Interactive Product Catalog Filtering
  const searchInput = document.getElementById('productSearch');
  const filterChips = document.querySelectorAll('.chip');
  const productCards = document.querySelectorAll('.product-card');
  const catalogStatus = document.getElementById('catalogStatus');

  let activeCategory = 'all';
  let searchQuery = '';

  function filterProducts() {
    let visibleCount = 0;

    productCards.forEach(card => {
      const cardCategory = card.getAttribute('data-category');
      const cardTitle = card.getAttribute('data-title').toLowerCase();

      const matchesCategory = (activeCategory === 'all' || cardCategory === activeCategory);
      const matchesSearch = cardTitle.includes(searchQuery);

      if (matchesCategory && matchesSearch) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    if (catalogStatus) {
      catalogStatus.textContent = visibleCount === 0
          ? 'No products found matching your search parameters.'
          : `Showing ${visibleCount} product(s)`;
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      filterProducts();
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

      activeCategory = chip.getAttribute('data-filter');
      filterProducts();
    });
  });

  // Modal Spec Sheet & Nutrition Data Controller
  const productModal = document.getElementById('productModal');
  const modalClose = document.getElementById('modalClose');
  const modalTitle = document.getElementById('modalTitle');
  const modalDescription = document.getElementById('modalDescription');
  const specPack = document.getElementById('specPack');
  const specWeight = document.getElementById('specWeight');

  // Nutrition DOM Elements
  const nfServings = document.getElementById('nfServings');
  const nfServingSize = document.getElementById('nfServingSize');
  const nfCalories = document.getElementById('nfCalories');
  const nfTotalFat = document.getElementById('nfTotalFat');
  const nfTotalFatDV = document.getElementById('nfTotalFatDV');
  const nfSodium = document.getElementById('nfSodium');
  const nfSodiumDV = document.getElementById('nfSodiumDV');
  const nfCarbs = document.getElementById('nfCarbs');
  const nfCarbsDV = document.getElementById('nfCarbsDV');
  const nfFiber = document.getElementById('nfFiber');
  const nfFiberDV = document.getElementById('nfFiberDV');
  const nfSugars = document.getElementById('nfSugars');
  const nfAddedSugars = document.getElementById('nfAddedSugars');
  const nfAddedSugarsDV = document.getElementById('nfAddedSugarsDV');
  const nfProtein = document.getElementById('nfProtein');
  const nfPotassium = document.getElementById('nfPotassium');
  const nfPotassiumDV = document.getElementById('nfPotassiumDV');

  const productSpecData = {
    'peach-halves': {
      title: 'LIGO Yellow Cling Peach Halves in Heavy Syrup',
      desc: 'Selected yellow cling peach halves packed in heavy syrup (SKU: 72810 34076).',
      pack: '24 / 15 oz.',
      weight: '15 ounces (425g)',
      nutrition: {
        servings: 'Approx. 3.5',
        servingSize: '1/2 cup (128g)',
        calories: '100',
        caloriesFromFat: '0',
        totalFat: '0g',
        totalFatDV: '0%',
        saturatedFat: '0g',
        saturatedFatDV: '0%',
        transFat: '0g',
        cholesterol: '0mg',
        cholesterolDV: '0%',
        sodium: '10mg',
        sodiumDV: '0%',
        potassium: '110mg',
        potassiumDV: '3%',
        carbs: '24g',
        carbsDV: '8%',
        fiber: '1g',
        fiberDV: '4%',
        sugars: '23g',
        protein: '1g',
        vitaminA: '6%',
        vitaminC: '2%',
        calcium: '0%',
        iron: '0%'
      }
    },
    'peach-slices': {
      title: 'LIGO Sliced Yellow Cling Peaches in Light Syrup',
      desc: 'Uniformly sliced California yellow cling peaches in light syrup. Perfect for food service baking, retail dessert toppings, and yogurt breakfast pairings.',
      pack: '24 Cans x 425g',
      weight: '425g Net / 250g Drain',
      nutrition: {
        servings: 'about 3 servings per container',
        servingSize: '1/2 cup (140g)',
        calories: '80',
        totalFat: '0g',
        totalFatDV: '0%',
        sodium: '5mg',
        sodiumDV: '0%',
        carbs: '19g',
        carbsDV: '7%',
        fiber: '1g',
        fiberDV: '4%',
        sugars: '17g',
        addedSugars: '10g',
        addedSugarsDV: '20%',
        protein: '0g',
        potassium: '105mg',
        potassiumDV: '2%'
      }
    },
    'fruit-cocktail': {
      title: 'LIGO Fruit Cocktail in Heavy Syrup',
      desc: 'A premium blend of diced yellow peaches, diced Bartlett pears, whole seedless grapes, pineapple sectors, and halved maraschino cherries.',
      pack: '24 Cans x 825g',
      weight: '825g Net / 500g Drain',
      nutrition: {
        servings: 'about 6 servings per container',
        servingSize: '1/2 cup (140g)',
        calories: '100',
        totalFat: '0g',
        totalFatDV: '0%',
        sodium: '10mg',
        sodiumDV: '0%',
        carbs: '26g',
        carbsDV: '9%',
        fiber: '1g',
        fiberDV: '4%',
        sugars: '23g',
        addedSugars: '16g',
        addedSugarsDV: '32%',
        protein: '0g',
        potassium: '90mg',
        potassiumDV: '2%'
      }
    },
    'sweet-corn': {
      title: 'LIGO Super Sweet Whole Kernel Corn',
      desc: 'Sweet golden whole kernel corn grown and packed in the USA. Vacuum packed at peak harvest to lock in natural crispness.',
      pack: '24 Cans x 425g',
      weight: '425g Net / 280g Drain',
      nutrition: {
        servings: 'about 3.5 servings per container',
        servingSize: '1/2 cup (125g)',
        calories: '70',
        totalFat: '1g',
        totalFatDV: '1%',
        sodium: '220mg',
        sodiumDV: '10%',
        carbs: '15g',
        carbsDV: '5%',
        fiber: '2g',
        fiberDV: '7%',
        sugars: '4g',
        addedSugars: '0g',
        addedSugarsDV: '0%',
        protein: '2g',
        potassium: '180mg',
        potassiumDV: '4%'
      }
    },
    'pineapple-juice': {
      title: 'LIGO 100% Pure Pineapple Juice',
      desc: '100% pure unsweetened pineapple juice made from concentrate with added Vitamin C. Naturally refreshing and additive free.',
      pack: '24 Cans x 536ml',
      weight: '536ml Net / 560g',
      nutrition: {
        servings: 'about 2 servings per container',
        servingSize: '8 fl oz (240ml)',
        calories: '130',
        totalFat: '0g',
        totalFatDV: '0%',
        sodium: '10mg',
        sodiumDV: '0%',
        carbs: '32g',
        carbsDV: '12%',
        fiber: '1g',
        fiberDV: '4%',
        sugars: '28g',
        addedSugars: '0g',
        addedSugarsDV: '0%',
        protein: '1g',
        potassium: '300mg',
        potassiumDV: '6%'
      }
    },
    'pear-halves': {
      title: 'Liberty Gold Bartlett Pear Halves in Juice',
      desc: 'Hand-picked Pacific Northwest Bartlett pear halves packed in real fruit juice concentrate for a clean, natural sweet flavor profile.',
      pack: '12 Cans x 825g',
      weight: '825g Net / 465g Drain',
      nutrition: {
        servings: 'about 6 servings per container',
        servingSize: '1/2 cup (140g)',
        calories: '70',
        totalFat: '0g',
        totalFatDV: '0%',
        sodium: '5mg',
        sodiumDV: '0%',
        carbs: '18g',
        carbsDV: '7%',
        fiber: '2g',
        fiberDV: '7%',
        sugars: '14g',
        addedSugars: '0g',
        addedSugarsDV: '0%',
        protein: '0g',
        potassium: '115mg',
        potassiumDV: '2%'
      }
    }
  };

  document.querySelectorAll('[data-modal-trigger]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-modal-trigger');
      const data = productSpecData[key];

      if (data && productModal) {
        modalTitle.textContent = data.title;
        modalDescription.textContent = data.desc;
        specPack.textContent = data.pack;
        specWeight.textContent = data.weight;

        // Populate FDA Nutrition Panel
        if (data.nutrition) {
          nfServings.textContent = data.nutrition.servings;
          nfServingSize.textContent = data.nutrition.servingSize;
          nfCalories.textContent = data.nutrition.calories;
          nfTotalFat.textContent = data.nutrition.totalFat;
          nfTotalFatDV.textContent = data.nutrition.totalFatDV;
          nfSodium.textContent = data.nutrition.sodium;
          nfSodiumDV.textContent = data.nutrition.sodiumDV;
          nfCarbs.textContent = data.nutrition.carbs;
          nfCarbsDV.textContent = data.nutrition.carbsDV;
          nfFiber.textContent = data.nutrition.fiber;
          nfFiberDV.textContent = data.nutrition.fiberDV;
          nfSugars.textContent = data.nutrition.sugars;
          nfAddedSugars.textContent = data.nutrition.addedSugars;
          nfAddedSugarsDV.textContent = data.nutrition.addedSugarsDV;
          nfProtein.textContent = data.nutrition.protein;
          nfPotassium.textContent = data.nutrition.potassium;
          nfPotassiumDV.textContent = data.nutrition.potassiumDV;
        }

        productModal.classList.add('active');
        productModal.setAttribute('aria-hidden', 'false');
      }
    });
  });

  if (modalClose && productModal) {
    modalClose.addEventListener('click', () => {
      productModal.classList.remove('active');
      productModal.setAttribute('aria-hidden', 'true');
    });

    window.addEventListener('click', (e) => {
      if (e.target === productModal) {
        productModal.classList.remove('active');
        productModal.setAttribute('aria-hidden', 'true');
      }
    });
  }
});