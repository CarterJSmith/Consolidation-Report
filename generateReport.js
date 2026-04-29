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
const consoldationMax = 3;

// Metadata Display Elements
const metaName = document.getElementById('meta-name');

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
  };

  reader.readAsArrayBuffer(file);
}

// Process parsed data into two dictionaries. Number of Physical available locations is the key for one dictionary, Item is the key for the other.
function processData(jsonData) {

  // Loop through each row in the parsed JSON data
  jsonData.forEach(({Item, Location, Physical }) => {
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
  });

  console.log("Consolidated Data:", ItemDict);
  console.log("Physical Data:", PhysicalAvailableDict);
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
      // For each location that item is stored in.
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
      
    });
  }

  // Sorts the array by alphabetical order
  // aisleConsolidation.sort((a,b) => String(a[0]).localeCompare(String(b[0])));

  // This sorts by the current location alphabetically.
  aisleConsolidation.sort((a, b) => a.currentLocation.localeCompare(b.currentLocation));

  console.log("Sorted Consolidated Data:", aisleConsolidation);

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

editreportBtn.addEventListener('click', () => {
});

});
