
function showLogin() {
    document.getElementById("loginForm").classList.remove("hidden");
    document.getElementById("registerForm").classList.add("hidden");

    document.getElementById("loginTab").classList.add("active");
    document.getElementById("registerTab").classList.remove("active");

    document.getElementById("message").textContent = "";
}

function showRegister() {
    document.getElementById("registerForm").classList.remove("hidden");
    document.getElementById("loginForm").classList.add("hidden");

    document.getElementById("registerTab").classList.add("active");
    document.getElementById("loginTab").classList.remove("active");

    document.getElementById("message").textContent = "";
}

// Show dashboard
async function showDashboard() {
    document.getElementById("authContainer").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");

    await loadDashboard();
}

// Load dashboard information
async function loadDashboard() {
    const lowStockList = document.getElementById("lowStockList");
    lowStockList.textContent = "Loading inventory...";

    try {
        const response = await fetch("/api/dashboard", {
            credentials: "include"
        });

        if (response.status === 401) {
            alert("Please log in again.");
            document.getElementById("dashboard").classList.add("hidden");
            document.getElementById("authContainer").classList.remove("hidden");
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to load dashboard.");
        }

        document.getElementById("totalProducts").textContent =
            data.totalProducts ?? 0;

        document.getElementById("totalUnits").textContent =
            data.totalUnits ?? 0;

        document.getElementById("lowStockCount").textContent =
            data.lowStockCount ?? 0;

        lowStockList.innerHTML = "";

        const products = data.lowStockProducts || [];

        if (products.length === 0) {
            lowStockList.textContent = "No low-stock products.";
            return;
        }

        products.forEach(product => {
            const item = document.createElement("p");
            item.textContent =
                `${product.name} — Quantity: ${product.quantity}`;
            lowStockList.appendChild(item);
        });

    } catch (error) {
        console.error("Dashboard error:", error);
        lowStockList.textContent = "Unable to load inventory.";
    }
}

// Login API
document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const message = document.getElementById("message");
    message.textContent = "Logging in...";

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                email: document.getElementById("loginEmail").value,
                password: document.getElementById("loginPassword").value
            })
        });

        const data = await response.json();

        if (response.ok) {
            message.style.color = "green";
            message.textContent = "Login successful!";
            await showDashboard();
        } else {
            message.textContent = data.message || "Login failed.";
            message.style.color = "red";
        }

    } catch (error) {
        message.textContent = "Unable to connect to the server.";
        message.style.color = "red";
    }
});

// Registration API
document.getElementById("registerForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const message = document.getElementById("message");
    message.textContent = "Creating account...";

    try {
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                organizationName: document.getElementById("organizationName").value,
                email: document.getElementById("registerEmail").value,
                password: document.getElementById("registerPassword").value
            })
        });

        const data = await response.json();

        if (response.ok) {
            message.style.color = "green";
            message.textContent = "Registration successful. Please log in.";
            showLogin();
        } else {
            message.textContent = data.message || "Registration failed.";
            message.style.color = "red";
        }

    } catch (error) {
        message.textContent = "Unable to connect to the server.";
        message.style.color = "red";
    }
});

// Logout API
document.getElementById("logoutBtn").addEventListener("click", async function() {
    try {
        const response = await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include"
        });

        if (response.ok) {
            document.getElementById("dashboard").classList.add("hidden");
            document.getElementById("authContainer").classList.remove("hidden");

            document.getElementById("loginForm").reset();
            document.getElementById("registerForm").reset();

            showLogin();
        } else {
            alert("Unable to log out. Please try again.");
        }

    } catch (error) {
        alert("Unable to connect to the server.");
    }
});
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

checkSession();