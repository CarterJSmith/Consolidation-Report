const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

// Allowed file extensions
const allowedExtensions = /(\.csv|\.xls|\.xlsx)$/i;

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
    if (!file) return;
    // Checks file type
    if (!checkFileType(file)) return;

    console.log(file.name);
});

dropZone.addEventListener('click', () => {
    // Open file explorer
    fileInput.click();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  if (!checkFileType(file)) return;

  console.log(file.name);
});


// Check file extension for csv or excel file types.
function checkFileType(file) {
  if (!allowedExtensions.test(file.name)) {
    alert("Only CSV or Excel files are allowed");
    return false;
  }
  return true;
}

