import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL, listAll, deleteObject } from "https://www.gstatic.com/firebasejs/9.6.6/firebase-storage.js";

document.addEventListener('DOMContentLoaded', function () {
    // Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyDXZDJGiNudokW6h04TornneQt5_xtep6Y",
        authDomain: "inventory-management-b330b.firebaseapp.com",
        projectId: "inventory-management-b330b",
        storageBucket: "inventory-management-b330b.firebasestorage.app",
        messagingSenderId: "863294594287",
        appId: "1:863294594287:web:49b1e9567abe0939544f1a",
        measurementId: "G-E7H9J01X63"
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    const storage = getStorage(app);

    // Get references to HTML elements
    const productFamilySelect = document.getElementById('product-family');
    const breakingCapacitySelect = document.getElementById('breaking-capacity');
    const polaritySelect = document.getElementById('polarity');
    const ratingSelect = document.getElementById('rating');
    const quantityInput = document.getElementById('quantity');
    const locationInput = document.getElementById('location');
    const entryTableBody = document.getElementById('entry-table')?.querySelector('tbody');
    const previewInventoryFileButton = document.getElementById('preview-inventory-file');
    const generateInventoryFileButton = document.getElementById('generate-inventory-file');
    const addEntryButton = document.getElementById('add-entry');

    const cartonMasterFileInput = document.getElementById('carton-master-file');
    const materialDescriptionInput = document.getElementById('material-description');
    const materialNumberInput = document.getElementById('material-number');
    const materialList = document.getElementById('material-list');
    const cartonQuantityInput = document.getElementById('carton-quantity');
    const cartonLocationInput = document.getElementById('carton-location');
    const cartonEntryTableBody = document.getElementById('carton-entry-table')?.querySelector('tbody');
    const previewCartonFileButton = document.getElementById('preview-carton-file');
    const saveCartonFileButton = document.getElementById('save-carton-file');
    const addCartonEntryButton = document.getElementById('add-carton-entry');

    const physicalCountingTableBody = document.getElementById('physical-counting-table')?.querySelector('tbody');
    const mcbTabTableBody = document.querySelector('#mcb-tab tbody');
    const cartonTabTableBody = document.querySelector('#carton-tab tbody');

    let allEntries = [];
    let lastEntry = null;
    let materialData = [];
    let allCartonEntries = [];
    let lastCartonEntry = null;

    // Breaking capacity data
    const breakingCapacityData = {
        '5SL1': ['3KA'],
        '5SJ': ['6KA'],
        'Mexico': ['4.5/6KA'],
        '5SL6': ['7.5KA'],
        '5SL4': ['10KA'],
        'ELSA-2': ['10kA/15kA/20kA'],
        'ELSA-1': ['6KA'],
        '5SL7': ['15KA'],
        'K': ['15KA'],
        'MB': ['7.5KA/10KA'],
        'MB Europe': ['7.5KA/10KA'],
        '5SL7-K': ['15KA']
    };

    // Event listeners
    productFamilySelect?.addEventListener('change', updateBreakingCapacityOptions);
    addEntryButton?.addEventListener('click', addEntry);
    previewInventoryFileButton?.addEventListener('click', previewInventoryFile);
    generateInventoryFileButton?.addEventListener('click', generateInventoryFileLocal);

    cartonMasterFileInput?.addEventListener('change', handleFileUpload);
    materialNumberInput?.addEventListener('input', handleMaterialNumberInput);
    addCartonEntryButton?.addEventListener('click', addCartonEntry);
    previewCartonFileButton?.addEventListener('click', previewCartonFile);
    saveCartonFileButton?.addEventListener('click', saveCartonFileLocal);

    // Functions for MCB Entry
    function updateBreakingCapacityOptions() {
        const selectedFamily = productFamilySelect.value;
        const capacities = breakingCapacityData[selectedFamily] || [];
        breakingCapacitySelect.innerHTML = '';
        capacities.forEach(capacity => {
            const option = document.createElement('option');
            option.value = capacity;
            option.textContent = capacity;
            breakingCapacitySelect.appendChild(option);
        });
    }

    function addEntry() {
        const polarity = polaritySelect.value;
        const rating = ratingSelect.value;
        const productFamily = productFamilySelect.value;
        const breakingCapacity = breakingCapacitySelect.value;
        const quantity = quantityInput.value;
        const location = locationInput.value;

        if (!polarity || !rating || !productFamily || !breakingCapacity || !quantity || !location) {
            alert('Please fill all fields before adding entry.');
            return;
        }

        const entry = {
            type: 'mcb',
            polarity,
            rating,
            productFamily,
            breakingCapacity,
            quantity,
            location,
            timestamp: new Date().toISOString()
        };
        addEntryToServer(entry);
        // Reset form fields
        polaritySelect.value = '';
        ratingSelect.value = '';
        productFamilySelect.value = '';
        updateBreakingCapacityOptions();
        quantityInput.value = '';
        locationInput.value = '';
    }

    function displayLastMcbEntry() {
        if (!document.getElementById('last-entry-table')?.querySelector('tbody')) return;
        const lastMcbEntryTableBody = document.getElementById('last-entry-table').querySelector('tbody');
        lastMcbEntryTableBody.innerHTML = '';
        if (lastEntry && lastEntry.type === 'mcb') {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${lastEntry.polarity}</td>
                <td>${lastEntry.rating}</td>
                <td>${lastEntry.productFamily}</td>
                <td>${lastEntry.breakingCapacity}</td>
                <td>${lastEntry.quantity}</td>
                <td>${lastEntry.location}</td>
                <td><button class="edit-entry" data-id="${lastEntry.id}">Edit</button></td>
            `;
            lastMcbEntryTableBody.appendChild(row);
        }
    }

    function displayMcbEntries() {
        if (!entryTableBody) return;
        entryTableBody.innerHTML = '';
        allEntries.filter(entry => entry.type === 'mcb').forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.polarity}</td>
                <td>${entry.rating}</td>
                <td>${entry.productFamily}</td>
                <td>${entry.breakingCapacity}</td>
                <td>${entry.quantity}</td>
                <td>${entry.location}</td>
                <td><button class="edit-entry" data-id="${entry.id}">Edit</button></td>
            `;
            entryTableBody.appendChild(row);
        });
    }

    // Edit entry functionality
    document.getElementById('entry-table')?.addEventListener('click', function (event) {
        if (event.target.classList.contains('edit-entry')) {
            const entryId = event.target.dataset.id;
            editEntry(entryId);
        }
    });

    async function editEntry(entryId) {
        const entry = allEntries.find(entry => entry.id === entryId);
        if (entry) {
            // Populate the form with the entry's data
            polaritySelect.value = entry.polarity;
            ratingSelect.value = entry.rating;
            productFamilySelect.value = entry.productFamily;
            updateBreakingCapacityOptions();
            breakingCapacitySelect.value = entry.breakingCapacity;
            quantityInput.value = entry.quantity;
            locationInput.value = entry.location;

            lastEntry = entry;
            displayLastMcbEntry();
        }
    }

    function previewInventoryFile() {
        if (allEntries.length === 0) {
            alert('No entries to preview.');
            return;
        }
        displayMcbEntries(); // Called here to display all entry
        generateInventoryFileButton.style.display = 'inline-block';
    }

    async function generateInventoryFileLocal() {
        if (allEntries.length === 0) {
            alert('No entries to generate.');
            return;
        }

        const fileName = prompt("Please enter the file name:", "inventory");
        if (fileName === null || fileName === "") {
            return;
        }

        try {
            const csvHeader = "Polarity,Rating,Product Family,Breaking Capacity,Quantity,Location";
            const csvRows = allEntries.filter(entry => entry.type === 'mcb').map(entry => `${entry.polarity},${entry.rating},${entry.productFamily},${entry.breakingCapacity},${entry.quantity},${entry.location}`).join('\n');
            const csvContent = `${csvHeader}\n${csvRows}`;

            // Create a Blob from the CSV content
            const blob = new Blob([csvContent], { type: 'text/csv' });

            // Create a reference to the Firebase Storage location where you want to save the file
            const storageRef = ref(storage, `mcbFiles/${fileName}.csv`);

            // Upload the file to Firebase Storage
            uploadBytes(storageRef, blob)
                .then((snapshot) => {
                    console.log('Uploaded a blob or file!');
                    // Get the download URL
                    getDownloadURL(storageRef)
                        .then((downloadURL) => {
                            console.log('File available at', downloadURL);
                            alert('MCB entries saved to Firebase Storage successfully!');
                            allEntries = [];
                            displayMcbEntries();
                            listFiles('mcb', mcbTabTableBody);
                        })
                        .catch((error) => {
                            console.error("Error getting download URL:", error);
                            alert("Error getting download URL. Please check the console for errors.");
                        });
                })
                .catch((error) => {
                    console.error("Error uploading MCB file to Firebase Storage:", error);
                    alert("Failed to save MCB file to Firebase Storage. Please check the console for errors.");
                });
        } catch (error) {
            console.error("Error saving MCB file to Firebase:", error);
            alert("Failed to save MCB file to Firebase. Please check the console for errors.");
        }
    }

    // Functions for Carton Entry
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                materialData = XLSX.utils.sheet_to_json(worksheet);
                console.log("Parsed Excel data:", materialData); // Inspect the data
                populateMaterialList();
            };
            reader.readAsArrayBuffer(file);
        }
    }

    function populateMaterialList() {
        materialList.innerHTML = '';
        materialData.forEach(item => {
            const option = document.createElement('option');
            option.value = item['Material number'];
            materialList.appendChild(option);
        });
    }

    function handleMaterialNumberInput() {
        const number = materialNumberInput.value;

        // Define possible keys for material description and number
        const descriptionKey = 'Material description';
        const numberKey = 'Material number';

        const material = materialData.find(item => {
            // Normalize both the input and the material number for comparison
            const normalizedNumber = number.trim().toLowerCase();
            const normalizedMaterialNumber = String(item[numberKey]).trim().toLowerCase(); // Ensure it's a string
            console.log(`Comparing "${normalizedNumber}" with "${normalizedMaterialNumber}"`);

            return normalizedNumber === normalizedMaterialNumber;
        });

        if (material) {
            const materialDescription = material[descriptionKey];
            console.log("Found matching material:", material);
            console.log("Material Description:", materialDescription);

            if (materialDescription !== undefined && materialDescription !== null) {
                materialDescriptionInput.value = materialDescription;
            } else {
                materialDescriptionInput.value = '';
                console.warn("Material description is undefined or null in the data.");
            }
        } else {
            materialDescriptionInput.value = '';
            console.log("No matching material found.");
        }
    }

    function addCartonEntry() {
        const number = materialNumberInput.value;
        const description = materialDescriptionInput.value;
        const quantity = cartonQuantityInput.value;
        const location = cartonLocationInput.value;

        if (!description || !number || !quantity || !location) {
            alert('Please fill all fields before adding entry.');
            return;
        }

        const entry = {
            type: 'carton',
            number,
            description,
            quantity,
            location,
            timestamp: new Date().toISOString()
        };
        addEntryToServer(entry);
    }

    function displayLastCartonEntry() {
        if (!document.getElementById('last-carton-entry-table')?.querySelector('tbody')) return;
        const lastCartonEntryTableBody = document.getElementById('last-carton-entry-table').querySelector('tbody');
        lastCartonEntryTableBody.innerHTML = '';
        if (lastEntry && lastEntry.type === 'carton') {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${lastEntry.number}</td>
                <td>${lastEntry.description}</td>
                <td>${lastEntry.quantity}</td>
                <td>${lastEntry.location}</td>
                <td><button class="edit-carton-entry" data-id="${lastEntry.id}">Edit</button></td>
            `;
            lastCartonEntryTableBody.appendChild(row);
        }
    }

    function displayCartonEntries() {
        if (!cartonEntryTableBody) return;
        cartonEntryTableBody.innerHTML = '';
        allEntries.filter(entry => entry.type === 'carton').forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.number}</td>
                <td>${entry.description}</td>
                <td>${entry.quantity}</td>
                <td>${entry.location}</td>
                <td><button class="edit-carton-entry" data-id="${entry.id}">Edit</button></td>
            `;
            cartonEntryTableBody.appendChild(row);
        });
    }

    // Edit carton entry functionality
    document.getElementById('carton-entry-table')?.addEventListener('click', function (event) {
        if (event.target.classList.contains('edit-carton-entry')) {
            const entryId = event.target.dataset.id;
            editCartonEntry(entryId);
        }
    });

    async function editCartonEntry(entryId) {
        const entry = allEntries.find(entry => entry.id === entryId);
        if (entry) {
            materialNumberInput.value = entry.number;
            materialDescriptionInput.value = entry.description;
            cartonQuantityInput.value = entry.quantity;
            cartonLocationInput.value = entry.location;

            lastEntry = entry;
            displayLastCartonEntry();
        }
    }

    function previewCartonFile() {
        if (allCartonEntries.length === 0) {
            alert('No entries to preview.');
            return;
        }
        displayCartonEntries(); // Called here to display all entries
        saveCartonFileButton.style.display = 'inline-block';
    }

    async function saveCartonFileLocal() {
        if (allCartonEntries.length === 0) {
            alert('No entries to generate.');
            return;
        }

        const fileName = prompt("Please enter the file name:", "carton");
        if (fileName === null || fileName === "") {
            return;
        }

        try {
            const csvHeader = "Material Number,Material Description,Quantity,Location";
            const csvRows = allCartonEntries.map(entry => `${entry.number},${entry.description},${entry.quantity},${entry.location}`).join('\n');
            const csvContent = `${csvHeader}\n${csvRows}`;

            // Create a Blob from the CSV content
            const blob = new Blob([csvContent], { type: 'text/csv' });

            // Create a reference to the Firebase Storage location where you want to save the file
            const storageRef = ref(storage, `cartonFiles/${fileName}.csv`);

            // Upload the file to Firebase Storage
            uploadBytes(storageRef, blob)
                .then((snapshot) => {
                    console.log('Uploaded a blob or file!');
                    // Get the download URL
                    getDownloadURL(storageRef)
                        .then((downloadURL) => {
                            console.log('File available at', downloadURL);
                            alert('Carton entries saved to Firebase Storage successfully!');
                            allCartonEntries = [];
                            displayCartonEntries();
                            listFiles('carton', cartonTabTableBody);
                        })
                        .catch((error) => {
                            console.error("Error getting download URL:", error);
                            alert("Error getting download URL. Please check the console for errors.");
                        });
                })
                .catch((error) => {
                    console.error("Error uploading Carton file to Firebase Storage:", error);
                    alert("Failed to save Carton file to Firebase Storage. Please check the console for errors.");
                });
        } catch (error) {
            console.error("Error saving Carton file to Firebase:", error);
            alert("Failed to save Carton file to Firebase. Please check the console for errors.");
        }
    }

    // Listing files from localStorage on the Physical Counting page
    function listFiles(type, tableBody) {
        tableBody.innerHTML = '';
        const storageRef = ref(storage, `${type}Files/`);

        listAll(storageRef)
            .then((res) => {
                if (res.items.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="2">No files found in Firebase Storage.</td></tr>';
                    return;
                }

                res.items.forEach((itemRef) => {
                    getDownloadURL(itemRef)
                        .then((url) => {
                            const fileName = itemRef.name;
                            const row = document.createElement('tr');
                            row.classList.add('bold');

                            // Extract timestamp from filename if it exists
                            let formattedDate = '';

                            row.innerHTML = `
                                <td>${fileName}</td>
                                <td>
                                    <a href="${url}" target="_blank" download="${fileName}">Download</a>
                                    <button class="delete-file" data-name="${fileName}" data-type="${type}">Delete</button>
                                    <span class="file-date">Saved: ${formattedDate}</span>
                                </td>`;
                            tableBody.appendChild(row);
                        })
                        .catch((error) => {
                            console.error("Error getting download URL:", error);
                            alert("Error getting download URL. Please check the console for errors.");
                        });
                });
            })
            .catch((error) => {
                console.error("Error listing files from Firebase Storage:", error);
                tableBody.innerHTML = '<tr><td colspan="2">Error listing files from Firebase Storage.</td></tr>';
            });
    }

    // Function to delete file from Firebase Storage
    function deleteFile(fileName, type) {
        const storageRef = ref(storage, `${type}Files/${fileName}`);

        deleteObject(storageRef)
            .then(() => {
                alert('File deleted successfully from Firebase Storage!');
                listFiles(type, (type === 'mcb') ? mcbTabTableBody : cartonTabTableBody);
            })
            .catch((error) => {
                console.error("Error deleting file from Firebase Storage:", error);
                alert("Error deleting file from Firebase Storage. Please check the console for errors.");
            });
    }

    // Global event listener for download and delete buttons on Physical Counting page
    document.querySelector('.content')?.addEventListener('click', function (event) {
        if (event.target.classList.contains('delete-file')) {
            const fileName = event.target.dataset.name;
            const type = event.target.dataset.type;
            deleteFile(fileName, type);
        }
    });

    // Initialize breaking capacity options on page load for MCB Entry
    if (productFamilySelect) {
        updateBreakingCapacityOptions();
    }

    // Load file lists on page load for Physical Counting
    const mcbTab = document.getElementById('mcb-tab');
    const cartonTab = document.getElementById('carton-tab');

    if (mcbTab) {
        listFiles('mcb', mcbTabTableBody);
    }

    if (cartonTab) {
        listFiles('carton', cartonTabTableBody);
    }
     // Function to save MCB entries to localStorage (called from Physical Counting page)
     window.saveMcbEntries = function () {
        if (allEntries.length === 0) {
            alert('No MCB entries to save.');
            return;
        }

        const fileName = prompt("Please enter the file name:", "inventory");
        if (fileName === null || fileName === "") {
            return;
        }

        const csvHeader = "Polarity,Rating,Product Family,Breaking Capacity,Quantity,Location";
        const csvRows = allEntries.map(entry => `${entry.polarity},${entry.rating},${entry.productFamily},${entry.breakingCapacity},${entry.quantity},${entry.location}`).join('\n');
        const csvContent = `${csvHeader}\n${csvRows}`;

        // Save file content in localStorage under "mcbFiles".
        let mcbFiles = JSON.parse(localStorage.getItem('mcbFiles') || '[]');
        const createdAt = new Date().toISOString();
        mcbFiles.push({ fileName: `${fileName}.csv`, content: csvContent, createdAt: createdAt });
        localStorage.setItem('mcbFiles', JSON.stringify(mcbFiles));

        alert('MCB entries saved to local storage successfully!');
        // Clear all entries after saving
        allEntries = [];
        displayMcbEntries(); // Clear the table
        listFiles('mcb', document.querySelector('#mcb-tab tbody'));
    };
     // Function to save Carton entries to localStorage (called from Physical Counting page)
     window.saveCartonEntries = function () {
          if (allCartonEntries.length === 0) {
            alert('No entries to generate.');
            return;
        }
        const fileName = prompt("Please enter the file name:", "carton");
        if (fileName === null || fileName === "") {
            return;
        }

        const csvHeader = "Material Number,Material Description,Quantity,Location";
        const csvRows = allCartonEntries.map(entry => `${entry.number},${entry.description},${entry.quantity},${entry.location}`).join('\n');
        const csvContent = `${csvHeader}\n${csvRows}`;

        let cartonFiles = JSON.parse(localStorage.getItem('cartonFiles') || '[]');
        const createdAt = new Date().toISOString();
        cartonFiles.push({ fileName: `${fileName}.csv`, content: csvContent, createdAt: createdAt });
        localStorage.setItem('cartonFiles', JSON.stringify(cartonFiles));

        alert('Carton entries saved to local storage successfully!');
        allCartonEntries = [];
        displayCartonEntries();
        listFiles('carton', document.querySelector('#carton-tab tbody'));
    };
});
