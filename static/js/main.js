document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const dropArea = document.getElementById('drop-area');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const clearBtn = document.getElementById('clear-btn');
    const analyzeBtn = document.getElementById('analyze-btn');

    const resultIdle = document.getElementById('result-idle');
    const resultLoading = document.getElementById('result-loading');
    const resultError = document.getElementById('result-error');
    const resultContent = document.getElementById('result-content');
    const errorMessage = document.getElementById('error-message');
    const resultDescription = document.getElementById('result-description');
    const similarImagesContainer = document.getElementById('similar-images-container');
    const similarImagesList = document.getElementById('similar-images-list');

    let currentFile = null;

    // --- Event Listeners ---

    // File Input
    dropArea.addEventListener('click', (e) => {
        if (e.target !== clearBtn && !clearBtn.contains(e.target)) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    dropArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files[0]) {
            handleFile(files[0]);
        }
    });

    // Clear
    clearBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering dropArea click
        resetUpload();
    });

    // Analyze
    analyzeBtn.addEventListener('click', analyzeImage);


    // --- Functions ---

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (PNG, JPG, WEBP).');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            currentFile = {
                base64: reader.result.split(',')[1],
                mimeType: file.type,
                previewUrl: reader.result 
            };
            
            // Show preview
            imagePreview.src = currentFile.previewUrl;
            previewContainer.classList.remove('hidden');
            uploadPlaceholder.classList.add('hidden');
            
            // Enable Analyze button
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Analyze Image';

            // Reset results
            resetResults();
        };
        reader.readAsDataURL(file);
    }

    function resetUpload() {
        currentFile = null;
        fileInput.value = '';
        imagePreview.src = '';
        previewContainer.classList.add('hidden');
        uploadPlaceholder.classList.remove('hidden');
        analyzeBtn.disabled = true;
        resetResults();
    }

    function resetResults() {
        resultIdle.classList.remove('hidden');
        resultLoading.classList.add('hidden');
        resultError.classList.add('hidden');
        resultContent.classList.add('hidden');
    }

    async function analyzeImage() {
        if (!currentFile) return;

        // UI State: Loading
        resultIdle.classList.add('hidden');
        resultContent.classList.add('hidden');
        resultError.classList.add('hidden');
        resultLoading.classList.remove('hidden');
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Analyzing...';

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    base64: currentFile.base64,
                    mimeType: currentFile.mimeType
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to analyze image');
            }

            // UI State: Success
            displayResult(data);

        } catch (error) {
            // UI State: Error
            errorMessage.textContent = error.message;
            resultError.classList.remove('hidden');
            resultLoading.classList.add('hidden');
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Analyze Image';
        }
    }

    function displayResult(data) {
        resultLoading.classList.add('hidden');
        resultContent.classList.remove('hidden');
        // Align result container to top if needed, but flex handles it.

        // Description
        resultDescription.textContent = data.description;

        // Similar Images
        similarImagesList.innerHTML = '';
        const validLinks = (data.similarImages || []).filter(item => item.web && item.web.uri);

        if (validLinks.length > 0) {
            similarImagesContainer.classList.remove('hidden');
            validLinks.forEach(item => {
                const li = document.createElement('li');
                li.className = 'py-3';
                
                const a = document.createElement('a');
                a.href = item.web.uri;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.className = 'group block';

                const title = document.createElement('p');
                title.className = 'font-semibold text-indigo-600 group-hover:text-indigo-500 group-hover:underline transition-colors duration-200 truncate';
                title.textContent = item.web.title || 'Untitled Link';
                title.title = item.web.title || item.web.uri;

                const link = document.createElement('p');
                link.className = 'text-sm text-gray-500 group-hover:text-gray-600 transition-colors duration-200 truncate';
                link.textContent = item.web.uri;
                link.title = item.web.uri;

                a.appendChild(title);
                a.appendChild(link);
                li.appendChild(a);
                similarImagesList.appendChild(li);
            });
        } else {
            similarImagesContainer.classList.add('hidden');
        }
    }
});
