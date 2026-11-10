
let products = [];
let defaultLowStockThreshold = 5;

const $ = (id) => document.getElementById(id);

async function readResponse(response) {
    const text = await response.text();

    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        throw new Error("Invalid server response.");
    }

    if (!response.ok) {
        throw new Error(data.message || data.error || "Something went wrong.");
    }

    return data;
}

function showMessage(id, message, success = false) {
    const element = $(id);
    element.textContent = message;
    element.className = success ? "message success" : "message error";
}

function clearMessages() {
    ["loginMessage", "registerMessage", "productMessage", "settingsMessage"]
        .forEach(id => {
            if ($(id)) $(id).textContent = "";
        });
}

function showLogin() {
    $("loginForm").classList.remove("hidden");
    $("registerForm").classList.add("hidden");
    $("loginTab").classList.add("active");
    $("registerTab").classList.remove("active");
    clearMessages();
}

function showRegister() {
    $("registerForm").classList.remove("hidden");
    $("loginForm").classList.add("hidden");
    $("registerTab").classList.add("active");
    $("loginTab").classList.remove("active");
    clearMessages();
}

$("loginTab").addEventListener("click", showLogin);
$("registerTab").addEventListener("click", showRegister);

// Registration
$("registerForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const organizationName = $("registerOrganization").value.trim();
    const email = $("registerEmail").value.trim();
    const password = $("registerPassword").value;
    const confirmPassword = $("confirmPassword").value;

    if (password !== confirmPassword) {
        showMessage("registerMessage", "Passwords do not match.");
        return;
    }

    try {
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                organizationName,
                email,
                password
            })
        });

        await readResponse(response);

        $("registerForm").reset();
        showLogin();
        showMessage("loginMessage", "Registration successful. Please log in.", true);

    } catch (error) {
        showMessage("registerMessage", error.message);
    }
});

// Login
$("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password })
        });

        await readResponse(response);

        $("loginForm").reset();
        await showDashboard();

    } catch (error) {
        showMessage("loginMessage", error.message);
    }
});

// Logout
$("logoutBtn").addEventListener("click", async () => {
    try {
        await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include"
        });
    } catch (error) {
        console.error("Logout error:", error);
    }

    products = [];
    $("dashboardSection").classList.add("hidden");
    $("authSection").classList.remove("hidden");
    showLogin();
});

// Session and application display
async function showDashboard() {
    $("authSection").classList.add("hidden");
    $("dashboardSection").classList.remove("hidden");

    try {
        await loadCurrentUser();
        await loadSettings();
        await loadProducts();
        await loadDashboard();
    } catch (error) {
        console.error(error);
    }
}

async function loadCurrentUser() {
    const response = await fetch("/api/auth/me", {
        credentials: "include"
    });

    const data = await readResponse(response);
    const user = data.user || data;

    $("userEmail").textContent = user.email || "";
}

async function checkSession() {
    try {
        const response = await fetch("/api/auth/me", {
            credentials: "include"
        });

        if (response.ok) {
            await showDashboard();
        } else {
            $("authSection").classList.remove("hidden");
            $("dashboardSection").classList.add("hidden");
            showLogin();
        }
    } catch {
        $("authSection").classList.remove("hidden");
        $("dashboardSection").classList.add("hidden");
        showLogin();
    }
}

// Navigation
document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {
        showSection(button.dataset.section);
    });
});

function showSection(sectionId) {
    document.querySelectorAll(".content-section").forEach(section => {
        section.classList.add("hidden");
    });

    $(sectionId).classList.remove("hidden");

    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.section === sectionId
        );
    });

    const titles = {
        dashboardView: "Dashboard",
        productsView: "Products",
        settingsView: "Settings"
    };

    $("pageTitle").textContent = titles[sectionId] || "StockFlow";
}

// Product stock status
function getProductStockStatus(product) {
    const quantity = Number(product.quantity);
    const threshold = Number(
        product.low_stock_threshold ?? defaultLowStockThreshold
    );

    if (quantity <= threshold) {
        return "Low Stock";
    }

    return "In Stock";
}

function getEffectiveThreshold(product) {
    return product.low_stock_threshold === null ||
        product.low_stock_threshold === undefined ||
        product.low_stock_threshold === ""
        ? defaultLowStockThreshold
        : Number(product.low_stock_threshold);
}

// Dashboard
async function loadDashboard() {
    const response = await fetch("/api/dashboard", {
        credentials: "include"
    });

    const data = await readResponse(response);
    const summary = data.summary || data;

    $("totalProducts").textContent =
        summary.totalProducts ?? summary.total_products ?? products.length;

    $("totalUnits").textContent =
        summary.totalUnits ?? summary.totalQuantity ??
        summary.total_quantity ??
        products.reduce((total, product) => total + Number(product.quantity || 0), 0);

    const lowStockProducts = data.lowStockProducts || data.low_stock_products ||
        products.filter(product =>
            Number(product.quantity) <= getEffectiveThreshold(product)
        );

    $("lowStockCount").textContent =
        summary.lowStockCount ?? summary.lowStockItems ??
        summary.low_stock_count ?? lowStockProducts.length;

    renderLowStockProducts(lowStockProducts);
}

function renderLowStockProducts(items) {
    const tbody = $("lowStockList");
    tbody.innerHTML = "";

    if (!items.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 4;
        cell.textContent = "No low-stock products";
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    items.forEach(product => {
        const row = document.createElement("tr");

        [
            product.name,
            product.sku,
            product.quantity,
            getEffectiveThreshold(product)
        ].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value ?? "";
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });
}

// Load products
async function loadProducts() {
    const response = await fetch("/api/products", {
        credentials: "include"
    });

    const data = await readResponse(response);

    products = Array.isArray(data)
        ? data
        : (data.products || []);

    renderProducts(products);
}

// Display products
function renderProducts(items) {
    const tbody = $("productList");
    tbody.innerHTML = "";

    if (!items.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 6;
        cell.textContent = "No products found";
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    items.forEach(product => {
        const row = document.createElement("tr");

        const values = [
            product.name,
            product.sku,
            product.quantity,
            getProductStockStatus(product),
            product.selling_price ?? "-"
        ];

        values.forEach((value, index) => {
            const cell = document.createElement("td");
            cell.textContent = value ?? "";

            if (index === 3) {
                cell.className = value === "Low Stock"
                    ? "low-stock"
                    : "in-stock";
            }

            row.appendChild(cell);
        });

        const actions = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => editProduct(product));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-btn";
        deleteButton.addEventListener("click", () => deleteProduct(product.id));

        actions.append(editButton, deleteButton);
        row.appendChild(actions);

        tbody.appendChild(row);
    });
}

// Search products
$("productSearch").addEventListener("input", (event) => {
    const search = event.target.value.trim().toLowerCase();

    const filtered = products.filter(product =>
        String(product.name || "").toLowerCase().includes(search) ||
        String(product.sku || "").toLowerCase().includes(search)
    );

    renderProducts(filtered);
});

// Add or update product
$("productForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = $("productId").value;

    const quantity = Number($("productQuantity").value);
    const costPrice = $("productCost").value;
    const sellingPrice = $("productSelling").value;
    const threshold = $("productLowStockThreshold").value;

    if (!Number.isInteger(quantity) || quantity < 0) {
        showMessage("productMessage", "Quantity must be a non-negative whole number.");
        return;
    }

    if (threshold !== "" &&
        (!Number.isInteger(Number(threshold)) || Number(threshold) < 0)) {
        showMessage("productMessage", "Low-stock threshold must be a non-negative whole number.");
        return;
    }

    if (
        (costPrice !== "" && (!Number.isFinite(Number(costPrice)) || Number(costPrice) < 0)) ||
        (sellingPrice !== "" && (!Number.isFinite(Number(sellingPrice)) || Number(sellingPrice) < 0))
    ) {
        showMessage("productMessage", "Prices must be non-negative numbers.");
        return;
    }

    const payload = {
        name: $("productName").value.trim(),
        sku: $("productSku").value.trim(),
        quantity,
        cost_price: costPrice === "" ? null : Number(costPrice),
        selling_price: sellingPrice === "" ? null : Number(sellingPrice),
        low_stock_threshold: threshold === "" ? null : Number(threshold),
        description: $("productDescription").value.trim() || null
    };

    if (!payload.name || !payload.sku) {
        showMessage("productMessage", "Product name and SKU are required.");
        return;
    }

    try {
        const response = await fetch(
            id ? `/api/products/${id}` : "/api/products",
            {
                method: id ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload)
            }
        );

        await readResponse(response);

        resetProductForm();
        await loadProducts();
        await loadDashboard();

        showMessage(
            "productMessage",
            id ? "Product updated successfully." : "Product added successfully.",
            true
        );

    } catch (error) {
        showMessage("productMessage", error.message);
    }
});

// Edit product
function editProduct(product) {
    $("productId").value = product.id;
    $("productName").value = product.name || "";
    $("productSku").value = product.sku || "";
    $("productQuantity").value = product.quantity ?? 0;
    $("productCost").value = product.cost_price ?? "";
    $("productSelling").value = product.selling_price ?? "";
    $("productLowStockThreshold").value =
        product.low_stock_threshold ?? "";
    $("productDescription").value = product.description || "";

    $("productFormTitle").textContent = "Edit Product";
    $("productSubmitBtn").textContent = "Update Product";
    $("cancelEditBtn").classList.remove("hidden");

    $("productForm").scrollIntoView({ behavior: "smooth" });
}

// Reset product form
function resetProductForm() {
    $("productForm").reset();
    $("productId").value = "";
    $("productFormTitle").textContent = "Add Product";
    $("productSubmitBtn").textContent = "Add Product";
    $("cancelEditBtn").classList.add("hidden");
}

$("cancelEditBtn").addEventListener("click", resetProductForm);

// Delete product
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

        await loadProducts();
        await loadDashboard();

    } catch (error) {
        alert(error.message);
    }
}

// Settings
async function loadSettings() {
    const response = await fetch("/api/settings", {
        credentials: "include"
    });

    const data = await readResponse(response);

    defaultLowStockThreshold = Number(
        data.defaultLowStockThreshold ??
        data.default_low_stock_threshold ??
        5
    );

    $("lowStockThreshold").value = defaultLowStockThreshold;
}

$("settingsForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const threshold = Number($("lowStockThreshold").value);

    if (!Number.isInteger(threshold) || threshold < 0) {
        showMessage(
            "settingsMessage",
            "Threshold must be a non-negative whole number."
        );
        return;
    }

    try {
        const response = await fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                defaultLowStockThreshold: threshold
            })
        });

        await readResponse(response);

        defaultLowStockThreshold = threshold;

        await loadProducts();
        await loadDashboard();

        showMessage("settingsMessage", "Settings saved successfully.", true);

    } catch (error) {
        showMessage("settingsMessage", error.message);
    }
});

// Start application
checkSession();
