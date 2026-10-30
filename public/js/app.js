
// ========================================
// STOCKFLOW - FRONTEND APPLICATION
// ========================================

let defaultLowStockThreshold = 10;

let stockQuantityChart = null;
let stockDistributionChart = null;

let allProducts = [];

const getElement = (id) => document.getElementById(id);

// ========================================
// API RESPONSE HELPER
// ========================================

async function readResponse(response) {
    const text = await response.text();

    let data = {};

    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error("The server returned an invalid response.");
        }
    }

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}

// ========================================
// AUTHENTICATION TABS
// ========================================

function showLogin() {
    getElement("loginForm").classList.remove("hidden");
    getElement("registerForm").classList.add("hidden");

    getElement("loginTab").classList.add("active");
    getElement("registerTab").classList.remove("active");

    getElement("loginMessage").textContent = "";
    getElement("registerMessage").textContent = "";
}

function showRegister() {
    getElement("registerForm").classList.remove("hidden");
    getElement("loginForm").classList.add("hidden");

    getElement("registerTab").classList.add("active");
    getElement("loginTab").classList.remove("active");

    getElement("loginMessage").textContent = "";
    getElement("registerMessage").textContent = "";
}

getElement("loginTab").addEventListener("click", showLogin);
getElement("registerTab").addEventListener("click", showRegister);

// ========================================
// SHOW DASHBOARD
// ========================================

async function showDashboard() {
    getElement("authSection").classList.add("hidden");
    getElement("dashboardSection").classList.remove("hidden");

    showSection("dashboardView");

    await loadCurrentUser();
    await loadSettings();
    await loadProducts();
    await loadDashboard();
}

// ========================================
// CURRENT USER
// ========================================

async function loadCurrentUser() {
    try {
        const response = await fetch("/api/auth/me", {
            credentials: "include"
        });

        const data = await readResponse(response);

        const user = data.user || data;

        if (user.email) {
            getElement("userEmail").textContent = user.email;
            getElement("userEmail").title = user.email;
        }
    } catch (error) {
        console.error("Unable to load user details:", error);
    }
}

// ========================================
// LOGIN
// ========================================

getElement("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const message = getElement("loginMessage");
    const submitButton = this.querySelector('button[type="submit"]');

    message.style.color = "#778399";
    message.textContent = "Signing in...";

    submitButton.disabled = true;

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

        await readResponse(response);

        this.reset();
        message.textContent = "";

        await showDashboard();

    } catch (error) {
        message.style.color = "#dc4444";
        message.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});

// ========================================
// REGISTRATION
// ========================================

getElement("registerForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const message = getElement("registerMessage");
    const submitButton = this.querySelector('button[type="submit"]');

    message.style.color = "#778399";
    message.textContent = "Creating your account...";

    submitButton.disabled = true;

    try {
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                organizationName: getElement("registerOrganization").value.trim(),
                email: getElement("registerEmail").value.trim(),
                password: getElement("registerPassword").value
            })
        });

        await readResponse(response);

        this.reset();
        showLogin();

        getElement("loginMessage").style.color = "#15976b";
        getElement("loginMessage").textContent =
            "Account created successfully. Please log in.";

    } catch (error) {
        message.style.color = "#dc4444";
        message.textContent = error.message;
    } finally {
        submitButton.disabled = false;
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

        await readResponse(response);

        getElement("dashboardSection").classList.add("hidden");
        getElement("authSection").classList.remove("hidden");

        getElement("loginForm").reset();
        getElement("registerForm").reset();
        getElement("productForm").reset();

        allProducts = [];

        getElement("productSearch").value = "";

        resetProductForm();
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
        } else {
            getElement("authSection").classList.remove("hidden");
            getElement("dashboardSection").classList.add("hidden");
            showLogin();
        }
    } catch (error) {
        console.error("Session check failed:", error);
        getElement("authSection").classList.remove("hidden");
        getElement("dashboardSection").classList.add("hidden");
    }
}

// ========================================
// SIDEBAR NAVIGATION
// ========================================

function showSection(sectionId) {
    document.querySelectorAll(".content-view").forEach(section => {
        section.classList.add("hidden");
    });

    const selectedSection = getElement(sectionId);

    if (selectedSection) {
        selectedSection.classList.remove("hidden");
    }

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle(
            "active",
            link.dataset.section === sectionId
        );
    });

    const titles = {
        dashboardView: "Dashboard",
        productsView: "Products",
        settingsView: "Settings"
    };

    getElement("pageTitle").textContent =
        titles[sectionId] || "StockFlow";

    if (sectionId === "dashboardView") {
        updateInventoryCharts(allProducts);
    }
}

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", function() {
        showSection(this.dataset.section);
    });
});

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

        const data = await readResponse(response);

        const summary = data.summary || data;

        getElement("totalProducts").textContent =
            summary.totalProducts ?? 0;

        getElement("totalUnits").textContent =
            summary.totalUnits ?? 0;

        getElement("lowStockCount").textContent =
            summary.lowStockCount ?? 0;

        const lowStockProducts = data.lowStockProducts || [];
        const outOfStockProducts = data.outOfStockProducts || [];

        getElement("outOfStockCount").textContent =
            summary.outOfStockCount ?? outOfStockProducts.length;

        renderLowStockProducts(lowStockProducts);
        renderOutOfStockProducts(outOfStockProducts);

        updateInventoryCharts(allProducts);

    } catch (error) {
        console.error("Dashboard error:", error);

        lowStockList.textContent = error.message;
        outOfStockList.textContent = error.message;
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

        const threshold =
            product.low_stock_threshold ??
            product.lowStockThreshold ??
            "Default";

        info.textContent =
            `Product Code: ${product.sku} | Alert Level: ${threshold}`;

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
        info.textContent = `Product Code: ${product.sku}`;

        details.append(name, info);

        const quantity = document.createElement("span");
        quantity.className = "low-stock-quantity";
        quantity.textContent = "Out of stock";

        item.append(details, quantity);
        container.appendChild(item);
    });
}

// ========================================
// PRODUCT MANAGEMENT
// ========================================

const productForm = getElement("productForm");
const productMessage = getElement("productMessage");

// ========================================
// LOAD PRODUCTS
// ========================================

async function loadProducts() {
    const productList = getElement("productList");
    productList.textContent = "Loading products...";

    try {
        const response = await fetch("/api/products", {
            credentials: "include"
        });

        const data = await readResponse(response);

        allProducts = Array.isArray(data)
            ? data
            : data.products || [];

        renderProducts(allProducts);

    } catch (error) {
        console.error("Products error:", error);
        productList.textContent = error.message;
    }
}

// ========================================
// PRODUCT SEARCH
// ========================================

function searchProducts() {
    const searchTerm = getElement("productSearch")
        .value
        .trim()
        .toLowerCase();

    const filteredProducts = allProducts.filter(product => {
        const name = String(product.name || "").toLowerCase();
        const sku = String(product.sku || "").toLowerCase();

        return name.includes(searchTerm) || sku.includes(searchTerm);
    });

    renderProducts(filteredProducts);
}

getElement("productSearch").addEventListener("input", searchProducts);

// ========================================
// STOCK STATUS
// ========================================

function getProductStockStatus(product) {
    const threshold =
        product.low_stock_threshold ?? defaultLowStockThreshold;

    const quantity = Number(product.quantity);

    if (quantity <= 0) {
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
        console.warn("Chart.js is not loaded.");
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

    const dataLabelsPlugin =
        typeof ChartDataLabels !== "undefined"
            ? [ChartDataLabels]
            : [];

    // BAR CHART

    if (stockQuantityChart) {
        stockQuantityChart.data.labels = labels;
        stockQuantityChart.data.datasets[0].data = quantityData;
        stockQuantityChart.update();

    } else {
        stockQuantityChart = new Chart(quantityCanvas, {
            type: "bar",

            data: {
                labels,
                datasets: [{
                    label: "Stock Units",
                    data: quantityData,
                    backgroundColor: chartColors,
                    borderRadius: 8,
                    maxBarThickness: 55
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                // Extra space at the top prevents quantity labels
                // from being cut off by the chart boundary.
                layout: {
                    padding: {
                        top: 30,
                        right: 12,
                        left: 8,
                        bottom: 4
                    }
                },

                plugins: {
                    legend: {
                        display: false
                    },

                    datalabels: {
                        display: true,
                        anchor: "end",
                        align: "top",
                        offset: 4,
                        clip: false,
                        clamp: false,
                        color: "#334155",
                        font: {
                            weight: "bold",
                            size: 12
                        },
                        formatter: value => value
                    },

                    tooltip: {
                        callbacks: {
                            label: context => `${context.parsed.y} units`
                        }
                    }
                },

                scales: {
                    y: {
                        beginAtZero: true,
                        grace: "20%",
                        ticks: {
                            precision: 0
                        },
                        title: {
                            display: true,
                            text: "Stock Units"
                        }
                    },

                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            },

            plugins: dataLabelsPlugin
        });
    }

    // PIE CHART

    if (stockDistributionChart) {
        stockDistributionChart.data.labels = labels;
        stockDistributionChart.data.datasets[0].data = distributionData;
        stockDistributionChart.update();

    } else {
        stockDistributionChart = new Chart(distributionCanvas, {
            type: "pie",

            data: {
                labels,
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
                            label: context =>
                                `${context.label}: ${context.parsed} products`
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

    // Charts always use all products, not filtered search results.
    updateInventoryCharts(allProducts);

    if (!products.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";

        empty.textContent = allProducts.length === 0
            ? "No products added yet. Add your first product above."
            : "No products found. Try another product name or product code.";

        container.appendChild(empty);
        return;
    }

    const table = document.createElement("table");
    table.className = "product-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    [
        "PRODUCT",
        "PRODUCT CODE",
        "QUANTITY",
        "STOCK STATUS",
        "SALE PRICE",
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

        // Product code
        const skuCell = document.createElement("td");
        const sku = document.createElement("span");
        sku.className = "product-sku";
        sku.textContent = product.sku;
        skuCell.appendChild(sku);

        // Quantity
        const quantityCell = document.createElement("td");
        quantityCell.textContent = Number(product.quantity);

        // Stock status
        const statusCell = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = `stock-badge ${statusClass}`;
        badge.textContent = status;
        statusCell.appendChild(badge);

        // Sale price
        const priceCell = document.createElement("td");
        const price = Number(product.selling_price);

        priceCell.textContent =
            product.selling_price === null ||
            product.selling_price === undefined ||
            product.selling_price === ""
                ? "—"
                : `₹${price.toFixed(2)}`;

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
        deleteButton.addEventListener(
            "click",
            () => deleteProduct(product.id)
        );

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

    const costValue = getElement("productCost").value.trim();
    const sellingValue = getElement("productSelling").value.trim();

    const product = {
        name: getElement("productName").value.trim(),
        sku: getElement("productSku").value.trim(),
        quantity: Number(getElement("productQuantity").value),

        cost_price: costValue === ""
            ? null
            : Number(costValue),

        selling_price: sellingValue === ""
            ? null
            : Number(sellingValue),

        description: getElement("productDescription").value.trim(),

        low_stock_threshold: thresholdValue === ""
            ? null
            : Number(thresholdValue)
    };

    if (
        !product.name ||
        !product.sku ||
        !Number.isInteger(product.quantity) ||
        product.quantity < 0
    ) {
        productMessage.style.color = "#dc4444";
        productMessage.textContent =
            "Please enter a product name, product code, and valid non-negative whole quantity.";
        return;
    }

    if (
        (product.low_stock_threshold !== null &&
            (!Number.isInteger(product.low_stock_threshold) ||
             product.low_stock_threshold < 0)) ||

        (product.cost_price !== null &&
            (!Number.isFinite(product.cost_price) ||
             product.cost_price < 0)) ||

        (product.selling_price !== null &&
            (!Number.isFinite(product.selling_price) ||
             product.selling_price < 0))
    ) {
        productMessage.style.color = "#dc4444";
        productMessage.textContent =
            "Please enter valid non-negative prices and stock alert level.";
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

        await readResponse(response);

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
    getElement("productName").value = product.name || "";
    getElement("productSku").value = product.sku || "";
    getElement("productQuantity").value = product.quantity ?? "";

    getElement("productCost").value =
        product.cost_price ?? "";

    getElement("productSelling").value =
        product.selling_price ?? "";

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
    getElement("productSubmitBtn").textContent = "Add Product";
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

        await readResponse(response);

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

        const data = await readResponse(response);

        defaultLowStockThreshold =
            Number(data.defaultLowStockThreshold ?? 10);

        getElement("lowStockThreshold").value =
            defaultLowStockThreshold;

    } catch (error) {
        console.error("Settings load error:", error);

        getElement("settingsMessage").style.color = "#dc4444";
        getElement("settingsMessage").textContent = error.message;
    }
}

// ========================================
// SAVE SETTINGS
// ========================================

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

    const submitButton = this.querySelector('button[type="submit"]');
    submitButton.disabled = true;

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

        const data = await readResponse(response);

        defaultLowStockThreshold =
            Number(data.defaultLowStockThreshold ?? threshold);

        getElement("settingsMessage").style.color = "#15976b";
        getElement("settingsMessage").textContent =
            "Settings saved successfully!";

        await loadProducts();
        await loadDashboard();

    } catch (error) {
        getElement("settingsMessage").style.color = "#dc4444";
        getElement("settingsMessage").textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});

// ========================================
// START APPLICATION
// ========================================

checkSession();
