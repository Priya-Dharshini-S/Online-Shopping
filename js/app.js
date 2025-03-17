const firebaseConfig = {
  apiKey: "AIzaSyC9vfDdT3MnkS4rWDFoP1r2maWTRP_RZSc",
  authDomain: "ecommerceapp-d574a.firebaseapp.com",
  projectId: "ecommerceapp-d574a",
  storageBucket: "ecommerceapp-d574a.firebasestorage.app",
  messagingSenderId: "746905420701",
  appId: "1:746905420701:web:233aeeebd98354ec09e574",
  measurementId: "G-CRJLZ8C8L5"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let currentOrder = null;
let allProducts = [];
let currentPage = 1;
const productsPerPage = 8;
let brands = new Set();
let supercoinsAvailable = 0;
let supercoinsUsed = 0;

// Popup Functions
function showPopup(title, message) {
  document.getElementById('popupTitle').innerText = title;
  document.getElementById('popupMessage').innerText = message;
  document.getElementById('customPopup').style.display = 'flex';
}

function closePopup() {
  document.getElementById('customPopup').style.display = 'none';
}

function showSection(sectionId) {
  // Hide all sections and remove 'active' class
  document.querySelectorAll('.section, .hero-section').forEach(section => {
    //   section.classList.add('hidden');
      section.classList.remove('active');
  });

  // Show the selected section
  let selectedSection = document.getElementById(sectionId);
  if (selectedSection) {
    //   selectedSection.classList.remove('hidden');
      selectedSection.classList.add('active');
  } else {
      console.error("Section not found: " + sectionId);
      return;
  }

  // Load content based on section using switch-case
  switch (sectionId) {
      
      case 'products':
          loadProducts('all');
          break;
      case 'cart':
          loadCart();
          break;
      case 'wishlist':
          loadWishlist();
          break;
      case 'history':
          loadHistory();
          break;
      case 'orders':
          loadOrders();
          break;
      
      default:
          console.warn("No specific function for this section.");
          break;
  }
}

function showAdminLogin() {
  showSection('adminLogin');
}

document.getElementById('registerForm').addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  if (email === 'priya@gmail.com') {
      document.getElementById('regMessage').innerText = "This email is reserved for admin!";
      return;
  }
  const userData = {
      name: document.getElementById('regName').value,
      age: parseInt(document.getElementById('regAge').value),
      gender: document.getElementById('regGender').value,
      phone: document.getElementById('regPhone').value,
      dateOfBirth: document.getElementById('regDob').value,
      email: email,
      credit: 0,
      supercoins: 0,
      cart: [],
      orderHistory: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  auth.createUserWithEmailAndPassword(email, password)
      .then(cred => {
          currentUser = cred.user;
          document.getElementById('regMessage').innerText = "Registration successful!";
          return db.collection('users').doc(currentUser.uid).set(userData);
      })
      .then(() => {
          showPopup("Success", "Registration successful!");
          setTimeout(() => {
              closePopup();
              showSection('home');
          }, 2000);
      })
      .catch(err => document.getElementById('regMessage').innerText = err.message);
});

document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  auth.signInWithEmailAndPassword(email, password)
      .then(cred => {
          currentUser = cred.user;
          document.getElementById('loginMessage').innerText = "Login successful!";
          loadSupercoins();
          showPopup("Success", "Login successful!");
          setTimeout(() => {
              closePopup();
              showSection('home');
          }, 2000);
      })
      .catch(err => document.getElementById('loginMessage').innerText = err.message);
});

document.getElementById('adminLoginForm').addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value;
  const password = document.getElementById('adminPassword').value;
  if (email !== 'priya@gmail.com' || password !== 'priya@123') {
      document.getElementById('adminLoginMessage').innerText = "Invalid admin credentials!";
      return;
  }
  auth.signInWithEmailAndPassword(email, password)
      .then(() => {
          document.getElementById('adminLoginMessage').innerText = "Admin login successful!";
          showPopup("Success", "Admin login successful!");
          window.location.href = 'admin.html'; // Redirect only after successful login
          // setTimeout(() => {
          //     closePopup();
          // }, ); // Syntax error here
      })
      .catch(err => document.getElementById('adminLoginMessage').innerText = err.message);
});

function showForgotPassword() {
  showSection('forgotPassword');
}

document.getElementById('forgotPasswordForm').addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('forgotEmail').value;
  auth.sendPasswordResetEmail(email)
      .then(() => {
          document.getElementById('forgotMessage').innerText = "Password reset link sent to your email!";
          setTimeout(() => showSection('login'), 3000);
      })
      .catch(err => document.getElementById('forgotMessage').innerText = err.message);
});

function continueGuest() {
  auth.signInAnonymously()
      .then(cred => {
          currentUser = cred.user;
          showPopup("Success", "Signed in as guest.");
          setTimeout(() => {
              closePopup();
              supercoinsAvailable = 0;
              showSection('home');
          }, 2000);
      })
      .catch(err => showPopup("Error", err.message));
}

function loadSupercoins() {
  if (!currentUser || currentUser.isAnonymous) return;
  db.collection('users').doc(currentUser.uid).get()
      .then(doc => {
          supercoinsAvailable = doc.data().supercoins || 0;
      });
}

function loadHomeProducts() {
    const homeProductsDiv = document.getElementById('homeProducts');
    homeProductsDiv.innerHTML = "Loading products...";
    db.collection('products').where('isActive', '==', true).get()
        .then(snapshot => {
            homeProductsDiv.innerHTML = "";
            snapshot.forEach(doc => {
                const prod = { id: doc.id, ...doc.data() };
                const imageUrl = prod.imageURLs && prod.imageURLs.length > 0 ? prod.imageURLs[0] : 'assets/images/nothing.png';
                const prodDiv = document.createElement('div');
                prodDiv.classList.add('product-card');
                const priceSymbol = prod.currency === 'INR' ? '₹' : '$';
                prodDiv.innerHTML = `
                    <div class="product-images" style="background-image: url('${imageUrl}');" onerror="this.style.backgroundImage='url(assets/images/nothing.png)'">
                        <div class="quick-view">Quick View</div>
                    </div>
                    <div class="product-info">
                        <h3 class="product-name">${prod.name}</h3>
                        <p>Brand: ${prod.brand}</p>
                        <p>Price: ${priceSymbol}${prod.price}</p>
                        ${prod.discountPrice ? `<p>Discount: ${priceSymbol}${prod.discountPrice}</p>` : ''}
                        <p>Availability: ${prod.availability}</p>
                    </div>
                    <div class="menu-icons">
                        <div class="wishlist-icon" onclick="addToWishlist('${prod.id}', '${prod.name}')"><i class="fas fa-heart"></i></div>
                        <div class="cart-icon" onclick="addToCart('${prod.id}', '${prod.name}')"><i class="fas fa-cart-plus"></i></div>
                    </div>
                `;
                homeProductsDiv.appendChild(prodDiv);
            });
        })
        .catch(err => {
            console.error("Error loading home products:", err);
            homeProductsDiv.innerHTML = "Error loading products.";
        });
  }

  function loadProducts(category) {
    const productsListDiv = document.getElementById('productsList');
    productsListDiv.innerHTML = `Loading ${category === 'all' ? 'all' : category} products...`;
    let query = db.collection('products').where('isActive', '==', true);
    if (category !== 'all') query = query.where('category', '==', category);

    query.get()
        .then(snapshot => {
            allProducts = [];
            brands.clear();
            document.getElementById('filterBrand').innerHTML = '<option value="all">All Brands</option>';
            snapshot.forEach(doc => {
                const prod = { id: doc.id, ...doc.data() };
                allProducts.push(prod);
                brands.add(prod.brand);
            });
            brands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand;
                option.text = brand;
                document.getElementById('filterBrand').appendChild(option);
            });
            applyFilters();
        })
        .catch(err => {
            console.error("Error loading products:", err);
            productsListDiv.innerHTML = "Error loading products.";
        });
}

function applyFilters(searchTerm = '') {
    const productsListDiv = document.getElementById('productsList');
    const filterAvailability = document.getElementById('filterAvailability').value;
    const sortBy = document.getElementById('sortBy').value;
    const filterBrand = document.getElementById('filterBrand').value;

    let filteredProducts = [...allProducts];

    // Apply search filter
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(prod => 
            prod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            prod.brand.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    if (filterAvailability === 'inStock') {
        filteredProducts = filteredProducts.filter(prod => prod.availability > 0);
    } else if (filterAvailability === 'outOfStock') {
        filteredProducts = filteredProducts.filter(prod => prod.availability <= 0);
    }

    if (filterBrand !== 'all') {
        filteredProducts = filteredProducts.filter(prod => prod.brand === filterBrand);
    }

    filteredProducts.sort((a, b) => {
        if (sortBy === 'nameAsc') return a.name.localeCompare(b.name);
        if (sortBy === 'nameDesc') return b.name.localeCompare(a.name);
        if (sortBy === 'priceAsc') return (a.discountPrice || a.price) - (b.discountPrice || b.price);
        if (sortBy === 'priceDesc') return (b.discountPrice || b.price) - (a.discountPrice || a.price);
        return 0;
    });

    productsListDiv.innerHTML = "";
    if (filteredProducts.length === 0) {
        productsListDiv.innerHTML = "No products match your criteria.";
        return;
    }

    filteredProducts.forEach(prod => {
        const imageUrl = prod.imageURLs && prod.imageURLs.length > 0 ? prod.imageURLs[0] : 'assets/images/nothing.png';
        const prodDiv = document.createElement('div');
        prodDiv.classList.add('product-card');
        const priceSymbol = prod.currency === 'INR' ? '₹' : '$';
        prodDiv.innerHTML = `
            <div class="product-image" style="background-image: url('${imageUrl}');" onerror="this.style.backgroundImage='url(assets/images/nothing.png)'">
                <div class="quick-view">Quick View</div>
            </div>
            <div class="product-info">
                <h3 class="product-name">${prod.name}</h3>
                <p>Brand: ${prod.brand}</p>
                <p>Price: ${priceSymbol}${prod.price}</p>
                ${prod.discountPrice ? `<p>Discount: ${priceSymbol}${prod.discountPrice}</p>` : ''}
                <p>Availability: ${prod.availability}</p>
            </div>
            <div class="menu-icons">
                <div class="wishlist-icon" onclick="addToWishlist('${prod.id}', '${prod.name}')"><i class="fas fa-heart"></i></div>
                <div class="cart-icon" onclick="addToCart('${prod.id}', '${prod.name}')"><i class="fas fa-cart-plus"></i></div>
            </div>
        `;
        productsListDiv.appendChild(prodDiv);
    });
}

function searchProducts() {
    const searchTerm = document.getElementById('productSearch').value;
    applyFilters(searchTerm);
}

function addToCart(productId, name) {
  if (!currentUser) {
      showPopup("Error", "Please login first!");
      setTimeout(closePopup, 2000);
      return;
  }
  db.collection('products').doc(productId).get()
      .then(doc => {
          if (!doc.exists || doc.data().availability <= 0) {
              showPopup("Error", "Product is out of stock!");
              setTimeout(closePopup, 2000);
              return;
          }
          const prod = doc.data();
          const price = prod.discountPrice || prod.price || 0;
          const imageUrl = prod.imageURLs && prod.imageURLs.length > 0 ? prod.imageURLs[0] : 'assets/images/nothing.png';
          const currency = prod.currency || 'USD';
          const cartRef = db.collection('users').doc(currentUser.uid).collection('cart');
          cartRef.where('productId', '==', productId).get()
              .then(snapshot => {
                  if (snapshot.empty) {
                      cartRef.add({
                          productId: productId,
                          name: name,
                          price: price,
                          currency: currency,
                          brand: prod.brand,
                          discountPrice: prod.discountPrice || null,
                          availability: prod.availability,
                          imageUrl: imageUrl,
                          quantity: 1,
                          addedAt: firebase.firestore.FieldValue.serverTimestamp()
                      }).then(() => {
                          showPopup("Success", `${name} added to cart.`);
                          setTimeout(closePopup, 2000);
                          loadCart();
                          updateCartCount();
                      });
                  } else {
                      const doc = snapshot.docs[0];
                      const newQuantity = doc.data().quantity + 1;
                      if (newQuantity > prod.availability) {
                          showPopup("Error", "Cannot add more items than available stock!");
                          setTimeout(closePopup, 2000);
                          return;
                      }
                      cartRef.doc(doc.id).update({
                          quantity: newQuantity
                      }).then(() => {
                          showPopup("Success", `${name} quantity updated in cart.`);
                          setTimeout(closePopup, 2000);
                          loadCart();
                          updateCartCount();
                      });
                  }
              });
      });
}

function loadCart() {
    if (!currentUser) {
        showPopup("Error", "Please login first!");
        setTimeout(closePopup, 2000);
        return;
    }
    const cartListDiv = document.getElementById('cartList');
    cartListDiv.innerHTML = "";
    db.collection('users').doc(currentUser.uid).collection('cart').get()
        .then(snapshot => {
            if (snapshot.empty) {
                cartListDiv.innerHTML = "Your cart is empty.";
                return;
            }
            snapshot.forEach(doc => {
                const item = doc.data();
                const totalPrice = item.price * item.quantity;
                const priceSymbol = item.currency === 'INR' ? '₹' : '$';
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('product-card');
                itemDiv.innerHTML = `
                    <div class="product-image" style="background-image: url('${item.imageUrl || 'assets/images/nothing.png'}');" onerror="this.style.backgroundImage='url(assets/images/nothing.png)'"></div>
                    <div class="product-info">
                        <h3 class="product-name">${item.name} x${item.quantity}</h3>
                        <p>Brand: ${item.brand}</p>
                        <p>Price: ${priceSymbol}${item.price}</p>
                        ${item.discountPrice ? `<p>Discount: ${priceSymbol}${item.discountPrice}</p>` : ''}
                        <p>Total: ${priceSymbol}${totalPrice}</p>
                        <p>Availability: ${item.availability}</p>
                        <div class="quantity-controls">
                            <button onclick="updateCartQuantity('${doc.id}', ${item.quantity + 1}, '${item.productId}')">+</button>
                            <button onclick="updateCartQuantity('${doc.id}', ${item.quantity - 1}, '${item.productId}')">-</button>
                            <button onclick="deleteCartItem('${doc.id}')">Delete</button>
                        </div>
                    </div>
                `;
                cartListDiv.appendChild(itemDiv);
            });
            updateCartCount();
        })
        .catch(err => console.error(err));
  }

function updateCartQuantity(docId, newQuantity, productId) {
  const cartRef = db.collection('users').doc(currentUser.uid).collection('cart').doc(docId);
  db.collection('products').doc(productId).get().then(prodDoc => {
      const availability = prodDoc.data().availability;
      if (newQuantity > availability) {
          showPopup("Error", "Cannot increase quantity beyond available stock!");
          setTimeout(closePopup, 2000);
          return;
      }
      if (newQuantity <= 0) {
          cartRef.delete().then(() => loadCart());
      } else {
          cartRef.update({ quantity: newQuantity }).then(() => loadCart());
      }
  });
}

function deleteCartItem(docId) {
  if (!currentUser) {
      showPopup("Error", "Please login first!");
      setTimeout(closePopup, 2000);
      return;
  }
  const cartRef = db.collection('users').doc(currentUser.uid).collection('cart').doc(docId);
  cartRef.delete()
      .then(() => {
          showPopup("Success", "Item removed from cart.");
          setTimeout(closePopup, 2000);
          loadCart();
      })
      .catch(err => showPopup("Error", "Error removing item: " + err.message));
}

function addToWishlist(productId, name) {
  if (!currentUser) {
      showPopup("Error", "Please login first!");
      setTimeout(closePopup, 2000);
      return;
  }
  const wishlistRef = db.collection('wishlist').doc(`${currentUser.uid}_${productId}`);
  db.collection('products').doc(productId).get().then(doc => {
      const prod = doc.data();
      const price = prod.discountPrice || prod.price || 0;
      const imageUrl = prod.imageURLs && prod.imageURLs.length > 0 ? prod.imageURLs[0] : 'assets/images/nothing.png';
      const currency = prod.currency || 'USD';
      wishlistRef.get().then(wishDoc => {
          if (wishDoc.exists) {
              wishlistRef.update({
                  quantity: wishDoc.data().quantity + 1,
                  addedAt: firebase.firestore.FieldValue.serverTimestamp()
              }).then(() => {
                  showPopup("Success", `${name} quantity updated in wishlist.`);
                  setTimeout(closePopup, 2000);
                  loadWishlist();
              });
          } else {
              wishlistRef.set({
                  userId: currentUser.uid,
                  productId: productId,
                  name: name,
                  price: price,
                  currency: currency,
                  brand: prod.brand,
                  discountPrice: prod.discountPrice || null,
                  availability: prod.availability,
                  imageUrl: imageUrl,
                  quantity: 1,
                  addedAt: firebase.firestore.FieldValue.serverTimestamp()
              }).then(() => {
                  showPopup("Success", `${name} added to wishlist.`);
                  setTimeout(closePopup, 2000);
                  loadWishlist();
              });
          }
      });
  }).catch(err => showPopup("Error", err.message));
}

function loadWishlist() {
    if (!currentUser) {
        showPopup("Error", "Please login first!");
        setTimeout(closePopup, 2000);
        return;
    }
  
    const wishlistListDiv = document.getElementById('wishlistList');
    wishlistListDiv.innerHTML = "Loading wishlist...";
  
    // Use onSnapshot for live updates
    const unsubscribe = db.collection('wishlist')
        .where("userId", "==", currentUser.uid)
        .onSnapshot(snapshot => {
            wishlistListDiv.innerHTML = ""; // Clear the list before rendering
            if (snapshot.empty) {
                wishlistListDiv.innerHTML = "Your wishlist is empty.";
                return;
            }
  
            snapshot.forEach(doc => {
                const item = doc.data();
                const itemId = doc.id; // Get the document ID for removal
                const priceSymbol = item.currency === 'INR' ? '₹' : '$';
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('product-card');
  
                // Make the entire card clickable to navigate to the product page
                itemDiv.style.cursor = 'pointer';
                itemDiv.onclick = (e) => {
                    // Prevent navigation if the remove icon is clicked
                    if (e.target.classList.contains('remove-icon') || e.target.closest('.remove-icon')) {
                        return;
                    }
                    // Navigate to the product page (adjust the URL structure as needed)
                    window.location.href = `product.html?id=${item.productId}`;
                };
  
                itemDiv.innerHTML = `
                    <div class="product-image" style="background-image: url('${item.imageUrl || 'assets/images/nothing.png'}');" onerror="this.style.backgroundImage='url(assets/images/nothing.png)'">
                        <div class="quick-view">Quick View</div>
                    </div>
                    <div class="product-info">
                        <h3 class="product-name">${item.name}</h3> <!-- Removed quantity -->
                        <p>Brand: ${item.brand}</p>
                        <p>Price: ${priceSymbol}${item.price}</p>
                        ${item.discountPrice ? `<p>Discount: ${priceSymbol}${item.discountPrice}</p>` : ''}
                        <p>Availability: ${item.availability}</p>
                        <div class="remove-icon" onclick="removeFromWishlist('${itemId}', event)">
                            <i class="fas fa-trash-alt"></i>
                        </div>
                    </div>
                `;
                wishlistListDiv.appendChild(itemDiv);
            });
        }, err => {
            console.error("Error loading wishlist:", err);
            wishlistListDiv.innerHTML = "Error loading wishlist.";
        });
  
    // Return the unsubscribe function to stop listening when needed (optional)
    return unsubscribe;
  }
  
  // Function to remove an item from the wishlist
  function removeFromWishlist(itemId, event) {
    event.stopPropagation(); // Prevent the card click event from triggering navigation
    db.collection('wishlist').doc(itemId).delete()
        .then(() => {
            showPopup("Success", "Item removed from wishlist.");
            setTimeout(closePopup, 2000);
        })
        .catch(err => {
            console.error("Error removing item from wishlist:", err);
            showPopup("Error", "Failed to remove item from wishlist.");
            setTimeout(closePopup, 2000);
        });
  }

function placeOrder() {
  if (!currentUser) {
      showPopup("Error", "Please login first!");
      setTimeout(closePopup, 2000);
      return;
  }
  const userCartRef = db.collection('users').doc(currentUser.uid).collection('cart');
  userCartRef.get().then(snapshot => {
      if (snapshot.empty) {
          showPopup("Error", "Your cart is empty!");
          setTimeout(closePopup, 2000);
          return;
      }
      let cartItems = [];
      snapshot.forEach(doc => cartItems.push({ id: doc.id, ...doc.data() }));
      const variants = cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          currency: item.currency,
          name: item.name,
          brand: item.brand,
          discountPrice: item.discountPrice,
          availability: item.availability,
          imageUrl: item.imageUrl
      }));
      const totalAmountUSD = variants.reduce((sum, item) => {
          const priceUSD = item.currency === 'INR' ? item.price / 83 : item.price;
          return sum + (priceUSD * item.quantity);
      }, 0);

      const batch = db.batch();
      let stockValid = true;
      cartItems.forEach(item => {
          const productRef = db.collection('products').doc(item.productId);
          db.runTransaction(transaction => {
              return transaction.get(productRef).then(doc => {
                  const currentAvailability = doc.data().availability;
                  if (currentAvailability < item.quantity) {
                      stockValid = false;
                      throw new Error(`Insufficient stock for ${item.name}. Only ${currentAvailability} left.`);
                  }
                  transaction.update(productRef, { availability: currentAvailability - item.quantity });
              });
          }).catch(err => {
              showPopup("Error", err.message);
              setTimeout(closePopup, 2000);
              stockValid = false;
          });
      });

      if (!stockValid) return;

      db.collection('orders').add({
          userId: currentUser.uid,
          items: variants,
          totalAmountUSD: totalAmountUSD,
          status: 'ordered',
          paymentStatus: 'pending',
          orderDate: firebase.firestore.FieldValue.serverTimestamp()
      }).then(orderRef => {
          currentOrder = { id: orderRef.id, totalAmountUSD, cartItems: snapshot };
          document.getElementById('paymentAmount').innerText = totalAmountUSD.toFixed(2);
          document.getElementById('supercoinsAvailable').innerText = supercoinsAvailable;
          document.getElementById('paymentModal').style.display = 'flex';
          togglePaymentFields();
      });
  });
}

function applySupercoins() {
  const supercoinsInput = parseInt(document.getElementById('supercoinsToUse').value) || 0;
  if (supercoinsInput > supercoinsAvailable) {
      showPopup("Error", "You don't have enough supercoins!");
      setTimeout(closePopup, 2000);
      return;
  }
  if (supercoinsInput < 0) {
      showPopup("Error", "Supercoins cannot be negative!");
      setTimeout(closePopup, 2000);
      return;
  }
  supercoinsUsed = supercoinsInput;
  const totalAmountUSD = currentOrder.totalAmountUSD - (supercoinsUsed / 83);
  document.getElementById('paymentAmount').innerText = totalAmountUSD.toFixed(2);
}

function togglePaymentFields() {
  const method = document.getElementById('paymentMethod').value;
  const cardDetails = document.getElementById('cardDetails');
  const upiDetails = document.getElementById('upiDetails');
  cardDetails.style.display = (method === 'credit_card' || method === 'debit_card') ? 'block' : 'none';
  upiDetails.style.display = method === 'upi' ? 'block' : 'none';
}

function processPayment() {
  if (!currentOrder || !currentUser) {
      showPopup("Error", "Order or user not found!");
      setTimeout(closePopup, 2000);
      return;
  }
  const paymentMethod = document.getElementById('paymentMethod').value;
  const transactionId = `TXN${Date.now()}`;
  const finalAmountUSD = currentOrder.totalAmountUSD - (supercoinsUsed / 83);

  if (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') {
      const cardNumber = document.getElementById('cardNumber').value;
      const cvv = document.getElementById('cvv').value;
      const expiryDate = document.getElementById('expiryDate').value;

      if (!cardNumber || cardNumber.length !== 16 || !/^\d+$/.test(cardNumber)) {
          showPopup("Error", "Please enter a valid 16-digit card number.");
          setTimeout(closePopup, 2000);
          return;
      }
      if (!cvv || cvv.length !== 3 || !/^\d+$/.test(cvv)) {
          showPopup("Error", "Please enter a valid 3-digit CVV.");
          setTimeout(closePopup, 2000);
          return;
      }
      if (!expiryDate) {
          showPopup("Error", "Please enter a valid expiry date.");
          setTimeout(closePopup, 2000);
          return;
      }
  } else if (paymentMethod === 'upi') {
      const upiId = document.getElementById('upiId').value;
      if (!upiId || !/^[a-zA-Z0-9]+@[a-zA-Z0-9]+$/.test(upiId)) {
          showPopup("Error", "Please enter a valid UPI ID (e.g., user@upi).");
          setTimeout(closePopup, 2000);
          return;
      }
  }

  setTimeout(() => {
      db.collection('payments').add({
          userId: currentUser.uid,
          orderId: currentOrder.id,
          amount: finalAmountUSD,
          supercoinsUsed: supercoinsUsed,
          paymentMethod: paymentMethod,
          transactionId: transactionId,
          status: 'completed',
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
          db.collection('orders').doc(currentOrder.id).update({
              status: 'confirmed',
              paymentStatus: 'paid',
              supercoinsUsed: supercoinsUsed
          }).then(() => {
              currentOrder.cartItems.forEach(doc => doc.ref.delete());
              const totalINR = currentOrder.totalAmountUSD * 83;
              const supercoinsEarned = totalINR >= 500 ? 10 : 0;
              db.collection('users').doc(currentUser.uid).update({
                  orderHistory: firebase.firestore.FieldValue.arrayUnion(currentOrder.id),
                  supercoins: firebase.firestore.FieldValue.increment(supercoinsEarned - supercoinsUsed)
              }).then(() => {
                  generateInvoice(currentOrder, transactionId, paymentMethod, supercoinsEarned);
                  showPopup("Success", `Payment successful! Order confirmed. ${supercoinsEarned} supercoins earned. Invoice downloaded.`);
                  setTimeout(closePopup, 2000);
                  closePaymentModal();
                  loadCart();
                  loadSupercoins();
                  currentOrder = null;
                  supercoinsUsed = 0;
              });
          });
      }).catch(err => {
          showPopup("Error", "Payment failed: " + err.message);
          setTimeout(closePopup, 2000);
          db.collection('orders').doc(currentOrder.id).update({
              status: 'failed',
              paymentStatus: 'failed'
          });
      });
  }, 1000);
}

function generateInvoice(order, transactionId, paymentMethod, supercoinsEarned) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("VESTE Invoice", 105, 20, { align: "center" });
  doc.setFontSize(10);
  doc.text("VESTE Pvt. Ltd.", 20, 30);
  doc.text("500 Terry Francine Street, San Francisco, CA 94158", 20, 35);
  doc.text("GSTIN: 12ABCDE3456F1Z5", 20, 40);
  doc.text(`Invoice No: ${transactionId}`, 150, 30);
  doc.text(`Date: ${new Date().toLocaleString()}`, 150, 35);

  db.collection('users').doc(currentUser.uid).get().then(userDoc => {
      const userData = userDoc.data();
      doc.setFontSize(12);
      doc.text("Bill To:", 20, 50);
      doc.setFontSize(10);
      doc.text(`${userData.name}`, 20, 55);
      doc.text(`${userData.email}`, 20, 60);
      doc.text(`${userData.phone}`, 20, 65);

      doc.setFontSize(12);
      doc.text("Order Details:", 20, 75);
      doc.setFontSize(10);
      let yPos = 85;
      doc.text("S.No", 20, yPos);
      doc.text("Item", 35, yPos);
      doc.text("Qty", 85, yPos);
      doc.text("Unit Price", 105, yPos);
      doc.text("Discount", 135, yPos);
      doc.text("Total", 165, yPos);
      yPos += 5;
      doc.line(20, yPos, 190, yPos);
      yPos += 5;

      let subtotalINR = 0;
      order.cartItems.forEach((item, index) => {
          const priceINR = item.data().currency === 'INR' ? item.data().price : item.data().price * 83;
          const discountINR = item.data().discountPrice ? (item.data().currency === 'INR' ? item.data().discountPrice : item.data().discountPrice * 83) : null;
          const totalINR = (discountINR || priceINR) * item.data().quantity;
          subtotalINR += totalINR;
          doc.text(`${index + 1}`, 20, yPos);
          doc.text(item.data().name, 35, yPos);
          doc.text(`${item.data().quantity}`, 85, yPos);
          doc.text(`₹${priceINR.toFixed(2)}`, 105, yPos);
          doc.text(discountINR ? `₹${discountINR.toFixed(2)}` : '-', 135, yPos);
          doc.text(`₹${totalINR.toFixed(2)}`, 165, yPos);
          yPos += 10;
      });

      doc.line(20, yPos, 190, yPos);
      yPos += 5;
      doc.text(`Subtotal: ₹${subtotalINR.toFixed(2)}`, 150, yPos);
      yPos += 10;
      doc.text(`Supercoins Used: ${supercoinsUsed} (₹${supercoinsUsed.toFixed(2)})`, 150, yPos);
      yPos += 10;
      const finalINR = subtotalINR - supercoinsUsed;
      doc.text(`Total: ₹${finalINR.toFixed(2)} ($${finalINR / 83})`, 150, yPos);
      yPos += 10;
      doc.text(`Supercoins Earned: ${supercoinsEarned}`, 150, yPos);

      yPos += 20;
      doc.setFontSize(8);
      doc.text("Thank you for shopping with VESTE! For queries, contact support@veste.com", 105, yPos, { align: "center" });
      yPos += 5;
      doc.text("Terms & Conditions apply. All prices inclusive of taxes.", 105, yPos, { align: "center" });

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=OrderID:${order.id},TransactionID:${transactionId}`;
      const qrImage = new Image();
      qrImage.crossOrigin = "Anonymous";
      qrImage.src = qrUrl;

      qrImage.onload = () => {
          yPos += 20;
          doc.addImage(qrImage, 'PNG', 80, yPos, 50, 50);
          doc.save(`invoice_${order.id}.pdf`);
      };

      qrImage.onerror = () => {
          console.error("Failed to load QR code.");
          yPos += 20;
          doc.text("QR Code unavailable", 105, yPos, { align: "center" });
          doc.save(`invoice_${order.id}.pdf`);
      };
  });
}

function closePaymentModal() {
  document.getElementById('paymentModal').style.display = 'none';
  document.getElementById('cardDetails').style.display = 'none';
  document.getElementById('upiDetails').style.display = 'none';
  supercoinsUsed = 0;
}

function loadHistory() {
  if (!currentUser) {
    showPopup("Error", "Please login first!");
    setTimeout(closePopup, 2000);
    return;
  }
  
  const historyListDiv = document.getElementById('historyList');
  historyListDiv.innerHTML = "";
  
  db.collection('orders').where("userId", "==", currentUser.uid).get()
    .then(snapshot => {
      if (snapshot.empty) {
        historyListDiv.innerHTML = '<div class="empty-state">No orders yet.</div>';
        return;
      }
      
      snapshot.forEach(doc => {
        const order = doc.data();
        const orderDate = order.orderDate.toDate().toLocaleString();
        const orderContainer = document.createElement('div');
        orderContainer.classList.add('orders-container');
        
        // Create individual order cards for each item
        order.items.forEach(item => {
          const orderCard = document.createElement('div');
          orderCard.classList.add('order-card');
          
          const priceSymbol = item.currency === 'INR' ? '₹' : '$';
          const discountText = item.discountPrice ? 
            `<p class="discount">Discount: ${priceSymbol}${item.discountPrice}</p>` : '';
          
          orderCard.innerHTML = `
            <div class="order-header">
              <h3>Order on ${orderDate}</h3>
            </div>
            <div class="order-content">
              <div class="product-images">
                ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}">` : ''}
              </div>
              <div class="product-details">
                <h4>${item.name} x${item.quantity}</h4>
                <p class="brand">Brand: ${item.brand}</p>
                <p class="price">Price: ${priceSymbol}${item.price}</p>
                ${discountText}
                <p class="availability">Availability: ${item.availability}</p>
              </div>
            </div>
          `;
          
          orderContainer.appendChild(orderCard);
        });
        
        // Add order summary section
        const orderSummary = document.createElement('div');
        orderSummary.classList.add('order-summary');
        orderSummary.innerHTML = `
          <p class="total">Total: $${order.totalAmountUSD.toFixed(2)}</p>
          <p class="status ${order.paymentStatus.toLowerCase()}">${order.paymentStatus}</p>
        `;
        
        orderContainer.appendChild(orderSummary);
        historyListDiv.appendChild(orderContainer);
      });
    })
    .catch(err => {
      console.error("Error loading order history:", err);
      historyListDiv.innerHTML = '<div class="error-state">Error loading orders. Please try again.</div>';
    });
}

function loadOrders() {
  if (!currentUser) {
    showPopup("Error", "Please login first!");
    setTimeout(closePopup, 2000);
    return;
  }
  
  const ordersListDiv = document.getElementById('ordersList');
  ordersListDiv.innerHTML = '<div class="loading">Loading your orders...</div>';
  
  db.collection('orders').where("userId", "==", currentUser.uid)
    .orderBy("orderDate", "desc") // Show newest orders first
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        ordersListDiv.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-box-open"></i>
            <p>You haven't placed any orders yet.</p>
            <a href="#shop" class="btn-shop">Start Shopping</a>
          </div>`;
        return;
      }
      
      ordersListDiv.innerHTML = '';
      snapshot.forEach(doc => {
        const order = doc.data();
        const orderDiv = document.createElement('div');
        orderDiv.classList.add('order-card');
        
        const orderDate = order.orderDate.toDate().toLocaleString();
        const status = order.status === 'ordered' ? 'Ordered' :
                      order.status === 'shipped' ? 'Shipped' :
                      order.status === 'out_for_delivery' ? 'Out for Delivery' :
                      order.status === 'delivered' ? 'Delivered' : order.status;
        
        // Calculate order summary
        let itemCount = 0;
        order.items.forEach(item => itemCount += item.quantity);
        
        // Create order header
        let orderHeader = `
          <div class="order-header">
            <div class="order-id">
              <span class="label">Order ID:</span> 
              <span class="value">${doc.id.slice(-8).toUpperCase()}</span>
            </div>
            <div class="order-date">
              <span class="label">Placed on:</span> 
              <span class="value">${orderDate}</span>
            </div>
            <div class="order-status status-${order.status || 'ordered'}">
              ${status}
            </div>
          </div>`;
        
        // Create items preview
        let itemsPreview = `<div class="order-items-preview">`;
        
        // Show up to 3 item images as preview
        const previewItems = order.items.slice(0, 3);
        previewItems.forEach(item => {
          itemsPreview += `
            <div class="item-preview" style="background-image: url('${item.imageUrl || 'assets/images/nothing.png'}');" 
                onerror="this.style.backgroundImage='url(assets/images/nothing.png)'"></div>`;
        });
        
        // Add indicator if there are more items
        if (order.items.length > 3) {
          itemsPreview += `<div class="item-preview more">+${order.items.length - 3}</div>`;
        }
        
        itemsPreview += `</div>`;
        
        // Create order summary
        let orderSummary = `
          <div class="order-summary">
            <div class="item-count">${itemCount} ${itemCount === 1 ? 'item' : 'items'}</div>
            <div class="order-total">${formatPrice(order.totalAmountUSD, 'USD')}</div>
          </div>`;
        
        // Create order actions
        let orderActions = `
          <div class="order-actions">
            <button class="btn-details" onclick="showOrderDetails('${doc.id}')">
              <i class="fas fa-eye"></i> View Details
            </button>
            <button class="btn-track" onclick="trackOrder('${doc.id}')">
              <i class="fas fa-truck"></i> Track Order
            </button>
          </div>`;
        
        // Add order progress indicator for non-delivered orders
        let orderProgress = '';
        if (order.status !== 'delivered') {
          const progressSteps = ['ordered', 'shipped', 'out_for_delivery', 'delivered'];
          const currentStepIndex = progressSteps.indexOf(order.status || 'ordered');
          
          orderProgress = `<div class="order-progress">`;
          
          progressSteps.forEach((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            orderProgress += `
              <div class="progress-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
                <div class="step-dot"></div>
                <div class="step-label">${step.charAt(0).toUpperCase() + step.slice(1).replace(/_/g, ' ')}</div>
              </div>`;
            
            // Add connector line between steps
            if (index < progressSteps.length - 1) {
              orderProgress += `<div class="step-connector ${isCompleted ? 'completed' : ''}"></div>`;
            }
          });
          
          orderProgress += `</div>`;
        }
        
        // Assemble the order card
        orderDiv.innerHTML = orderHeader + itemsPreview + orderSummary + orderProgress + orderActions;
        ordersListDiv.appendChild(orderDiv);
      });
    })
    .catch(err => {
      console.error("Error loading orders:", err);
      ordersListDiv.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-circle"></i>
          <p>There was a problem loading your orders.</p>
          <button onclick="loadOrders()" class="btn-retry">Try Again</button>
        </div>`;
    });
}

// Helper function to format currency
function formatPrice(amount, currency) {
  const symbol = currency === 'INR' ? '₹' : '$';
  return `${symbol}${parseFloat(amount).toFixed(2)}`;
}

// Function to display order details in a modal
function showOrderDetails(orderId) {
  // Create a modal for showing detailed order information
  const modal = document.createElement('div');
  modal.classList.add('modal');
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Order Details</h3>
        <span class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
      </div>
      <div class="modal-body">
        <div id="orderDetail" class="loading">Loading order details...</div>
      </div>
    </div>`;
  
  document.body.appendChild(modal);
  
  // Load the order details
  db.collection('orders').doc(orderId).get()
    .then(doc => {
      if (!doc.exists) {
        document.getElementById('orderDetail').innerHTML = 'Order not found.';
        return;
      }
      
      const order = doc.data();
      const orderDate = order.orderDate.toDate().toLocaleString();
      const status = order.status === 'ordered' ? 'Ordered' :
                    order.status === 'shipped' ? 'Shipped' :
                    order.status === 'out_for_delivery' ? 'Out for Delivery' :
                    order.status === 'delivered' ? 'Delivered' : order.status;
      
      let orderDetails = `
        <div class="order-detail-header">
          <div>
            <div class="detail-label">Order ID:</div>
            <div class="detail-value">${orderId.slice(-8).toUpperCase()}</div>
          </div>
          <div>
            <div class="detail-label">Date:</div>
            <div class="detail-value">${orderDate}</div>
          </div>
          <div>
            <div class="detail-label">Status:</div>
            <div class="detail-value status-${order.status || 'ordered'}">${status}</div>
          </div>
        </div>
        
        <h4>Items</h4>
        <div class="order-items-detail">`;
      
      // Add each item in detail
      order.items.forEach(item => {
        const priceSymbol = item.currency === 'INR' ? '₹' : '$';
        const itemTotal = item.quantity * (item.discountPrice || item.price);
        
        orderDetails += `
          <div class="order-item">
            <div class="item-image" style="background-image: url('${item.imageUrl || 'assets/images/nothing.png'}');" 
                onerror="this.style.backgroundImage='url(assets/images/nothing.png)'"></div>
            <div class="item-details">
              <div class="item-name">${item.name}</div>
              <div class="item-meta">
                <div class="item-brand">Brand: ${item.brand}</div>
                <div class="item-quantity">Quantity: ${item.quantity}</div>
              </div>
              <div class="item-price">
                ${item.discountPrice ? 
                  `<div class="original-price">${priceSymbol}${item.price}</div>
                   <div class="discount-price">${priceSymbol}${item.discountPrice}</div>` : 
                  `<div>${priceSymbol}${item.price}</div>`}
              </div>
              <div class="item-total">
                Total: ${priceSymbol}${itemTotal.toFixed(2)}
              </div>
            </div>
          </div>`;
      });
      
      orderDetails += `</div>`;
      
      // Add shipping address if available
      if (order.shippingAddress) {
        orderDetails += `
          <h4>Shipping Address</h4>
          <div class="shipping-address">
            <p>${order.shippingAddress.name || ''}</p>
            <p>${order.shippingAddress.street || ''}</p>
            <p>${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} ${order.shippingAddress.zip || ''}</p>
            <p>${order.shippingAddress.country || ''}</p>
          </div>`;
      }
      
      // Add payment information
      orderDetails += `
        <h4>Payment Information</h4>
        <div class="payment-info">
          <div class="payment-method">
            <div class="detail-label">Payment Method:</div>
            <div class="detail-value">${order.paymentMethod || 'Not specified'}</div>
          </div>
          <div class="payment-status">
            <div class="detail-label">Payment Status:</div>
            <div class="detail-value">${order.paymentStatus || 'Not specified'}</div>
          </div>
        </div>
        
        <div class="order-summary-detail">
          <div class="summary-row">
            <div class="summary-label">Subtotal:</div>
            <div class="summary-value">${formatPrice(order.subtotalAmountUSD || order.totalAmountUSD, 'USD')}</div>
          </div>
          ${order.shippingAmountUSD ? `
            <div class="summary-row">
              <div class="summary-label">Shipping:</div>
              <div class="summary-value">${formatPrice(order.shippingAmountUSD, 'USD')}</div>
            </div>` : ''}
          ${order.taxAmountUSD ? `
            <div class="summary-row">
              <div class="summary-label">Tax:</div>
              <div class="summary-value">${formatPrice(order.taxAmountUSD, 'USD')}</div>
            </div>` : ''}
          <div class="summary-row total">
            <div class="summary-label">Total:</div>
            <div class="summary-value">${formatPrice(order.totalAmountUSD, 'USD')}</div>
          </div>
        </div>`;
      
      document.getElementById('orderDetail').innerHTML = orderDetails;
    })
    .catch(err => {
      console.error("Error loading order details:", err);
      document.getElementById('orderDetail').innerHTML = 'Error loading order details. Please try again.';
    });
}

// Function to track order (placeholder)
function trackOrder(orderId) {
  showPopup("Tracking Information", "Tracking feature coming soon!");
  setTimeout(closePopup, 3000);
}

function logout() {
  auth.signOut().then(() => {
      currentUser = null;
      showPopup("Success", "Logged out successfully.");
      setTimeout(() => {
          closePopup();
          showSection('home');
          window.location.href = 'index.html';
      }, 2000);
  });
}

function updateCartCount() {
  if (!currentUser) {
      document.querySelector('.cart-count').textContent = '0';
      return;
  }
  db.collection('users').doc(currentUser.uid).collection('cart').get()
      .then(snapshot => {
          const count = snapshot.docs.reduce((sum, doc) => sum + doc.data().quantity, 0);
          document.querySelector('.cart-count').textContent = count;
      });
}

// Function to update navigation based on authentication state
function updateNavigation(user) {
  // Elements that should be visible only when logged in
  const loggedInElements = [
      document.getElementById('nav-wishlist'),
      document.getElementById('nav-orders'),
      document.getElementById('nav-history'),
      document.getElementById('nav-logout')
  ];
  
  // Elements that should be visible only when not logged in
  const loggedOutElements = [
      document.getElementById('nav-login'),
      document.getElementById('nav-register'),
      document.getElementById('nav-guest')
  ];
  
  if (user) {
      // User is logged in
      loggedInElements.forEach(element => {
          if (element) element.style.display = 'block';
      });
      
      loggedOutElements.forEach(element => {
          if (element) element.style.display = 'none';
      });
  } else {
      // User is not logged in
      loggedInElements.forEach(element => {
          if (element) element.style.display = 'none';
      });
      
      loggedOutElements.forEach(element => {
          if (element) element.style.display = 'block';
      });
  }
}

auth.onAuthStateChanged(user => {
  currentUser = user;
  updateNavigation(user);
  if (user && !user.isAnonymous) loadSupercoins();
  updateCartCount();
  if (document.getElementById('home') && document.getElementById('home').classList.contains('active')) {
      loadHomeProducts();
  }
});


document.addEventListener('DOMContentLoaded', function() {
  const dropdownToggle = document.querySelector('.dropdown-toggle');
  const dropdownMenu = document.querySelector('.dropdown-menu');
  
  if (dropdownToggle && dropdownMenu) {
      dropdownToggle.addEventListener('click', function() {
          dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
      }); 
      
      document.addEventListener('click', function(event) {
          if (!event.target.matches('.dropdown-toggle') && !event.target.closest('.dropdown-menu')) {
              dropdownMenu.style.display = 'none';
          }
      });
  }



  // Show the home section by default, but don't load products yet
  showSection('home');
  document.getElementById('homeProducts').innerHTML = ""; // Clear any initial content
});