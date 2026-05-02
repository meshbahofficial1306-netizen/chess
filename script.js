/*
  Replace this with your Google Apps Script Web App URL.
  Example:
  const API_URL = "https://script.google.com/macros/s/XXXXX/exec";

  Keep it empty only for local testing. Empty API_URL uses this browser's localStorage,
  so other people will NOT see the same registrations.
*/
const API_URL = "https://script.google.com/macros/s/AKfycbx2V0y7GezZ1T98jBoCUBwKiuD-O5fiiC8Ze42--pezp1uRzkVjAuhfV1eDKxeOcpTgUQ/exec";

const STORAGE_KEY = "asedChessRegistrations";

const form = document.getElementById("contactForm");
const formMessage = document.getElementById("formMessage");
const submitButton = document.getElementById("submitButton");
const tableBody = document.getElementById("registrationTableBody");
const emptyMessage = document.getElementById("emptyMessage");
const registrationCount = document.getElementById("registrationCount");

let registrations = [];

function normalizePhone(phone) {
    return String(phone || "").replace(/\D/g, "");
}

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;

    if (type === "success") {
        setTimeout(() => {
            formMessage.className = "form-message";
            formMessage.textContent = "";
        }, 3500);
    }
}

function getValue(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : "";
}

function getRegistrationFromForm() {
    return {
        name: getValue("name"),
        phone: getValue("phone"),
        age: getValue("age"),
        occupation: getValue("occupation"),
        category: getValue("categorySelect"),
        schoolClub: getValue("schoolClub"),
        email: getValue("email"),
        upojila: getValue("upojilaSelect"),
        message: getValue("message")
    };
}

function isDuplicatePhone(phone) {
    const normalizedNewPhone = normalizePhone(phone);

    return registrations.some(registration => {
        const existingPhone = registration.phone || registration.Phone;
        return normalizePhone(existingPhone) === normalizedNewPhone;
    });
}

function normalizeRegistration(row) {
    return {
        name: row.name || row.Name || "",
        phone: row.phone || row.Phone || "",
        age: row.age || row.Age || "",
        occupation: row.occupation || row.Occupation || "",
        category: row.category || row.Category || "",
        schoolClub: row.schoolClub || row.SchoolClub || row["School/Club"] || "",
        email: row.email || row.Email || "",
        upojila: row.upojila || row.Upojila || "",
        message: row.message || row.Message || ""
    };
}

function renderRegistrations() {
    tableBody.innerHTML = "";

    const cleanRegistrations = registrations.map(normalizeRegistration);
    registrationCount.textContent = `${cleanRegistrations.length} Registered`;

    if (cleanRegistrations.length === 0) {
        emptyMessage.style.display = "block";
        return;
    }

    emptyMessage.style.display = "none";

    cleanRegistrations.forEach((registration, index) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapeHtml(registration.name)}</td>
            <td>${escapeHtml(registration.phone)}</td>
            <td>${escapeHtml(registration.age)}</td>
            <td>${escapeHtml(registration.category)}</td>
            <td>${escapeHtml(registration.schoolClub)}</td>
            <td>${escapeHtml(registration.email)}</td>
            <td>${escapeHtml(registration.upojila)}</td>
        `;

        tableBody.appendChild(row);
    });
}

function loadLocalRegistrations() {
    registrations = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    renderRegistrations();
}

function saveLocalRegistration(registration) {
    registrations.push(registration);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registrations));
}

async function loadSharedRegistrations() {
    if (!API_URL) {
        loadLocalRegistrations();
        return;
    }

    try {
        const response = await fetch(API_URL);
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "Could not load registrations.");
        }

        registrations = result.registrations || [];
        renderRegistrations();
    } catch (error) {
        showMessage("Could not load the shared registration list. Check your Apps Script URL and deployment.", "error");
        console.error(error);
    }
}

async function submitSharedRegistration(registration) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(registration)
    });

    return response.json();
}

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const registration = getRegistrationFromForm();
    const normalizedPhone = normalizePhone(registration.phone);

    if (!normalizedPhone) {
        showMessage("Please enter a valid phone number.", "error");
        return;
    }

    if (isDuplicatePhone(registration.phone)) {
        showMessage("This phone number has already been registered.", "error");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
        if (API_URL) {
            const result = await submitSharedRegistration(registration);

            if (!result.success) {
                showMessage(result.message || "Registration failed.", "error");
                return;
            }

            await loadSharedRegistrations();
        } else {
            saveLocalRegistration(registration);
            renderRegistrations();
        }

        form.reset();
        showMessage("Registration successful.", "success");
    } catch (error) {
        showMessage("Registration failed. Check your Apps Script deployment and API URL.", "error");
        console.error(error);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Registration";
    }
});

loadSharedRegistrations();
