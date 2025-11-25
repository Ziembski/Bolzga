const evt = new EventSource("/events");

evt.onmessage = (e) => {
    const data = JSON.parse(e.data);
    updatePage(data);
};

function updatePage(matrix) {
    fieldElements.forEach(el => {
        const fieldName = el.dataset.name;       // "Imię"
        const key = `${fieldName}_${row}`;       // "Imię_1"
        const value = matrix[key] || "";

        // OLD:
        // el.innerText = `${fieldName}: ${value}`;

        // NEW — only the value:
        el.innerText = value;
    });
}

async function loadInitial() {
    const res = await fetch("/api/data");
    const matrix = await res.json();
    updatePage(matrix);
}

loadInitial();

const btn = document.getElementById("refresh");
if (btn) {
    btn.onclick = async () => {
        await fetch("/api/refresh");
    };
}

