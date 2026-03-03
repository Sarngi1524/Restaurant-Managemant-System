// Logout function
function handleLogout() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("loggedUser");
    localStorage.removeItem("isAdmin");
    window.location.href = "/user/login.html";
}

function readOfflineProducts() {
    try {
        const parsed = JSON.parse(localStorage.getItem('offlineProducts') || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function writeOfflineProducts(products) {
    localStorage.setItem('offlineProducts', JSON.stringify(Array.isArray(products) ? products : []));
}

function dataURLToBlob(dataurl) {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URL');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
}

function normalizeImageSrc(src) {
    if (!src || typeof src !== 'string') return '/user/assets/default.jpg';
    const value = src.trim();
    if (!value) return '/user/assets/default.jpg';
    if (value.startsWith('data:') || value.startsWith('blob:')) return value;
    if (value.startsWith('/')) return value;
    if (value.startsWith('http://') || value.startsWith('https://')) {
        try {
            const u = new URL(value);
            const h = (u.hostname || '').toLowerCase();
            if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return u.pathname || value;
            return value;
        } catch (e) {
            return value;
        }
    }
    if (value.startsWith('assets/')) return `/user/${value}`;
    if (value.startsWith('user/')) return `/${value}`;
    if (value.startsWith('./assets/')) return `/user/${value.slice(2)}`;
    return value;
}

document.addEventListener('DOMContentLoaded', function() {
    function formatDateLabel(input) {
        if (!input) return '';
        const parsed = new Date(input);
        if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString('en-CA');
        const text = String(input);
        const isoDate = text.match(/\d{4}-\d{2}-\d{2}/);
        if (isoDate) return isoDate[0];
        return text.split(' ')[0];
    }

    // 1. Doughnut Chart (will be updated from server stats) - guard if element missing
    const doughnutEl = document.getElementById('incomeDoughnut');
    let doughnutChart = null;
    if (doughnutEl && doughnutEl.getContext) {
        const ctx1 = doughnutEl.getContext('2d');
        doughnutChart = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: ['Category A', 'Category B', 'Category C'],
            datasets: [{
                data: [1, 1, 1],
                backgroundColor: ['#000', '#ff6b35', '#ddd'],
                borderWidth: 0,
                cutout: '70%'
            }]
        },
        options: { plugins: { legend: { display: false } } }
        });
    }

    // 2. Daily Selling Line Chart (will be updated from server stats) - guard if element missing
    const lineEl = document.getElementById('sellingLineChart');
    let lineChart = null;
    if (lineEl && lineEl.getContext) {
        const ctx2 = lineEl.getContext('2d');
        lineChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Daily Sales',
                data: [],
                borderColor: '#ff6b35',
                fill: true,
                backgroundColor: 'rgba(255, 107, 53, 0.1)',
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: '#ff6b35',
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { 
                legend: { 
                    display: true,
                    labels: { color: '#333', font: { size: 12, weight: '600' } }
                }
            },
            scales: { 
                x: { 
                    display: true,
                    title: {
                        display: true,
                        text: 'Date',
                        color: '#333',
                        font: { size: 14, weight: 'bold' }
                    },
                    ticks: {
                        color: '#666',
                        callback: function(value, index) {
                            const rawLabel = this.getLabelForValue
                                ? this.getLabelForValue(value)
                                : this.chart.data.labels[index];
                            return formatDateLabel(rawLabel);
                        }
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                }, 
                y: { 
                    display: true,
                    title: {
                        display: true,
                        text: 'Selling Price (₹)',
                        color: '#333',
                        font: { size: 14, weight: 'bold' }
                    },
                    ticks: { 
                        color: '#666',
                        callback: function(value) {
                            return '₹' + value.toLocaleString();
                        }
                    },
                    grid: { color: 'rgba(0,0,0,0.1)' }
                } 
            }
        }
        });
    }

    // Fetch admin stats from server and update charts
    function fetchAndRenderStats() {
        fetch('/api/admin/stats')
            .then(res => {
                if (!res.ok) throw new Error('Stats fetch failed');
                return res.json();
            })
            .then(stats => {
                // Update center text / income display if present in DOM
                const centerText = document.querySelector('.center-text');
                const balanceAmount = document.querySelector('.balance-amount');
                if (centerText && typeof stats.income !== 'undefined') {
                    const amountDiv = centerText.querySelector('div:last-child');
                    if (amountDiv) {
                        amountDiv.textContent = `₹${Number(stats.income).toLocaleString()}`;
                    }
                }
                if (balanceAmount && typeof stats.income !== 'undefined') balanceAmount.textContent = `₹${Number(stats.income).toLocaleString()}`;

                // Update stat items with total income and calculate expenses
                const totalIncomeEl = document.querySelector('.stat-item:first-child strong');
                const totalExpenseEl = document.querySelector('.stat-item:nth-child(2) strong');
                if (totalIncomeEl && typeof stats.income !== 'undefined') {
                    totalIncomeEl.textContent = `₹${Number(stats.income).toFixed(2)}`;
                }
                if (totalExpenseEl) {
                    const expenses = stats.income ? Number(stats.income) * 0.2 : 0;
                    totalExpenseEl.textContent = `₹${Number(expenses).toFixed(2)}`;
                }

                // Update line chart using salesTrend (array of date/time + amount)
                if (lineChart && Array.isArray(stats.salesTrend) && stats.salesTrend.length) {
                    const labels = stats.salesTrend.map(s => formatDateLabel(s.hour || s.date || s.createdAt));
                    const amounts = stats.salesTrend.map(s => Number(s.amount || s.total || 0));
                    lineChart.data.labels = labels;
                    lineChart.data.datasets[0].data = amounts;
                    lineChart.update();
                }

                // Draw doughnut based on category revenue (Foodie, Cold Drink, Others)
                if (doughnutChart && Array.isArray(stats.categoryRevenue) && stats.categoryRevenue.length) {
                    const catLabels = stats.categoryRevenue.map(c => c.category || 'Unknown');
                    const catValues = stats.categoryRevenue.map(c => Number(c.revenue || 0));
                    doughnutChart.data.labels = catLabels;
                    doughnutChart.data.datasets[0].data = catValues;
                    // Lighter colors: Foodie=lighter orange, Cold Drink=light blue, Others=light gray
                    doughnutChart.data.datasets[0].backgroundColor = ['#FFB380', '#A8D8FF', '#D3D3D3'];
                    doughnutChart.update();
                }

                // Enrich best-dishes using product catalog (server or offline)
                (async () => {
                    // fetch product catalog to get images/prices
                    let products = [];
                    try {
                        const p = await fetch('/api/products');
                        if (p.ok) products = await p.json();
                    } catch (e) {
                        products = readOfflineProducts();
                    }

                    // prefer server-provided bestDishes (should be top-rated), otherwise fall back to top products
                    let best = [];
                    if (Array.isArray(stats.bestDishes) && stats.bestDishes.length) {
                        best = stats.bestDishes.map(b => ({
                            id: b.id,
                            name: b.name,
                            category: b.category,
                            image: b.image || b.image_url,
                            price: b.price,
                            avgRating: b.avgRating || b.rating || b.avg_rating || 0,
                            ratingCount: b.ratingCount || b.rating_count || 0,
                            qtySold: b.qtySold || 0,
                            revenue: b.revenue || 0
                        }));
                    } else {
                        best = products.slice(0, 4).map(p => ({ name: p.name, price: p.price, image: p.image_url || p.image, avgRating: p.rating || p.avg_rating || 0, ratingCount: p.rating_count || 0 }));
                    }

                    // attach image/price when missing by looking up in products
                    best = best.map(b => {
                        if ((!b.image || b.image === '') && products.length) {
                            const found = products.find(pp => pp.name === b.name || String(pp.id) === String(b.id));
                            if (found) { b.image = found.image_url || found.image; b.price = b.price || found.price; }
                        }
                        return b;
                    });

                    // update best-dishes list -- do NOT overwrite the income doughnut
                    const list = document.getElementById('bestDishesList');
                    if (list) {
                        list.innerHTML = best.map(d => {
                            const color = (d.category || '').toLowerCase() === 'foodie' ? '#ff6b35' : ((d.category || '').toLowerCase() === 'cold drink' ? '#3498db' : '#888');
                            return `
                            <div class="dish-item" style="border-left:4px solid ${color};">
                                <div class="dish-info">
                                    <img src="${normalizeImageSrc(d.image || '/user/assets/default.jpg')}" class="dish-img">
                                    <div>
                                        <strong>${d.name}</strong><br>
                                        <span style="color: ${color}">₹${Number(d.revenue || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                                <div style="text-align:right">
                                    <strong>${d.qtySold || 0} orders</strong>
                                    <div style="font-size:0.8rem;color:#888">(${d.category || '—'})</div>
                                </div>
                            </div>
                        `}).join('');
                    }
                })();
            })
            .catch(err => {
                console.warn('Could not load admin stats:', err);
            });
    }

    // initial fetch
    fetchAndRenderStats();

    // Best dishes will be populated dynamically from server stats
});

function loadProducts() {
    // only run on pages that have the product table
    if (!document.getElementById("productTableBody")) return;
    fetch("/api/products")
        .then(res => {
            if (!res.ok) {
                console.warn('Products endpoint returned', res.status);
                return [];
            }
            return res.json();
        })
        .then(products => {
            if (!Array.isArray(products)) products = [];
            renderProductRows(products);
        })
        .catch(err => {
            console.warn('Could not fetch products from server, loading offline products:', err);
            const offline = readOfflineProducts();
            if (offline.length) renderProductRows(offline, true);
        });
}

function renderProductRows(products, offline = false) {
    const tbody = document.getElementById("productTableBody");
    if (!tbody) return; // not on product page
    const normalize = src => normalizeImageSrc(src);
    tbody.innerHTML = (products || []).map(p => {
        const imgSrc = p.image || p.image_url; // prefer explicit field
        return `
        <tr>
            <td data-label="Product">
                <div class="product-info">
                    <img src="${normalize(imgSrc)}" class="product-img">
                    <span>${p.name}</span>
                </div>
            </td>
            <td data-label="Status" class="status-in">${p.status || 'In Stock'}</td>
            <td data-label="Product ID">#${p.id || (p._id || 'offline')}</td>
            <td data-label="Food Details">${p.description || ''}</td>
            <td data-label="Price">₹${Number(p.price || 0).toFixed(2)}</td>
            <td data-label="Action" class="action-btns">
                ${offline ? '<span class="offline-tag">Offline</span>' : `
                    <button class="btn customize-btn" onclick="editProduct(${p.id})">Customize</button>
                    <button class="btn delete-btn" onclick="deleteProduct(${p.id})">Delete</button>
                `}
            </td>
        </tr>
        `;
    }).join('');
}

// Navigate to add-product page for editing (pass id as query param)
function editProduct(id) {
    if (!id) return alert('Cannot edit offline item.');
    window.location.href = `add-product.html?id=${id}`;
}

// Delete product either from server (if has id) or from offline storage
async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    // if id is falsy, attempt to remove from offlineProducts by _id
    if (!id || String(id).startsWith('offline')) {
        try {
            let offline = readOfflineProducts();
            offline = offline.filter(p => String(p._id || p.id) !== String(id));
            writeOfflineProducts(offline);
            alert('Offline product removed.');
            loadProducts();
        } catch (e) { console.error('Error removing offline product', e); alert('Could not remove offline product'); }
        return;
    }

    try {
        const res = await fetch(`/api/admin/delete-product/${id}`, { method: 'DELETE' });
        if (res.ok) {
            const j = await res.json().catch(() => ({}));
            if (j && j.success) {
                alert('Product deleted successfully');
                loadProducts();
                return;
            }
        }
        alert('Failed to delete product on server');
    } catch (err) {
        console.error('Delete request failed', err);
        alert('Network error while deleting product');
    }
}

// Load the data immediately when the page opens
document.addEventListener("DOMContentLoaded", loadProducts);

// helper to read query params
function getParam(name) {
    const u = new URL(window.location.href);
    return u.searchParams.get(name);
}

document.addEventListener("DOMContentLoaded", () => {
    // editing support: if ?id= is present we will fetch the product
    const editingId = getParam('id');

    const addProductForm = document.getElementById("addProductForm");
    const imageInput = document.getElementById("imageInput");
    const uploadBox = document.getElementById("uploadBox");
    const imagePreview = document.getElementById("imagePreview");
    const uploadContent = document.querySelector(".upload-content");

    if (editingId && addProductForm) {
        // prefill form
        fetch(`/api/products?id=${editingId}`)
            .then(r => r.json())
            .then(j => {
                if (j && j.success && j.product) {
                    const prod = j.product;
                    document.getElementById('productName').value = prod.name;
                    document.getElementById('details').value = prod.description || '';
                    document.getElementById('category').value = prod.category || '';
                    document.getElementById('price').value = prod.price || '';
                    document.getElementById('status').value = prod.status || 'In Stock';
                    if (prod.image_url || prod.image) {
                        const src = prod.image_url || prod.image;
                        imagePreview.src = src;
                        imagePreview.style.display = 'block';
                        uploadContent.style.display = 'none';
                    }
                    document.querySelector('.form-header h2').textContent = 'Edit Product';
                    document.querySelector('.save-btn').textContent = 'Update Product';
                }
            });
    }

    // 1. Handle Image Click & Preview
    if (uploadBox) {
        uploadBox.addEventListener("click", () => imageInput.click());

        imageInput.addEventListener("change", function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = "block";
                    uploadContent.style.display = "none";
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 2. Handle Form Submission to MySQL
    if (addProductForm) {
        addProductForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            // Prepare the data object
            // Note: For a real app, you'd use FormData for images, 
            // but here we use the filename to match your Menu assets.
            const productData = {
                name: document.getElementById("productName").value,
                // productUnit replaced by 'details' textarea per request
                description: document.getElementById("details").value,
                // quantity not exposed in UI now; default to 1
                quantity: 1,
                category: document.getElementById("category").value,
                price: document.getElementById("price").value,
                status: document.getElementById("status").value,
                // if an image preview was created (dataURL), use it so offline items show images
                image: (imagePreview && imagePreview.src && imagePreview.style.display !== 'none') ? imagePreview.src : (imageInput.files[0] ? `assets/${imageInput.files[0].name}` : "assets/default.jpg")
            };

            try {
                // If a file is selected or the preview is a data URL, upload the image first
                let imageToUse = productData.image;
                // helper to upload a File/Blob via FormData
                async function uploadBlob(blob, filename) {
                    const fd = new FormData();
                    fd.append('image', blob, filename || 'upload.png');
                    const up = await fetch('/api/admin/upload-image', { method: 'POST', body: fd });
                    if (!up.ok) throw new Error('Image upload failed: ' + up.status);
                    const uj = await up.json();
                    if (!uj.success) throw new Error('Image upload failed: ' + (uj.message || 'unknown'));
                    return uj.url;
                }

                if (imageInput && imageInput.files && imageInput.files[0]) {
                    // upload the actual file selected by user
                    try {
                        imageToUse = await uploadBlob(imageInput.files[0], imageInput.files[0].name);
                    } catch (uerr) {
                        console.warn('Image upload failed, continuing with local image:', uerr);
                    }
                } else if (imagePreview && imagePreview.src && imagePreview.src.startsWith('data:')) {
                    // convert dataURL to blob and upload
                    try {
                        const blob = dataURLToBlob(imagePreview.src);
                        imageToUse = await uploadBlob(blob, (document.getElementById('productName').value || 'image') + '.png');
                    } catch (uerr) {
                        console.warn('DataURL image upload failed, saving offline image instead', uerr);
                    }
                }

                productData.image = imageToUse;

                // choose appropriate endpoint depending on whether we're editing
                let url = "/api/admin/add-product";
                let method = "POST";
                if (editingId) {
                    url = `/api/admin/update-product/${editingId}`;
                    method = "PUT";
                }
                const response = await fetch(url, {
                    method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(productData)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    alert(editingId ? "Product updated successfully!" : "Product added successfully!");
                    window.location.href = "product.html"; // Redirect to list
                } else {
                    console.error('Product save failed response:', response.status, result);
                    alert("Failed to save product: " + (result.message || `HTTP ${response.status}`));
                }
            } catch (err) {
                console.error("Submission Error:", err);
                // Save product locally as fallback when server is unreachable
                try {
                    const offline = readOfflineProducts();
                    offline.push(Object.assign({ _id: Date.now() }, productData));
                    writeOfflineProducts(offline);
                    alert('Server unreachable — product saved locally and will sync when server is available.');
                    window.location.href = "product.html";
                } catch (e) {
                    console.error('Offline save failed', e);
                    alert("Server error. Make sure server.js is running.");
                }
            }
        });
    }
});

// Function to switch between tabs
function switchTab(tabId) {
    document.querySelectorAll('.db-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabId).style.display = 'block';
    event.currentTarget.classList.add('active');
}

// Fetch all database records from MySQL via server.js
function fetchAllDatabaseData() {
    fetch("/api/data")
        .then(res => res.json())
        .then(data => {
            // 1. Populate Users
            const userBody = document.getElementById("usersList");
            userBody.innerHTML = (data.users || []).map(u => `
                <tr>
                    <td>#${u.id}</td>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td><span class="status-tag">${u.role}</span></td>
                </tr>
            `).join('');

            // 2. Populate Feedback
            const feedbackBody = document.getElementById("feedbackList");
            if (data.feedback && data.feedback.length > 0) {
                feedbackBody.innerHTML = (data.feedback || []).map(f => `
                    <tr>
                        <td>${f.name}</td>
                        <td>⭐ ${f.foodRating}/5</td>
                        <td>${f.serviceRating}</td>
                        <td>${f.comments}</td>
                    </tr>
                `).join('');
            } else {
                feedbackBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#999;">No feedback has been submitted yet.</td></tr>';
            }

            // 3. Populate Bookings
            const bookingBody = document.getElementById("bookingsList");
            bookingBody.innerHTML = (data.bookings || []).map(b => `
                <tr>
                    <td>${b.email}</td>
                    <td>Table ${b.tableNumber}</td>
                    <td>${b.numPeople}</td>
                    <td>${b.booking_date || 'N/A'}</td>
                </tr>
            `).join('');

            // 4. Populate Billing (Orders with payments)
            const billingBody = document.getElementById("billingList");
            if (billingBody) {
                billingBody.innerHTML = (data.orders || []).map(o => `
                    <tr>
                        <td>#${o.id}</td>
                        <td>${o.email || 'N/A'}</td>
                        <td>${(o.items && o.items.length) ? o.items.map(i=>`${i.name} x${i.qty}`).join(', ') : '–'}</td>
                        <td>₹${Number(o.total || 0).toFixed(2)}</td>
                        <td><span class="status-tag" style="background-color: ${o.status === 'Paid' ? '#2ecc71' : '#e74c3c'}">${o.status}</span></td>
                        <td>${o.created_at ? new Date(o.created_at).toLocaleString() : 'N/A'}</td>
                    </tr>
                `).join('');
            }
        })
        .catch(err => console.error("Database error:", err));
}

// Load data when page opens
if (document.getElementById("usersList")) {
    fetchAllDatabaseData();
}

// --- Offline sync: push locally-saved products to server when reachable ---
async function syncOfflineProducts() {
    let offline = readOfflineProducts();
    if (offline.length === 0) return;

    console.log('Attempting to sync', offline.length, 'offline products');

    // iterate and attempt to send each product sequentially
    for (let i = 0; i < offline.length; ) {
        const item = offline[i];
        try {
            // if image is data URL, upload it first
            let imageToSend = item.image;
            if (typeof imageToSend === 'string' && imageToSend.startsWith('data:')) {
                try {
                    const blob = dataURLToBlob(imageToSend);
                    const fd = new FormData(); fd.append('image', blob, (item.name || 'image') + '.png');
                    const up = await fetch('/api/admin/upload-image', { method: 'POST', body: fd });
                    if (up.ok) {
                        const uj = await up.json().catch(() => ({}));
                        if (uj && uj.success) imageToSend = uj.url;
                    }
                } catch (ue) { console.warn('Offline image upload failed', ue); }
            }

            const res = await fetch('/api/admin/add-product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: item.name,
                    price: item.price,
                    image: imageToSend,
                    description: item.description || item.details || '',
                    status: item.status || 'In Stock',
                    quantity: item.quantity || 1
                })
            });

            if (res.ok) {
                const j = await res.json().catch(() => ({}));
                if (j && j.success) {
                    console.log('Synced offline product:', item.name || item._id || item.id);
                    // remove this item from offline array
                    offline.splice(i, 1);
                    writeOfflineProducts(offline);
                    // also refresh product listing if on product page
                    if (document.getElementById('productTableBody')) loadProducts();
                    continue; // don't increment i, as array shifted
                } else {
                    console.warn('Server rejected offline product:', j);
                    // stop attempting further items for now
                    break;
                }
            } else {
                console.warn('Server returned status', res.status);
                break; // stop on server error
            }
        } catch (err) {
            console.warn('Network error while syncing product:', err);
            break; // network likely down, stop attempts
        }
    }
}

// Try sync when browser comes online and periodically
window.addEventListener('online', () => { console.log('Browser online — attempting sync'); syncOfflineProducts(); });
// also try once on script load after a short delay
setTimeout(syncOfflineProducts, 3000);
// periodic retry (every 60 seconds)
setInterval(syncOfflineProducts, 60000);
