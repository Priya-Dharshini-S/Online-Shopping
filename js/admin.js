// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyC9vfDdT3MnkS4rWDFoP1r2maWTRP_RZSc",
    authDomain: "ecommerceapp-d574a.firebaseapp.com",
    projectId: "ecommerceapp-d574a",
    storageBucket: "ecommerceapp-d574a.firebasestorage.app",
    messagingSenderId: "746905420701",
    appId: "1:746905420701:web:233aeeebd98354ec09e574",
    measurementId: "G-CRJLZ8C8L5"
  };

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables to store chart instances
let salesBarChartInstance = null;
let categoryPieChartInstance = null;
let comparisonChartInstance = null;

// Flag to track if loadAnalytics is currently running
let isLoadingAnalytics = false;

// Pagination state
const itemsPerPage = 5;
let productCurrentPage = 1;
let orderCurrentPage = 1;
let inventoryCurrentPage = 1;
let customerCurrentPage = 1;

// Authentication State Listener
auth.onAuthStateChanged(user => {
    console.log("Auth state changed. User:", user ? user.email : "No user");
    if (!user) {
        window.location.href = 'index.html';
    } else {
        checkAdminStatus(user.email);
    }
});

// Function to check if user is an admin
function checkAdminStatus(email) {
    console.log("Checking admin status for:", email);
    db.collection('admins').where('email', '==', email).get()
        .then(snapshot => {
            if (snapshot.empty && email !== 'priya@gmail.com') {
                console.log("Not an admin, redirecting...");
                window.location.href = 'index.html';
            } else {
                console.log("Admin access granted");
                loadProducts();
                loadOrders('all');
                loadAnalytics();
            }
        })
        .catch(error => {
            console.error("Error checking admin status:", error);
            if (email === 'priya@gmail.com') {
                loadProducts();
                loadOrders('all');
                loadAnalytics();
            } else {
                window.location.href = 'index.html';
            }
        });
}

// Add Product Form Submission
document.getElementById('addProductForm').addEventListener('submit', e => {
    e.preventDefault();
    const productData = {
        name: document.getElementById('productName').value,
        price: parseFloat(document.getElementById('productPrice').value),
        discountPrice: document.getElementById('productDiscountPrice').value ? parseFloat(document.getElementById('productDiscountPrice').value) : null,
        brand: document.getElementById('productBrand').value,
        category: document.getElementById('productCategory').value,
        availability: parseInt(document.getElementById('productAvailability').value),
        currency: document.getElementById('productCurrency').value,
        imageURLs: document.getElementById('productImageURLs').value.split(',').map(url => url.trim()).filter(url => url),
        isActive: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    console.log("Adding product:", productData);

    db.collection('products').add(productData)
        .then(() => {
            document.getElementById('addProductMessage').innerText = "Product added successfully!";
            document.getElementById('addProductForm').reset();
            productCurrentPage = 1;
            loadProducts();
            loadAnalytics();
        })
        .catch(err => {
            console.error("Error adding product:", err);
            document.getElementById('addProductMessage').innerText = err.message;
        });
});

// Load Products with Pagination
function loadProducts() {
    const productListDiv = document.getElementById('productList');
    const productPaginationDiv = document.getElementById('productPagination');
    console.log("Loading products...");
    productListDiv.innerHTML = "Loading products...";
    productPaginationDiv.innerHTML = "";

    const searchTerm = document.getElementById('productSearch').value.toLowerCase();
    const category = document.getElementById('productCategoryFilter').value;

    db.collection('products').get()
        .then(snapshot => {
            let products = [];
            snapshot.forEach(doc => {
                const prod = { id: doc.id, ...doc.data() };
                const matchesSearch = prod.name.toLowerCase().includes(searchTerm) || prod.brand.toLowerCase().includes(searchTerm);
                const matchesCategory = category === 'all' || prod.category === category;
                if (matchesSearch && matchesCategory) {
                    products.push(prod);
                }
            });

            const totalPages = Math.ceil(products.length / itemsPerPage);
            productCurrentPage = Math.min(Math.max(1, productCurrentPage), totalPages);

            productListDiv.innerHTML = "";
            if (products.length === 0) {
                productListDiv.innerHTML = "No products found";
                return;
            }

            const startIdx = (productCurrentPage - 1) * itemsPerPage;
            const endIdx = startIdx + itemsPerPage;
            const paginatedProducts = products.slice(startIdx, endIdx);

            paginatedProducts.forEach(prod => {
                const imageUrl = prod.imageURLs && prod.imageURLs.length > 0 ? prod.imageURLs[0] : 'assets/images/nothing.png';
                const prodDiv = document.createElement('div');
                prodDiv.classList.add('product-card');
                const priceSymbol = prod.currency === 'INR' ? '₹' : '$';
                prodDiv.innerHTML = `
                    <div class="product-image" style="background-image: url('${imageUrl}');" onerror="this.style.backgroundImage='url(assets/images/nothing.png)'"></div>
                    <div class="product-info">
                        <h3 class="product-name">${prod.name}</h3>
                        <p>Brand: ${prod.brand}</p>
                        <p>Price: ${priceSymbol}${prod.price}</p>
                        ${prod.discountPrice ? `<p>Discount: ${priceSymbol}${prod.discountPrice}</p>` : ''}
                        <p>Category: ${prod.category}</p>
                        <p>Availability: ${prod.availability}</p>
                        <button onclick="toggleProductStatus('${prod.id}', ${prod.isActive})" class="action-button">${prod.isActive ? 'Deactivate' : 'Activate'}</button>
                        <button onclick="deleteProduct('${prod.id}')" class="action-button">Delete</button>
                    </div>
                `;
                productListDiv.appendChild(prodDiv);
            });

            productPaginationDiv.innerHTML = `
                <button onclick="changePage('product', ${productCurrentPage - 1})" ${productCurrentPage === 1 ? 'disabled' : ''}>Previous</button>
                <span>Page ${productCurrentPage} of ${totalPages}</span>
                <button onclick="changePage('product', ${productCurrentPage + 1})" ${productCurrentPage === totalPages ? 'disabled' : ''}>Next</button>
            `;
        })
        .catch(error => {
            console.error("Error loading products:", error);
            productListDiv.innerHTML = "Error loading products: " + error.message;
        });
}

// Toggle Product Status
function toggleProductStatus(productId, isActive) {
    console.log("Toggling status for product:", productId, "Current status:", isActive);
    db.collection('products').doc(productId).update({
        isActive: !isActive
    }).then(() => {
        loadProducts();
        loadAnalytics();
    }).catch(error => {
        console.error("Error toggling product status:", error);
    });
}

// Delete Product
function deleteProduct(productId) {
    console.log("Deleting product:", productId);
    if (confirm("Are you sure you want to delete this product?")) {
        db.collection('products').doc(productId).delete()
            .then(() => {
                productCurrentPage = 1;
                loadProducts();
                loadAnalytics();
            })
            .catch(error => {
                console.error("Error deleting product:", error);
            });
    }
}

// Load Orders with Pagination
function loadOrders(category = 'all') {
    const orderListDiv = document.getElementById('orderList');
    const orderPaginationDiv = document.getElementById('orderPagination');
    console.log("Loading orders for category:", category);
    orderListDiv.innerHTML = "Loading orders...";
    orderPaginationDiv.innerHTML = "";

    const searchTerm = document.getElementById('orderSearch').value.toLowerCase();

    db.collection('orders').get()
        .then(snapshot => {
            let filteredOrders = [];
            snapshot.forEach(doc => {
                const order = { id: doc.id, ...doc.data() };
                let matchesCategory = false;
                let matchesSearch = order.id.toLowerCase().includes(searchTerm);

                if (category === 'all') {
                    matchesCategory = true;
                } else {
                    order.items.forEach(item => {
                        if (item.category === category) matchesCategory = true;
                    });
                }

                if (matchesCategory && matchesSearch) {
                    filteredOrders.push(order);
                }
            });

            const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
            orderCurrentPage = Math.min(Math.max(1, orderCurrentPage), totalPages);

            orderListDiv.innerHTML = "";
            if (filteredOrders.length === 0) {
                orderListDiv.innerHTML = "No orders found";
                return;
            }

            const startIdx = (orderCurrentPage - 1) * itemsPerPage;
            const endIdx = startIdx + itemsPerPage;
            const paginatedOrders = filteredOrders.slice(startIdx, endIdx);

            paginatedOrders.forEach(order => {
                const orderDiv = document.createElement('div');
                orderDiv.classList.add('product-card');
                const orderDate = order.orderDate.toDate().toLocaleString();
                let itemsHtml = order.items.map(item => `
                    <p>${item.name} x${item.quantity}</p>
                    <p>Price: ${item.currency === 'INR' ? '₹' : '$'}${item.price}</p>
                `).join('');
                orderDiv.innerHTML = `
                    <div class="product-info">
                        <h3 class="product-name">Order ${order.id} - ${orderDate}</h3>
                        ${itemsHtml}
                        <p>Total: $${order.totalAmountUSD.toFixed(2)}</p>
                        <p>Status: ${order.status}</p>
                        <select onchange="updateOrderStatus('${order.id}', this.value)">
                            <option value="ordered" ${order.status === 'ordered' ? 'selected' : ''}>Ordered</option>
                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="out_for_delivery" ${order.status === 'out_for_delivery' ? 'selected' : ''}>Out for Delivery</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        </select>
                    </div>
                `;
                orderListDiv.appendChild(orderDiv);
            });

            orderPaginationDiv.innerHTML = `
                <button onclick="changePage('order', ${orderCurrentPage - 1})" ${orderCurrentPage === 1 ? 'disabled' : ''}>Previous</button>
                <span>Page ${orderCurrentPage} of ${totalPages}</span>
                <button onclick="changePage('order', ${orderCurrentPage + 1})" ${orderCurrentPage === totalPages ? 'disabled' : ''}>Next</button>
            `;
        })
        .catch(error => {
            console.error("Error loading orders:", error);
            orderListDiv.innerHTML = "Error loading orders: " + error.message;
        });
}

// Update Order Status
function updateOrderStatus(orderId, status) {
    console.log("Updating order status:", orderId, "to", status);
    db.collection('orders').doc(orderId).update({ status })
        .then(() => {
            orderCurrentPage = 1;
            loadOrders();
        })
        .catch(error => {
            console.error("Error updating order status:", error);
        });
}

// Load Analytics with Pagination for Reports
function loadAnalytics() {
    if (isLoadingAnalytics) {
        console.log("loadAnalytics is already running, skipping...");
        return;
    }
    isLoadingAnalytics = true;
    console.log("Loading analytics...");

    db.collection('orders').get().then(orderSnapshot => {
        const productSales = {};
        const categorySales = {};

        orderSnapshot.forEach(doc => {
            const order = doc.data();
            order.items.forEach(item => {
                productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
                const prodRef = db.collection('products').doc(item.productId);
                prodRef.get().then(prodDoc => {
                    if (prodDoc.exists) {
                        const category = prodDoc.data().category;
                        categorySales[category] = (categorySales[category] || 0) + item.quantity;
                    }
                }).catch(error => console.error("Error fetching product for analytics:", error));
            });
        });

        // Destroy existing chart instances if they exist
        if (salesBarChartInstance) {
            salesBarChartInstance.destroy();
            salesBarChartInstance = null;
        }
        if (categoryPieChartInstance) {
            categoryPieChartInstance.destroy();
            categoryPieChartInstance = null;
        }
        if (comparisonChartInstance) {
            comparisonChartInstance.destroy();
            comparisonChartInstance = null;
        }

        // Bar Chart: Product Sales
        const barCtx = document.getElementById('salesBarChart').getContext('2d');
        salesBarChartInstance = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(productSales),
                datasets: [{
                    label: 'Units Sold',
                    data: Object.values(productSales),
                    backgroundColor: 'rgba(146, 244, 34, 0.2)',
                    borderColor: 'rgb(153, 255, 45)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: false,
                scales: { y: { beginAtZero: true } }
            }
        });

        // Pie Chart: Category Distribution
        setTimeout(() => {
            const pieCtx = document.getElementById('categoryPieChart').getContext('2d');
            categoryPieChartInstance = new Chart(pieCtx, {
                type: 'pie',
                data: {
                    labels: Object.keys(categorySales),
                    datasets: [{
                        data: Object.values(categorySales),
                        backgroundColor: ['#FF3A2D', '#4CAF50', '#FFD700', '#36A2EB', '#FF9A2D']
                    }]
                },
                options: { responsive: false }
            });
        }, 1000);

        // Comparison Chart: Monthly Sales (example data)
        const comparisonCtx = document.getElementById('comparisonChart').getContext('2d');
        comparisonChartInstance = new Chart(comparisonCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: '2024 Sales',
                    data: [50, 60, 70, 80, 90, 100],
                    borderColor: '#FF3A2D',
                    fill: false
                }, {
                    label: '2025 Sales',
                    data: [60, 70, 80, 90, 100, 110],
                    borderColor: '#4CAF50',
                    fill: false
                }]
            },
            options: { responsive: false }
        });

        // Top 10 Selling Products
        const topProductsDiv = document.getElementById('topProducts');
        topProductsDiv.innerHTML = "<h4>Top 10 Selling Products</h4>";
        const sortedProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 10);
        sortedProducts.forEach(([prodId, qty]) => {
            db.collection('products').doc(prodId).get().then(doc => {
                if (doc.exists) {
                    const prod = doc.data();
                    const div = document.createElement('div');
                    div.innerHTML = `${prod.name} - ${qty} units`;
                    topProductsDiv.appendChild(div);
                }
            }).catch(error => console.error("Error fetching top product:", error));
        });

        // Bottom 10 Selling Products
        const bottomProductsDiv = document.getElementById('bottomProducts');
        bottomProductsDiv.innerHTML = "<h4>Bottom 10 Selling Products</h4>";
        const bottomProducts = Object.entries(productSales).sort((a, b) => a[1] - b[1]).slice(0, 10);
        bottomProducts.forEach(([prodId, qty]) => {
            db.collection('products').doc(prodId).get().then(doc => {
                if (doc.exists) {
                    const prod = doc.data();
                    const div = document.createElement('div');
                    div.innerHTML = `${prod.name} - ${qty} units`;
                    bottomProductsDiv.appendChild(div);
                }
            }).catch(error => console.error("Error fetching bottom product:", error));
        });

        // Populate Inventory Report Table with Pagination
        const inventoryTableBody = document.querySelector('#inventoryTable tbody');
        const inventoryPaginationDiv = document.getElementById('inventoryPagination');
        inventoryTableBody.innerHTML = '';
        db.collection('products').get()
            .then(snapshot => {
                let inventoryItems = [];
                snapshot.forEach(doc => {
                    const product = { id: doc.id, ...doc.data() };
                    inventoryItems.push(product);
                });

                const totalPages = Math.ceil(inventoryItems.length / itemsPerPage);
                inventoryCurrentPage = Math.min(Math.max(1, inventoryCurrentPage), totalPages);

                const startIdx = (inventoryCurrentPage - 1) * itemsPerPage;
                const endIdx = startIdx + itemsPerPage;
                const paginatedItems = inventoryItems.slice(startIdx, endIdx);

                let serialNo = startIdx + 1;
                paginatedItems.forEach(product => {
                    const priceUSD = product.currency === 'INR' ? (product.price / 83).toFixed(2) : product.price;
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${serialNo++}</td>
                        <td>${product.name}</td>
                        <td>${product.category}</td>
                        <td>${product.availability}</td>
                        <td>$${priceUSD}</td>
                    `;
                    inventoryTableBody.appendChild(row);
                });

                inventoryPaginationDiv.innerHTML = `
                    <button onclick="changePage('inventory', ${inventoryCurrentPage - 1})" ${inventoryCurrentPage === 1 ? 'disabled' : ''}>Previous</button>
                    <span>Page ${inventoryCurrentPage} of ${totalPages}</span>
                    <button onclick="changePage('inventory', ${inventoryCurrentPage + 1})" ${inventoryCurrentPage === totalPages ? 'disabled' : ''}>Next</button>
                `;
            })
            .catch(error => {
                console.error("Error loading inventory report:", error);
                inventoryTableBody.innerHTML = `<tr><td colspan="5">Error loading inventory report: ${error.message}</td></tr>`;
            });

        // Populate Customer Report Table with Pagination
        const customerTableBody = document.querySelector('#customerTable tbody');
        const customerPaginationDiv = document.getElementById('customerPagination');
        customerTableBody.innerHTML = '';
        db.collection('users').get()
            .then(snapshot => {
                const userRows = [];
                let serialNo = (customerCurrentPage - 1) * itemsPerPage + 1;
                const userIdsProcessed = new Set();

                const processUser = (doc) => {
                    const user = doc.data();
                    const userId = doc.id;
                    if (userIdsProcessed.has(userId)) {
                        console.log(`Skipping duplicate user ID: ${userId}`);
                        return Promise.resolve();
                    }

                    userIdsProcessed.add(userId);
                    return db.collection('orders').where('userId', '==', userId).get()
                        .then(orderSnapshot => {
                            let totalOrders = orderSnapshot.size;
                            let totalSpent = 0;
                            orderSnapshot.forEach(orderDoc => {
                                const order = orderDoc.data();
                                totalSpent += order.totalAmountUSD || 0;
                            });

                            const row = document.createElement('tr');
                            row.innerHTML = `
                                <td>${serialNo++}</td>
                                <td>${user.name || 'Unknown'}</td>
                                <td>${user.email || 'N/A'}</td>
                                <td>${totalOrders}</td>
                                <td>$${totalSpent.toFixed(2)}</td>
                            `;
                            userRows.push(row);
                            return Promise.resolve();
                        })
                        .catch(error => {
                            console.error("Error calculating orders for user:", error);
                            return Promise.resolve();
                        });
                };

                const promises = snapshot.docs.map(doc => processUser(doc));
                Promise.all(promises).then(() => {
                    const totalPages = Math.ceil(userRows.length / itemsPerPage);
                    customerCurrentPage = Math.min(Math.max(1, customerCurrentPage), totalPages);

                    const startIdx = (customerCurrentPage - 1) * itemsPerPage;
                    const endIdx = startIdx + itemsPerPage;
                    const paginatedRows = userRows.slice(startIdx, endIdx);

                    customerTableBody.innerHTML = '';
                    paginatedRows.forEach(row => customerTableBody.appendChild(row));

                    customerPaginationDiv.innerHTML = `
                        <button onclick="changePage('customer', ${customerCurrentPage - 1})" ${customerCurrentPage === 1 ? 'disabled' : ''}>Previous</button>
                        <span>Page ${customerCurrentPage} of ${totalPages}</span>
                        <button onclick="changePage('customer', ${customerCurrentPage + 1})" ${customerCurrentPage === totalPages ? 'disabled' : ''}>Next</button>
                    `;
                });
            })
            .catch(error => {
                console.error("Error loading customer report:", error);
                customerTableBody.innerHTML = `<tr><td colspan="5">Error loading customer report: ${error.message}</td></tr>`;
            })
            .finally(() => {
                isLoadingAnalytics = false;
            });
    }).catch(error => {
        console.error("Error loading analytics:", error);
        isLoadingAnalytics = false;
    });
}

// Download Inventory Report as PDF
function downloadInventoryReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Inventory Report", 14, 20);
    doc.setFontSize(12);
    doc.text("Generated on: " + new Date().toLocaleString(), 14, 30);

    const table = document.getElementById('inventoryTable');
    const rows = table.querySelectorAll('tr');
    let yPosition = 40;

    rows.forEach((row) => {
        const cells = row.querySelectorAll('th, td');
        let xPosition = 14;
        cells.forEach(cell => {
            doc.text(cell.innerText, xPosition, yPosition);
            xPosition += 40;
        });
        yPosition += 10;
    });

    doc.save('inventory_report.pdf');
}

// Download Customer Report as PDF
function downloadCustomerReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Customer Report", 14, 20);
    doc.setFontSize(12);
    doc.text("Generated on: " + new Date().toLocaleString(), 14, 30);

    const table = document.getElementById('customerTable');
    const rows = table.querySelectorAll('tr');
    let yPosition = 40;

    rows.forEach((row) => {
        const cells = row.querySelectorAll('th, td');
        let xPosition = 14;
        cells.forEach(cell => {
            doc.text(cell.innerText, xPosition, yPosition);
            xPosition += 40;
        });
        yPosition += 10;
    });

    doc.save('customer_report.pdf');
}

// Download Cost Estimation Report as PDF
function downloadCostEstimationReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Cost Estimation Report", 14, 20);
    doc.setFontSize(12);
    doc.text("Generated on: " + new Date().toLocaleString(), 14, 30);

    db.collection('products').get()
        .then(snapshot => {
            let totalCostUSD = 0;
            const categoryCosts = {};

            snapshot.forEach(doc => {
                const product = doc.data();
                const priceUSD = product.currency === 'INR' ? (product.price / 83).toFixed(2) : product.price;
                const itemCost = priceUSD * product.availability;
                totalCostUSD += itemCost;

                categoryCosts[product.category] = (categoryCosts[product.category] || 0) + itemCost;
            });

            let yPosition = 40;
            doc.setFontSize(14);
            doc.text("Cost Breakdown by Category:", 14, yPosition);
            yPosition += 10;

            Object.entries(categoryCosts).forEach(([category, cost]) => {
                doc.text(`${category}: $${cost.toFixed(2)}`, 14, yPosition);
                yPosition += 10;
            });

            doc.text(`Total Cost: $${totalCostUSD.toFixed(2)}`, 14, yPosition);
            doc.save('cost_estimation_report.pdf');
        })
        .catch(error => {
            console.error("Error generating cost estimation report:", error);
            alert("Error generating cost estimation report: " + error.message);
        });
}

// Logout Function
function logout() {
    console.log("Logging out...");
    auth.signOut().then(() => window.location.href = 'index.html')
        .catch(error => console.error("Error logging out:", error));
}

// Change Page for Pagination
function changePage(section, page) {
    switch (section) {
        case 'product':
            productCurrentPage = page;
            loadProducts();
            break;
        case 'order':
            orderCurrentPage = page;
            loadOrders();
            break;
        case 'inventory':
            inventoryCurrentPage = page;
            loadAnalytics();
            break;
        case 'customer':
            customerCurrentPage = page;
            loadAnalytics();
            break;
    }
}

// Initial Load Calls
loadProducts();
loadOrders('all');
loadAnalytics();