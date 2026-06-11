import os
import cv2
import numpy as np
from PIL import Image

def analyze_error_level(image_path: str, temp_dir: str = "data/temp", quality: int = 95):
    """
    Performs Error Level Analysis (ELA) on an uploaded ID document image.
    
    It saves the original image as a temporary JPEG at a lower quality (95%),
    and computes the absolute pixel-by-pixel intensity difference. digitally
    altered parts of images compress differently and produce higher intensity 
    deviation values.
    
    Args:
        image_path (str): Absolute or relative path to the original document.
        temp_dir (str): Working directory to write the temporary compressed image.
        quality (int): JPEG quality compression level (default 95).
        
    Returns:
        tuple: (ela_score [float], variance [float])
            - ela_score: Normalized value between 0.0 and 1.0 (mean pixel difference / 255)
            - variance: Pixel variance in the difference matrix (indicators of tampering density)
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Original document image not found at path: {image_path}")
        
    os.makedirs(temp_dir, exist_ok=True)
    # Generate unique filename for temporary JPEG to prevent multi-threading collisions
    temp_jpeg_name = f"temp_ela_{os.path.basename(image_path)}"
    temp_jpeg_path = os.path.join(temp_dir, temp_jpeg_name)
    
    try:
        # Load original image using PIL
        original = Image.open(image_path).convert('RGB')
        
        # Save temporary JPEG with specified compression quality
        original.save(temp_jpeg_path, 'JPEG', quality=quality)
        
        # Read both images in OpenCV to compute the pixel matrix differences
        img_original = cv2.imread(image_path)
        img_compressed = cv2.imread(temp_jpeg_path)
        
        if img_original is None or img_compressed is None:
            # Fallback if OpenCV fails to load (e.g. format issues), calculate on PIL arrays
            arr_orig = np.array(original)
            arr_comp = np.array(Image.open(temp_jpeg_path))
            diff = np.abs(arr_orig.astype(int) - arr_comp.astype(int))
        else:
            diff = cv2.absdiff(img_original, img_compressed)
            
        mean_difference = np.mean(diff)
        variance_difference = np.var(diff)
        
        # Normalize score
        ela_score = float(mean_difference / 255.0)
        
        return ela_score, float(variance_difference)
        
    finally:
        # Guarantee cleanup of temporary image file
        if os.path.exists(temp_jpeg_path):
            try:
                os.remove(temp_jpeg_path)
            except OSError:
                pass

def detect_moire_pattern(image_path: str) -> bool:
    """
    Detects Moiré pattern artifacts in the document image using 2D FFT.
    If the image was captured from a digital screen, it creates periodic 
    high-frequency mesh signals, resulting in distinct peaks in the frequency domain.
    """
    img = cv2.imread(image_path, 0)  # Grayscale
    if img is None:
        return False
        
    # Apply FFT
    f = np.fft.fft2(img)
    fshift = np.fft.fftshift(f)
    magnitude_spectrum = 20 * np.log(np.abs(fshift) + 1)
    
    # Isolate high frequencies (zero out center/low frequencies)
    h, w = magnitude_spectrum.shape
    cy, cx = h // 2, w // 2
    
    # Zero-out the center 30x30 region (low frequency core)
    magnitude_spectrum[cy-15:cy+15, cx-15:cx+15] = 0
    
    # Calculate threshold for peak detection (e.g. 85% of maximum frequency intensity)
    max_val = np.max(magnitude_spectrum)
    if max_val <= 0:
        return False
        
    peaks = magnitude_spectrum > (max_val * 0.85)
    peak_count = np.sum(peaks)
    
    # High peak density in high-frequency spectrum indicates periodic screen patterns
    return bool(peak_count > 15)
