import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { logError } from '../lib/logError';

/**
 * Secure Payment Proof Upload Component
 * Features:
 * - File size validation (max 5MB)
 * - File type validation (JPEG, PNG, WebP)
 * - Magic bytes verification
 * - Image dimension validation (max 4096x4096)
 * - Automatic image compression
 * - Mobile camera capture support
 * - Amount validation
 */
const PaymentProofUpload = ({ onUploadSuccess, onUploadError, expectedAmount, orderTotal, uniqueCode }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [amountEntered, setAmountEntered] = useState('');
  const [amountError, setAmountError] = useState(null);
  const [imageQuality, setImageQuality] = useState(85);
  const [outputFormat, setOutputFormat] = useState('auto'); // auto, jpeg, webp
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Magic bytes signatures for file type verification
  const MAGIC_BYTES = {
    jpeg: [0xFF, 0xD8, 0xFF],
    png: [0x89, 0x50, 0x4E, 0x47],
    webp: [0x52, 0x49, 0x46, 0x46] // RIFF
  };

  /**
   * Validate amount entered by user
   * Checks:
   * - Amount is within reasonable range (1000 - 10000000)
   * - Amount matches expected amount (order total + unique code)
   */
  const validateAmount = (amount) => {
    const numAmount = parseFloat(amount);
    
    // Check if valid number
    if (isNaN(numAmount) || numAmount <= 0) {
      return 'Jumlah pembayaran tidak valid';
    }
    
    // Check reasonable range (Rp 1,000 - Rp 10,000,000)
    if (numAmount < 1000 || numAmount > 10000000) {
      return 'Jumlah pembayaran harus antara Rp 1.000 - Rp 10.000.000';
    }
    
    // Check if amount matches expected (with tolerance for unique code range)
    // Unique code is typically 1-999, so we allow ±999 difference
    const minExpected = orderTotal + 1;
    const maxExpected = orderTotal + 999;
    
    if (numAmount < minExpected || numAmount > maxExpected) {
      return `Jumlah pembayaran harus antara Rp ${minExpected.toLocaleString('id-ID')} - Rp ${maxExpected.toLocaleString('id-ID')}`;
    }
    
    return null;
  };

  /**
   * Validate file magic bytes (file signature)
   * Prevents file extension spoofing attacks
   */
  const validateMagicBytes = async (file) => {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Check JPEG signature
    if (bytes[0] === MAGIC_BYTES.jpeg[0] && 
        bytes[1] === MAGIC_BYTES.jpeg[1] && 
        bytes[2] === MAGIC_BYTES.jpeg[2]) {
      return 'image/jpeg';
    }
    
    // Check PNG signature
    if (bytes[0] === MAGIC_BYTES.png[0] && 
        bytes[1] === MAGIC_BYTES.png[1] && 
        bytes[2] === MAGIC_BYTES.png[2] && 
        bytes[3] === MAGIC_BYTES.png[3]) {
      return 'image/png';
    }
    
    // Check WebP signature (RIFF....WEBP)
    if (bytes[0] === MAGIC_BYTES.webp[0] && 
        bytes[1] === MAGIC_BYTES.webp[1] && 
        bytes[2] === MAGIC_BYTES.webp[2] && 
        bytes[3] === MAGIC_BYTES.webp[3] &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && 
        bytes[10] === 0x42 && bytes[11] === 0x50) {
      return 'image/webp';
    }
    
    return null;
  };

  /**
   * Validate image dimensions
   * Prevents memory exhaustion attacks with huge images
   */
  const validateDimensions = (img) => {
    const MAX_DIMENSION = 4096;
    
    if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
      throw new Error(`Gambar terlalu besar. Maksimal ${MAX_DIMENSION}x${MAX_DIMENSION} piksel`);
    }
    
    return true;
  };

  /**
   * Compress image to reduce file size
   * Maintains quality while optimizing for upload
   * Supports WebP format and progressive JPEG
   */
  const compressImage = async (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        try {
          // Validate dimensions
          validateDimensions(img);
          
          // Calculate new dimensions (max 2048px on longest side)
          const MAX_SIZE = 2048;
          let width = img.width;
          let height = img.height;
          
          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = (height / width) * MAX_SIZE;
              width = MAX_SIZE;
            } else {
              width = (width / height) * MAX_SIZE;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw image with high quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          
          // Determine output format
          let mimeType = 'image/jpeg';
          let quality = imageQuality / 100;
          
          if (outputFormat === 'webp') {
            mimeType = 'image/webp';
          } else if (outputFormat === 'auto') {
            // Use WebP if browser supports it and it's not already WebP
            const supportsWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
            if (supportsWebP && file.type !== 'image/webp') {
              mimeType = 'image/webp';
            }
          }
          
          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Gagal mengompres gambar'));
                return;
              }
              
              // Create file from blob
              const compressedFile = new File([blob], file.name, {
                type: mimeType,
                lastModified: Date.now()
              });
              
              setCompressedSize(blob.size);
              resolve(compressedFile);
            },
            mimeType,
            quality
          );
        } catch (err) {
          reject(err);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Gagal memuat gambar'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  /**
   * Comprehensive file validation
   */
  const validateFile = async (file) => {
    // 1. Size check (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      throw new Error('Ukuran file terlalu besar. Maksimal 5MB');
    }
    
    setOriginalSize(file.size);
    
    // 2. MIME type check
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tipe file tidak valid. Gunakan JPEG, PNG, atau WebP');
    }
    
    // 3. Magic bytes verification (prevents extension spoofing)
    const actualType = await validateMagicBytes(file);
    if (!actualType) {
      throw new Error('File bukan gambar yang valid');
    }
    
    // 4. Verify MIME type matches magic bytes
    if (actualType !== file.type) {
      throw new Error('Tipe file tidak sesuai dengan konten');
    }
    
    return true;
  };

  /**
   * Handle file selection and upload
   */
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setError(null);
    setUploading(true);
    
    try {
      // Validate file
      await validateFile(file);
      
      // Compress image
      const compressedBlob = await compressImage(file);
      
      // Create File object from blob
      const compressedFile = new File(
        [compressedBlob], 
        file.name.replace(/\.[^/.]+$/, '.jpg'), // Change extension to .jpg
        { type: 'image/jpeg' }
      );
      
      // Show preview
      const previewUrl = URL.createObjectURL(compressedFile);
      setPreview(previewUrl);
      
      // Call success callback with compressed file
      if (onUploadSuccess) {
        await onUploadSuccess(compressedFile);
      }
      
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { metadata: { source: 'PaymentProofUpload' } });
      setError(err.message);
      setPreview(null);
      
      if (onUploadError) {
        onUploadError(err);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Amount Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Jumlah yang Dibayarkan
        </label>
        <input
          type="number"
          value={amountEntered}
          onChange={(e) => {
            setAmountEntered(e.target.value);
            setAmountError(null);
          }}
          onBlur={() => {
            if (amountEntered) {
              const error = validateAmount(amountEntered);
              setAmountError(error);
            }
          }}
          placeholder={`Rp ${expectedAmount?.toLocaleString('id-ID') || ''}`}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        {amountError && (
          <p className="mt-1 text-sm text-red-600">{amountError}</p>
        )}
        {expectedAmount && (
          <p className="mt-1 text-xs text-gray-500">
            Total pesanan: Rp {orderTotal?.toLocaleString('id-ID')} + kode unik: {uniqueCode} = Rp {expectedAmount.toLocaleString('id-ID')}
          </p>
        )}
      </div>

      {/* Advanced Settings */}
      <div className="border border-gray-200 rounded-lg p-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-sm font-medium text-gray-700"
        >
          <span>⚙️ Pengaturan Lanjutan</span>
          <span>{showAdvanced ? '▲' : '▼'}</span>
        </button>
        
        {showAdvanced && (
          <div className="mt-4 space-y-4">
            {/* Image Quality Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kualitas Gambar: {imageQuality}%
              </label>
              <input
                type="range"
                min="60"
                max="95"
                value={imageQuality}
                onChange={(e) => setImageQuality(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Ukuran kecil</span>
                <span>Kualitas tinggi</span>
              </div>
            </div>

            {/* Output Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format Output
              </label>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="auto">Otomatis (WebP jika didukung)</option>
                <option value="webp">WebP (kompresi terbaik)</option>
                <option value="jpeg">JPEG (kompatibilitas tinggi)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                WebP menghemat hingga 30% ukuran file
              </p>
            </div>

            {/* Storage Savings Display */}
            {originalSize > 0 && compressedSize > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm font-medium text-green-800">
                  💾 Penghematan Penyimpanan
                </p>
                <div className="mt-2 space-y-1 text-xs text-green-700">
                  <p>Ukuran asli: {(originalSize / 1024).toFixed(1)} KB</p>
                  <p>Ukuran terkompresi: {(compressedSize / 1024).toFixed(1)} KB</p>
                  <p className="font-medium">
                    Hemat: {((1 - compressedSize / originalSize) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* File Upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <input
          type="file"
          id="payment-proof"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
        
        <label 
          htmlFor="payment-proof" 
          className="cursor-pointer block"
        >
          {preview ? (
            <div className="space-y-4">
              <img 
                src={preview} 
                alt="Preview" 
                className="max-h-64 mx-auto rounded-lg"
              />
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Gambar siap diupload</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setPreview(null);
                  document.getElementById('payment-proof').value = '';
                }}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Ganti gambar
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {uploading ? (
                <Loader2 className="w-12 h-12 mx-auto text-gray-400 animate-spin" />
              ) : (
                <Upload className="w-12 h-12 mx-auto text-gray-400" />
              )}
              
              <div>
                <p className="text-lg font-medium text-gray-700">
                  {uploading ? 'Memproses gambar...' : 'Upload Bukti Pembayaran'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  JPEG, PNG, atau WebP (maks. 5MB)
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  📸 Klik untuk ambil foto atau pilih dari galeri
                </p>
              </div>
            </div>
          )}
        </label>
      </div>
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Gagal upload</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <p>✓ Gambar akan dikompres otomatis untuk mempercepat upload</p>
        <p>✓ Pastikan bukti pembayaran jelas dan terbaca</p>
        <p>✓ File akan divalidasi untuk keamanan</p>
        <p>✓ Masukkan jumlah yang benar sesuai transfer</p>
      </div>
    </div>
  );
};

export default PaymentProofUpload;
