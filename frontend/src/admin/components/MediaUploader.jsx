import React, { useState, useRef } from 'react';
import { useMediaLibrary } from '../../hooks/useMediaLibrary';
import { Button, LinearProgress, Typography, Box, Paper, IconButton } from '@mui/material';
import { CloudUpload as CloudUploadIcon, Close as CloseIcon } from '@mui/icons-material';

const MediaUploader = ({ onUploadSuccess, folder = 'default', multiple = false }) => {
  const { uploadMedia, loading, error } = useMediaLibrary();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles(multiple ? files : [files[0]]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      setSelectedFiles(multiple ? files : [files[0]]);
    }
  };

  const handleUpload = async () => {
    for (const file of selectedFiles) {
      try {
        const result = await uploadMedia(file, folder);
        if (onUploadSuccess) onUploadSuccess(result);
      } catch (err) {
        console.error('Upload error:', err);
      }
    }
    setSelectedFiles([]);
  };

  const removeFile = (index) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        sx={{
          p: 3,
          border: '2px dashed',
          borderColor: dragActive ? 'primary.main' : 'grey.300',
          bgcolor: dragActive ? 'action.hover' : 'background.paper',
          textAlign: 'center',
          cursor: 'pointer',
          position: 'relative',
        }}
        onClick={() => fileInputRef.current.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          onChange={handleChange}
          style={{ display: 'none' }}
          accept="image/*,video/*"
        />
        <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="h6" gutterBottom>
          Drag & Drop or Click to Upload
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Supports JPG, PNG, WEBP, MP4
        </Typography>
      </Paper>

      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}

      {selectedFiles.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {selectedFiles.map((file, idx) => (
            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ flexGrow: 1 }} noWrap>
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </Typography>
              <IconButton size="small" onClick={() => removeFile(idx)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleUpload}
            disabled={loading}
            sx={{ mt: 1 }}
          >
            {loading ? 'Uploading...' : `Upload ${selectedFiles.length} file(s)`}
          </Button>
          {loading && <LinearProgress sx={{ mt: 1 }} />}
        </Box>
      )}
    </Box>
  );
};

export default MediaUploader;
