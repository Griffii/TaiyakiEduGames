document.addEventListener("DOMContentLoaded", () => {
    const xLabelsContainer = document.getElementById("x-labels");
    const yLabelsContainer = document.getElementById("y-labels");
    const setXButton = document.getElementById("set-x-button");
    const setYButton = document.getElementById("set-y-button");
    const modal = document.getElementById("label-modal");
    const modalTitle = document.getElementById("modal-title");
    const inputContainer = document.getElementById("input-container");
    const saveButton = document.getElementById("save-labels");
    const cancelButton = document.getElementById("cancel-labels");

    let xLabels = ["India", "Juliet", "Kilo", "Lima", "Mike", "November", "Oscar", "Papa"];
    let yLabels = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel"];

    let editingType = "X"; // Track whether we are editing X or Y labels

    function renderLabels() {
        xLabelsContainer.innerHTML = "";
        xLabels.forEach(label => {
            const labelDiv = document.createElement("div");
            labelDiv.classList.add("label");
            labelDiv.textContent = label;
            xLabelsContainer.appendChild(labelDiv);
        });

        yLabelsContainer.innerHTML = "";
        yLabels.forEach(label => {
            const labelDiv = document.createElement("div");
            labelDiv.classList.add("label");
            labelDiv.textContent = label;
            yLabelsContainer.appendChild(labelDiv);
        });
    }

    function openLabelModal(type) {
        editingType = type;
        modalTitle.textContent = `Set ${type} Labels`;
        inputContainer.innerHTML = ""; // Clear previous inputs

        // Populate input fields with current labels
        const labels = type === "X" ? xLabels : yLabels;
        labels.forEach((label, index) => {
            const input = document.createElement("input");
            input.type = "text";
            input.value = label;
            input.dataset.index = index;
            inputContainer.appendChild(input);
        });

        modal.style.display = "flex"; // Show modal
    }

    function saveLabels() {
        const inputs = inputContainer.querySelectorAll("input");
        const newLabels = Array.from(inputs).map(input => input.value.trim());
    
        // Ensure we always have 8 labels (allowing blanks)
        if (newLabels.length === 8) {
            if (editingType === "X") {
                xLabels = newLabels; // Allow blanks in X labels
            } else {
                yLabels = newLabels; // Allow blanks in Y labels
            }
            renderLabels();
            modal.style.display = "none"; // Close modal
        } else {
            alert("Please enter up to 8 labels.");
        }
    }
    

    function closeModal() {
        modal.style.display = "none";
    }

    setXButton.addEventListener("click", () => openLabelModal("X"));
    setYButton.addEventListener("click", () => openLabelModal("Y"));
    saveButton.addEventListener("click", saveLabels);
    cancelButton.addEventListener("click", closeModal);

    renderLabels();
});
