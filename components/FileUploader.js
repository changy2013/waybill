'use client';

import { UploadCloud } from 'lucide-react';
import { useState, useRef } from 'react';

export default function FileUploader({ onFileSelect }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSelect(file);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndSelect(file);
    }
  };

  const validateAndSelect = (file) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert('请上传有效的 Excel 或 CSV 文件格式（.xlsx, .xls, .csv）');
      return;
    }
    
    onFileSelect(file);
  };

  return (
    <div 
      className={`file-uploader ${isDragging ? 'dragover' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileInput} 
        accept=".xlsx, .xls, .csv" 
        style={{ display: 'none' }} 
      />
      
      <div className="upload-icon">
        <UploadCloud size={32} />
      </div>
      <h3>点击或拖拽文件到此处上传</h3>
      <p>支持自动识别发件人、收件人、地址等字段，支持最大 10MB 的文件</p>
      <div className="file-types">
        支持格式：.xlsx, .xls, .csv
      </div>
    </div>
  );
}
