document.addEventListener('DOMContentLoaded', () => {
// Allowed file extensions
const allowedExtensions = /(\.csv|\.xls|\.xlsx)$/i;

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressPercent = document.getElementById('progress-percent');
const resultArea = document.getElementById('result-area');
const previewContainer = document.getElementById('preview-container');
const imagePreview = document.getElementById('image-preview');
const generateReportBtn = document.getElementById('generate-button');
const editreportBtn = document.getElementById('edit-button');

const ItemDict = {};
const PhysicalAvailableDict = {};

// Set to store unique locations that match the pattern 03A03, 17B12, etc. 
const locationSet = new Set();
const pattern = /^\d{2}[a-zA-Z]{1}\d{2}$/;

var consoldationMax = 3;

// Constants for the column names in the Excel file
const ITEM = 'ItemID';
const LOCATION = 'WMSLocationID';
const PHYSICAL = 'Physical';

// Metadata Display Elements
const metaName = document.getElementById('meta-name');

// Modal Elements
const editModal = document.getElementById('edit-modal');
const editButton = document.getElementById('edit-button');
const closeModalIcon = document.getElementById('close-modal-icon');
const cancelEdit = document.getElementById('cancel-edit');
const saveEdit = document.getElementById('save-edit');

// Select All Checkbox
const selectAllCheckbox = document.getElementById('select-all-sources');

// Report Features Checkboxes
const optBarcode = document.getElementById('opt-barcode');
const optInventory = document.getElementById('opt-inventory');
const optFinancials = document.getElementById('opt-financials');
const optCharts = document.getElementById('opt-charts');
const optRaw = document.getElementById('opt-raw');

// Selected aisles and report features
const selectedAisles = [];
const selectedFeatures = {
    barcode: true,
    inventory: true,
    financials: false,
    charts: true,
    raw: false
};

// Update selectedFeatures when checkboxes change
function updateSelectedFeatures() {
    selectedFeatures.barcode = optBarcode.checked;
    selectedFeatures.inventory = optInventory.checked;
    selectedFeatures.financials = optFinancials.checked;
    selectedFeatures.charts = optCharts.checked;
    selectedFeatures.raw = optRaw.checked;
    console.log('Selected features:', selectedFeatures);
}

// Add event listeners to report feature checkboxes
optBarcode.addEventListener('change', updateSelectedFeatures);
optInventory.addEventListener('change', updateSelectedFeatures);
optFinancials.addEventListener('change', updateSelectedFeatures);
optCharts.addEventListener('change', updateSelectedFeatures);
optRaw.addEventListener('change', updateSelectedFeatures);

dropZone.addEventListener('dragover', (e) => {
    // Prevent default behavior to allow drop
    e.preventDefault();
    dropZone.classList.add('drop-zone--over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drop-zone--over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drop-zone--over');
    const file = e.dataTransfer.files[0];
    startUpload(file);
});

dropZone.addEventListener('click', () => {
    // Open file explorer
    fileInput.click();
    
});

fileInput.addEventListener("change", () => {
  dropZone.classList.remove('drop-zone--over');
  const file = fileInput.files[0];
  startUpload(file);
});

// Start upload
const startUpload = (file) => {
    // const file = fileInput.files[0];
    if (!checkFileType(file)) return;
    handleFile(file);

};


// Check file extension for csv or excel file types.
function checkFileType(file) {
  if (!allowedExtensions.test(file.name)) {
    alert("Only CSV or Excel files are allowed");
    return false;
  }
  return true;
}

//Excel Parsing with SheetJS
  function parseData(buffer) {
    try {
      // Sheets JS requires unit8array to parse .xlsx files.
      const data = new Uint8Array(buffer);
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Only parse the first sheet
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      console.log("Parsed Excel Data:", jsonData);
      processData(jsonData);

    } catch (err) {
        console.error("Parsing failed:", err);
    }
  }


function showCompletionScreen() {
  setTimeout(() => {
    progressContainer.classList.add('hidden');
    resultArea.classList.remove('hidden');
    resultArea.classList.add('success-view'); 
  }, 500);
}

// Update screen 
function handleFile(file) {
  const reader = new FileReader();

  dropZone.classList.add('hidden');
  progressContainer.classList.remove('hidden');
  
  // Shows the progress of file reading in a loading bar
  reader.onprogress = (event) => {
      if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          progressBar.style.width = percent + '%';
          progressPercent.textContent = percent + '%';
      }
  };

  // When file is fully loaded into memory show "completion screen"
  reader.onload = (e) => {
      currentBuffer = e.target.result;
      metaName.textContent = file.name;

      // Parse the data from xlsx
      parseData(currentBuffer); 
      showCompletionScreen();
      
      // Populate location checkboxes after data is processed
      populateLocationCheckboxes();
  };

  reader.readAsArrayBuffer(file);
}

// Process parsed data into two dictionaries. Number of Physical available locations is the key for one dictionary, Item is the key for the other.
function processData(jsonData) {

  // Loop through each row in the parsed JSON data
  jsonData.forEach(({[ITEM]: Item, [LOCATION]: Location, [PHYSICAL]: Physical }) => {
    if (!ItemDict[Item]) {
      ItemDict[Item] = [];
    }

    if (!PhysicalAvailableDict[Physical]) {
      PhysicalAvailableDict[Physical] = [];
    }

    ItemDict[Item].push({
      Location,
      Physical
    });

    PhysicalAvailableDict[Physical].push({
      Item,
      Location
    });

    // Check if the location matches the pattern and add to the set if it does
    addLocationIfValid(Location);
  });

  console.log("Consolidated Data:", ItemDict);
  console.log("Physical Data:", PhysicalAvailableDict);
}

function addLocationIfValid(location) {
  if (pattern.test(location)) {
    locationSet.add(location);
  }
}

// Identifies and consolidates items that can be moved to other locations based on physical availability.
// 
function generateReport() {
  // Items that qualify for consolidation go into this array
  const aisleConsolidation = [];

  // ConsolidationMax is defaut at 3. We loop through the PhysicalAvailableDict from consolidationMax to 1.
  for (let i = consoldationMax; i >= 1; i--) {
    // For each item in the PhysicalAvailableDict for that item.
    PhysicalAvailableDict[i]?.forEach(({ Item, Location}) => {
      var currentLocation = Location;

      // Check if the current location's aisle is in the selected aisles.
      if(selectedAisles.includes(currentLocation.substring(0, 2)))
      {
        ItemDict[Item].forEach(({ Location, Physical }) => {
          // If the location is different from the current location, it qualifies for consolidation.
          if (Location !== currentLocation) {
            aisleConsolidation.push({
              currentLocation, 
              Item,
              Location,
              Physical
            });
          }
        });
      }
    });
  }

  // This sorts by the current location alphabetically.
  aisleConsolidation.sort((a, b) => a.currentLocation.localeCompare(b.currentLocation));

  // Downloads the report as a PDF
  downloadReport(aisleConsolidation);
  
}

function downloadReport(aisleConsolidation) {
  // Creates a new jsPDF instance 
  const { jsPDF } = window.jspdf;
  // Creates a new PDF document
  const doc = new jsPDF();
  // Define table headers for each page
  const header = ["Current Location", "Item", "Potential Location", "Physical in Potential Location"];

  // Use autoTable plugin for tables
  // .map takes the 2d array and maps each row to the correct format
  doc.autoTable({
    head: [header],
    body: aisleConsolidation.map(row => [
      row.currentLocation,
      row.Item,
      row.Location,
      row.Physical
    ]),
    startY: 20,
    theme: "striped",
    styles: { fontSize: 10 },
    // fill color is RBG format. Text color is white (255)
    headStyles: { fillColor: [41, 128, 185], textColor: 255 }
  });

  // Saves the pdf and starts download
  doc.save("Consolidation Report.pdf");
}

generateReportBtn.addEventListener('click', () => {
  generateReport();

});

// editreportBtn.addEventListener('click', () => {
// });

editreportBtn.addEventListener('click', openModal);

// --- Modal Logic ---

        function openModal() {
            editModal.classList.remove('hidden');
        }

        function closeModal() {
            editModal.classList.add('hidden');
        }

        editButton.addEventListener('click', openModal);
        closeModalIcon.addEventListener('click', closeModal);
        cancelEdit.addEventListener('click', closeModal);
        
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                closeModal();
            }
        });

        saveEdit.addEventListener('click', () => {
            closeModal();
        });

        // --- Populate the Left Column Automatically ---
        const dynamicList = document.getElementById('dynamic-list');

        function updateSelectAllState() {
            const checkboxes = dynamicList.querySelectorAll('input[type="checkbox"]');
            const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
            
            selectAllCheckbox.checked = checkedCount === checkboxes.length;
            selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
        }

        function populateLocationCheckboxes() {
            const locationData = Array.from(locationSet);
            
            // Extract unique aisle numbers (first 2 digits)
            const aisles = [...new Set(locationData.map(loc => loc.substring(0, 2)))].sort();
            
            // Clear existing checkboxes
            dynamicList.innerHTML = '';
            
            aisles.forEach((item, index) => {
                const label = document.createElement('label');
                label.className = 'checkbox-item';
                const isChecked = item === '03';
                label.innerHTML = `
                    <input type="checkbox" class="source-checkbox" id="zone-${index}" ${isChecked ? 'checked' : ''}>
                    <span>Aisle ${item}</span>
                `;
                
                const checkbox = label.querySelector('input');
                checkbox.addEventListener('change', () => {
                    updateSelectAllState();
                    updateSelectedAisles();
                });
                
                if (isChecked) {
                    selectedAisles.push(item);
                }
                
                dynamicList.appendChild(label);
            });

            // Initialize state after populating
            updateSelectAllState();
        }

        function updateSelectedAisles() {
            selectedAisles.length = 0;
            const checkboxes = dynamicList.querySelectorAll('.source-checkbox');
            checkboxes.forEach((cb, index) => {
                if (cb.checked) {
                    const aisleNum = cb.nextElementSibling.textContent.replace('Aisle ', '');
                    selectedAisles.push(aisleNum);
                }
            });
            console.log('Selected aisles:', selectedAisles);
        }

        // Select All / Deselect All logic
        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = dynamicList.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
            });
            updateSelectedAisles();
        });

        document.getElementById('generate-button').addEventListener('click', () => {
            console.log("Generating report...");
            console.log("Selected aisles:", selectedAisles);
            console.log("Selected features:", selectedFeatures);
        });

});
