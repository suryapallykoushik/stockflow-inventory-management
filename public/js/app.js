
// ========================================
// STOCKFLOW - FRONTEND APPLICATION
// ========================================

let defaultLowStockThreshold = 10;

let stockQuantityChart = null;
let stockDistributionChart = null;

const getElement = (id) => document.getElementById(id);

// ========================================
// SHOW DASHBOARD
// ========================================

async function showDashboard() {
    getElement("authContainer").classList.add("hidden");
    getElement("dashboard").classList.remove("hidden");

    await loadSettings();
    await loadProducts();
    await loadDashboard();
}

// ========================================
// AUTHENTICATION TABS
// ========================================

function showLogin() {
    getElement("loginForm").classList.remove("hidden");
    getElement("registerForm").classList.add("hidden");

    getElement("loginTab").classList.add("active");
    getElement("registerTab").classList.remove("active");

    getElement("message").textContent = "";
}

function showRegister() {
    getElement("registerForm").classList.remove("hidden");
    getElement("loginForm").classList.add("hidden");

    getElement("registerTab").classList.add("active");
    getElement("loginTab").classList.remove("active");

    getElement("message").textContent = "";
}

// ========================================
// DASHBOARD
// ========================================

async function loadDashboard() {
    const lowStockList = getElement("lowStockList");
    const outOfStockList = getElement("outOfStockList");

    lowStockList.textContent = "Loading inventory...";
    outOfStockList.textContent = "Loading inventory...";

    try {
        const response = await fetch("/api/dashboard", {
            credentials: "include"
        });

        if (response.status === 401) {
            getElement("dashboard").classList.add("hidden");
            getElement("authContainer").classList.remove("hidden");
            showLogin();
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to load dashboard.");
        }

        getElement("totalProducts").textContent =
            data.totalProducts ?? 0;

        getElement("totalUnits").textContent =
            data.totalUnits ?? 0;

        getElement("lowStockCount").textContent =
            data.lowStockCount ?? 0;

        renderLowStockProducts(data.lowStockProducts || []);
        renderOutOfStockProducts(data.outOfStockProducts || []);

    } catch (error) {
        console.error("Dashboard error:", error);
        lowStockList.textContent = "Unable to load inventory.";
        outOfStockList.textContent = "Unable to load inventory.";
    }
}

// ========================================
// LOW STOCK DISPLAY
// ========================================

function renderLowStockProducts(products) {
    const container = getElement("lowStockList");
    container.innerHTML = "";

    if (!products.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "All products are sufficiently stocked.";
        container.appendChild(empty);
        return;
    }

    products.forEach(product => {
        const item = document.createElement("div");
        item.className = "low-stock-item";

        const details = document.createElement("div");

        const name = document.createElement("strong");
        name.textContent = product.name;

        const info = document.createElement("p");
        info.textContent =
            `SKU: ${product.sku} | Threshold: ${
                product.low_stock_threshold ??
                product.lowStockThreshold ??
                "Default"
            }`;

        details.append(name, info);

        const quantity = document.createElement("span");
        quantity.className = "low-stock-quantity";
        quantity.textContent = `${product.quantity} units remaining`;

        item.append(details, quantity);
        container.appendChild(item);
    });
}

// ========================================
// OUT OF STOCK DISPLAY
// ========================================

function renderOutOfStockProducts(products) {
    const container = getElement("outOfStockList");
    container.innerHTML = "";

    if (!products.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "No products are currently out of stock.";
        container.appendChild(empty);
        return;
    }

    products.forEach(product => {
        const item = document.createElement("div");
        item.className = "low-stock-item";

        const details = document.createElement("div");

        const name = document.createElement("strong");
        name.textContent = product.name;

        const info = document.createElement("p");
        info.textContent = `SKU: ${product.sku}`;

        details.append(name, info);

        const quantity = document.createElement("span");
        quantity.className = "low-stock-quantity";
        quantity.textContent = "Out of stock";

        item.append(details, quantity);
        container.appendChild(item);
    });
}

// ========================================
// LOGIN
// ========================================

getElement("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const message = getElement("message");
    message.style.color = "#778399";
    message.textContent = "Signing in...";

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                email: getElement("loginEmail").value.trim(),
                password: getElement("loginPassword").value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Login failed.");
        }

        await showDashboard();

    } catch (error) {
        message.style.color = "#dc4444";
        message.textContent = error.message;
    }
});

// ========================================
// REGISTRATION
// ========================================

getElement("registerForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const message = getElement("message");
    message.style.color = "#778399";
    message.textContent = "Creating your account...";

    try {
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                organizationName: getElement("organizationName").value.trim(),
                email: getElement("registerEmail").value.trim(),
                password: getElement("registerPassword").value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Registration failed.");
        }

        getElement("registerForm").reset();
        showLogin();

        message.style.color = "#15976b";
        message.textContent = "Account created successfully. Please log in.";

    } catch (error) {
        message.style.color = "#dc4444";
        message.textContent = error.message;
    }
});

// ========================================
// LOGOUT
// ========================================

getElement("logoutBtn").addEventListener("click", async function() {
    try {
        const response = await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error("Unable to log out.");
        }

        getElement("dashboard").classList.add("hidden");
        getElement("authContainer").classList.remove("hidden");

        getElement("loginForm").reset();
        getElement("registerForm").reset();

        showLogin();

    } catch (error) {
        alert(error.message);
    }
});

// ========================================
// CHECK EXISTING SESSION
// ========================================

async function checkSession() {
    try {
        const response = await fetch("/api/auth/me", {
            credentials: "include"
        });

        if (response.ok) {
            await showDashboard();
        }
    } catch (error) {
        console.error("Session check failed:", error);
    }
}

// ========================================
// PRODUCT MANAGEMENT
// ========================================

const productForm = getElement("productForm");
const productMessage = getElement("productMessage");

// Load products
async function loadProducts() {
    const productList = getElement("productList");
    productList.textContent = "Loading products...";

    try {
        const response = await fetch("/api/products", {
            credentials: "include"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to load products.");
        }

        const products = Array.isArray(data)
            ? data
            : data.products || [];

        renderProducts(products);

    } catch (error) {
        console.error("Products error:", error);
        productList.textContent = error.message;
    }
}

// ========================================
// STOCK STATUS CALCULATION
// ========================================

function getProductStockStatus(product) {
    const threshold =
        product.low_stock_threshold ?? defaultLowStockThreshold;

    const quantity = Number(product.quantity);

    if (quantity === 0) {
        return "Out of Stock";
    }

    if (quantity <= Number(threshold)) {
        return "Low Stock";
    }

    return "In Stock";
}

// ========================================
// INVENTORY ANALYTICS CHARTS
// ========================================

function updateInventoryCharts(products) {
    const quantityCanvas = getElement("stockQuantityChart");
    const distributionCanvas = getElement("stockDistributionChart");

    if (!quantityCanvas || !distributionCanvas) {
        return;
    }

    if (typeof Chart === "undefined") {
        console.warn("Chart.js is not loaded. Inventory charts unavailable.");
        return;
    }

    const labels = [
        "In Stock",
        "Low Stock",
        "Out of Stock"
    ];

    const quantities = {
        "In Stock": 0,
        "Low Stock": 0,
        "Out of Stock": 0
    };

    const productCounts = {
        "In Stock": 0,
        "Low Stock": 0,
        "Out of Stock": 0
    };

    products.forEach(product => {
        const status = getProductStockStatus(product);
        const quantity = Number(product.quantity) || 0;

        quantities[status] += quantity;
        productCounts[status] += 1;
    });

    const quantityData = labels.map(label => quantities[label]);
    const distributionData = labels.map(label => productCounts[label]);

    const chartColors = [
        "#15976b",
        "#d97706",
        "#dc4444"
    ];

    // BAR CHART: INVENTORY QUANTITY

    if (stockQuantityChart) {
        stockQuantityChart.data.labels = labels;
        stockQuantityChart.data.datasets[0].data = quantityData;
        stockQuantityChart.update();

    } else {
        stockQuantityChart = new Chart(quantityCanvas, {
            type: "bar",

            data: {
                labels: labels,
                datasets: [{
                    label: "Units",
                    data: quantityData,
                    backgroundColor: chartColors,
                    borderRadius: 8,
                    maxBarThickness: 55,
                    minBarLength: 3
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    },

                    datalabels: {
                        display: true,
                        anchor: "end",
                        align: "top",
                        color: "#334155",
                        font: {
                            weight: "bold",
                            size: 12
                        },
                        formatter: function(value) {
                            return value;
                        }
                    },

                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.y} units`;
                            }
                        }
                    }
                },

                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        },
                        title: {
                            display: true,
                            text: "Total Quantity"
                        }
                    },

                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            },

            plugins: typeof ChartDataLabels !== "undefined"
                ? [ChartDataLabels]
                : []
        });
    }

    // PIE CHART: PRODUCT DISTRIBUTION

    if (stockDistributionChart) {
        stockDistributionChart.data.labels = labels;
        stockDistributionChart.data.datasets[0].data = distributionData;
        stockDistributionChart.update();

    } else {
        stockDistributionChart = new Chart(distributionCanvas, {
            type: "pie",

            data: {
                labels: labels,
                datasets: [{
                    label: "Products",
                    data: distributionData,
                    backgroundColor: chartColors,
                    borderWidth: 2,
                    borderColor: "#ffffff"
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: true,
                        position: "bottom"
                    },

                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed} products`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// ========================================
// RENDER PRODUCT TABLE
// ========================================

function renderProducts(products) {
    const container = getElement("productList");
    container.innerHTML = "";

    updateInventoryCharts(products);

    if (!products.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "No products added yet. Add your first product above.";
        container.appendChild(empty);
        return;
    }

    const table = document.createElement("table");
    table.className = "product-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    [
        "PRODUCT",
        "SKU",
        "QUANTITY",
        "STOCK STATUS",
        "SELLING PRICE",
        "ACTIONS"
    ].forEach(label => {
        const th = document.createElement("th");
        th.textContent = label;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);

    const tbody = document.createElement("tbody");

    products.forEach(product => {
        const row = document.createElement("tr");

        const status = getProductStockStatus(product);

        let statusClass = "stock-normal";

        if (status === "Out of Stock") {
            statusClass = "stock-out";
        } else if (status === "Low Stock") {
            statusClass = "stock-low";
        }

        // Product name
        const nameCell = document.createElement("td");
        const name = document.createElement("div");
        name.className = "product-name";
        name.textContent = product.name;
        nameCell.appendChild(name);

        // SKU
        const skuCell = document.createElement("td");
        const sku = document.createElement("span");
        sku.className = "product-sku";
        sku.textContent = product.sku;
        skuCell.appendChild(sku);

        // Quantity
        const quantityCell = document.createElement("td");
        quantityCell.textContent = Number(product.quantity);

        // Status
        const statusCell = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = `stock-badge ${statusClass}`;
        badge.textContent = status;
        statusCell.appendChild(badge);

        // Selling price
        const priceCell = document.createElement("td");
        const price = Number(product.selling_price);

        priceCell.textContent = Number.isFinite(price)
            ? `₹${price.toFixed(2)}`
            : "—";

        // Actions
        const actionCell = document.createElement("td");
        const actions = document.createElement("div");
        actions.className = "action-buttons";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "edit-btn";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => editProduct(product));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteProduct(product.id));

        actions.append(editButton, deleteButton);
        actionCell.appendChild(actions);

        row.append(
            nameCell,
            skuCell,
            quantityCell,
            statusCell,
            priceCell,
            actionCell
        );

        tbody.appendChild(row);
    });

    table.append(thead, tbody);
    container.appendChild(table);
}

// ========================================
// ADD OR UPDATE PRODUCT
// ========================================

productForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const productId = getElement("productId").value;
    const thresholdValue =
        getElement("productLowStockThreshold").value.trim();

    const product = {
        name: getElement("productName").value.trim(),
        sku: getElement("productSku").value.trim(),
        quantity: Number(getElement("productQuantity").value),
        cost_price: Number(getElement("productCost").value),
        selling_price: Number(getElement("productSelling").value),
        description: getElement("productDescription").value.trim(),

        low_stock_threshold: thresholdValue === ""
            ? null
            : Number(thresholdValue)
    };

    if (
        !Number.isInteger(product.quantity) ||
        product.quantity < 0 ||
        (product.low_stock_threshold !== null &&
            (!Number.isInteger(product.low_stock_threshold) ||
             product.low_stock_threshold < 0))
    ) {
        productMessage.style.color = "#dc4444";
        productMessage.textContent =
            "Quantity and stock threshold must be non-negative whole numbers.";
        return;
    }

    const url = productId
        ? `/api/products/${productId}`
        : "/api/products";

    const submitButton = getElement("productSubmitBtn");
    submitButton.disabled = true;

    try {
        const response = await fetch(url, {
            method: productId ? "PUT" : "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(product)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to save product.");
        }

        productMessage.style.color = "#15976b";
        productMessage.textContent = productId
            ? "Product updated successfully."
            : "Product added successfully.";

        resetProductForm();

        await loadSettings();
        await loadProducts();
        await loadDashboard();

    } catch (error) {
        productMessage.style.color = "#dc4444";
        productMessage.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});

// ========================================
// EDIT PRODUCT
// ========================================

function editProduct(product) {
    getElement("productId").value = product.id;
    getElement("productName").value = product.name;
    getElement("productSku").value = product.sku;
    getElement("productQuantity").value = product.quantity;
    getElement("productCost").value = product.cost_price;
    getElement("productSelling").value = product.selling_price;

    getElement("productLowStockThreshold").value =
        product.low_stock_threshold ?? "";

    getElement("productDescription").value =
        product.description || "";

    getElement("productSubmitBtn").textContent = "Update Product";
    getElement("cancelEditBtn").classList.remove("hidden");

    productMessage.style.color = "#3563e9";
    productMessage.textContent = "Editing product details.";

    productForm.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

// ========================================
// RESET PRODUCT FORM
// ========================================

function resetProductForm() {
    productForm.reset();

    getElement("productId").value = "";
    getElement("productSubmitBtn").textContent = "+ Add Product";
    getElement("cancelEditBtn").classList.add("hidden");
}

getElement("cancelEditBtn").addEventListener("click", function() {
    resetProductForm();
    productMessage.textContent = "";
});

// ========================================
// DELETE PRODUCT
// ========================================

async function deleteProduct(id) {
    if (!confirm("Are you sure you want to delete this product?")) {
        return;
    }

    try {
        const response = await fetch(`/api/products/${id}`, {
            method: "DELETE",
            credentials: "include"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to delete product.");
        }

        productMessage.style.color = "#15976b";
        productMessage.textContent = "Product deleted successfully.";

        await loadProducts();
        await loadDashboard();

    } catch (error) {
        productMessage.style.color = "#dc4444";
        productMessage.textContent = error.message;
    }
}

// ========================================
// INVENTORY SETTINGS
// ========================================

async function loadSettings() {
    try {
        const response = await fetch("/api/settings", {
            credentials: "include"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to load settings.");
        }

        defaultLowStockThreshold =
            Number(data.defaultLowStockThreshold ?? 10);

        getElement("lowStockThreshold").value =
            defaultLowStockThreshold;

    } catch (error) {
        getElement("settingsMessage").style.color = "#dc4444";
        getElement("settingsMessage").textContent = error.message;
    }
}

// Save settings
getElement("settingsForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const threshold = Number(
        getElement("lowStockThreshold").value
    );

    if (!Number.isInteger(threshold) || threshold < 0) {
        getElement("settingsMessage").style.color = "#dc4444";
        getElement("settingsMessage").textContent =
            "Please enter a valid non-negative whole number.";
        return;
    }

    try {
        const response = await fetch("/api/settings", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                defaultLowStockThreshold: threshold
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to save settings.");
        }

        defaultLowStockThreshold = threshold;

        getElement("settingsMessage").style.color = "#15976b";
        getElement("settingsMessage").textContent =
            "Settings saved successfully!";

        await loadProducts();
        await loadDashboard();

    } catch (error) {
        getElement("settingsMessage").style.color = "#dc4444";
        getElement("settingsMessage").textContent = error.message;
    }
});

// ========================================
// SIDEBAR NAVIGATION
// ========================================

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", function() {
        document.querySelectorAll(".nav-link").forEach(item => {
            item.classList.remove("active");
        });

        this.classList.add("active");
    });
});

// ========================================
// START APPLICATION
// ========================================

checkSession();
