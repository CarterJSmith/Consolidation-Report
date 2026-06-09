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

// Enforces exact match of num,num,letter,num,num OR letter,num,num,letter
const locationSet = new Set();
const aislePattern = /^(?:(\d{2})[a-zA-Z]\d{2}|([a-zA-Z])\d{2}[a-zA-Z])$/;

let CONSOLIDATION_INPUT = 3;
var warehouseNumber;

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
const barcodeStringInput = document.getElementById('barcode-string-input');
const consolidationInput = document.getElementById('consolidation-input');

// Barcode variables
let barcodeString = 'ReceiveSA';
let barcodeChecked = true;

// Selected aisles and report features
const selectedAisles = [];
const selectedFeatures = {
    barcode: true
};

// Update selectedFeatures when checkboxes change
// currently not in use: future feature
function updateSelectedFeatures() {
    selectedFeatures.barcode = optBarcode.checked;
}

// Add event listeners to report feature checkboxes
optBarcode.addEventListener('change', updateSelectedFeatures);

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

    if (!Item || !Location || !Physical) {
      return;
    }

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

    try {
          // Identifies warehouse
          const lastItem = jsonData[jsonData.length - 1];
          warehouseNumber = lastItem?.Zone?.includes("Applied filters:")
            ? lastItem.Zone
            : null;

    } catch (err) {
      console.error(`Error processing location "${Location}":`, err);
    }

  });
}

function addLocationIfValid(location) {

  if (typeof location !== 'string') return;

  const match = location.match(aislePattern);

  if (match) {
    locationSet.add(location.toUpperCase());
  }

}

// Identifies and consolidates items that can be moved to other locations based on physical availability.
// 
function generateReport() {
  // Items that qualify for consolidation go into this array
  const aisleConsolidation = [];

  // ConsolidationMax is default at 3. We loop through the PhysicalAvailableDict from consolidationInput to 1.
  for (let i = CONSOLIDATION_INPUT; i >= 1; i--) {
    // For each item in the PhysicalAvailableDict for that item.
    PhysicalAvailableDict[i]?.forEach(({ Item, Location}) => {
      var currentLocation = Location;

      // Check if the current location's aisle is in the selected aisles.
      if((selectedAisles.includes(currentLocation.substring(0, 2))|| selectedAisles.includes(currentLocation.substring(0, 1))) && locationSet.has(currentLocation))
      {
        ItemDict[Item].forEach(({ Location, Physical }) => {
          // If the location is different from the current location, it qualifies for consolidation.
          if (Location !== currentLocation) {
            aisleConsolidation.push({
              currentLocation,
              i, 
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
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Define table headers for each page
  const header = ["Current Location", "Current Quantity", "Item", "Potential Location", "Physical in Potential Location"];

  // Build the barcode image if barcode display is enabled
  let barcodeImageDataUrl = null;
  if (barcodeChecked && barcodeString) {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, barcodeString, {
      format: 'CODE128',
      displayValue: false,
      width: 0.9,
      height: 14,
      margin: 0
    });
    barcodeImageDataUrl = canvas.toDataURL('image/png');
  }

  const topMargin = 10;
  const bottomMargin = 20;
  const barcodeWidth = 70;
  const barcodeHeight = 9;

  // Use autoTable plugin for tables
  doc.autoTable({
    head: [header],
    body: aisleConsolidation.map(row => [
      row.currentLocation,
      row.i,
      row.Item,
      row.Location,
      row.Physical
    ]),
    startY: topMargin,
    margin: { top: topMargin, bottom: bottomMargin },
    theme: "striped",
    styles: { fontSize: 10 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    didDrawPage: (data) => {
      if (!barcodeImageDataUrl) return;
      const pageHeight = doc.internal.pageSize.getHeight();
      const x = (pageWidth - barcodeWidth) / 2;
      const y = pageHeight - bottomMargin + 8;
      doc.addImage(barcodeImageDataUrl, 'PNG', x, y, barcodeWidth, barcodeHeight);
    }
  });

  // Saves the pdf and starts download
  doc.save("Consolidation Report.pdf");
}

generateReportBtn.addEventListener('click', () => {
  generateReport();

});

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
            // Save barcode settings
            barcodeChecked = optBarcode.checked;
            barcodeString = barcodeStringInput.value || 'ReceiveSA';
            
            // Save consolidation max settings
            CONSOLIDATION_INPUT = Number(consolidationInput.value) || 3;
            if (CONSOLIDATION_INPUT < 1) {
                CONSOLIDATION_INPUT = 1;
            }
            consolidationInput.value = CONSOLIDATION_INPUT;
            
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

            var aisles = [];

            //if location is letter first, substring is 1.
            const letterMatch = locationData[0].match(/^[a-zA-Z]/);
            if (letterMatch) {
                aisles = [...new Set(locationData.map(loc => loc.substring(0, 1)))].sort();
            }
            else {
              aisles = [...new Set(locationData.map(loc => loc.substring(0, 2)))].sort();
            }
            
            // Extract unique aisle numbers (first 2 digits)
            
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
        }

        // Select All / Deselect All logic
        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = dynamicList.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
            });
            updateSelectedAisles();
        });

});
