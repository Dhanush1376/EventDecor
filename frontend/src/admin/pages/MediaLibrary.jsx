import React, { useEffect, useState, useCallback } from 'react';
import { useMediaLibrary } from '../../hooks/useMediaLibrary';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Chip,
  Tabs,
  Tab,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import { Delete, Restore, FileCopy, Close } from '@mui/icons-material';
import MediaUploader from '../components/MediaUploader';

const MediaLibrary = () => {
  const { items, stats, loading, fetchLibrary, fetchStats, deleteMedia, restoreMedia } =
    useMediaLibrary();
  const [tab, setTab] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);

  const loadItems = useCallback(() => {
    const status = tab === 0 ? 'active' : 'pending_delete';
    fetchLibrary({ status, limit: 100 });
  }, [tab, fetchLibrary]);

  useEffect(() => {
    fetchStats();
    loadItems();
  }, [fetchStats, loadItems]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this asset? (Soft delete for 30 days)')) {
      await deleteMedia(id);
      loadItems();
    }
  };

  const handleRestore = async (id) => {
    await restoreMedia(id);
    loadItems();
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    alert('URL copied to clipboard!');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Media Library</Typography>
        <Button variant="contained" color="primary" onClick={() => setUploadOpen(true)}>
          Upload Media
        </Button>
      </Box>

      {stats && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Assets
                </Typography>
                <Typography variant="h5">{stats.summary.totalCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Storage Used
                </Typography>
                <Typography variant="h5">
                  {(stats.summary.totalBytes / 1024 / 1024 / 1024).toFixed(2)} GB
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Bandwidth Saved (Optimization)
                </Typography>
                <Typography variant="h5" color="success.main">
                  {(stats.summary.savedBytes / 1024 / 1024 / 1024).toFixed(2)} GB
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Active Assets" />
        <Tab label="Trash (Pending Deletion)" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {items.map((item) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component={item.resourceType === 'video' ? 'video' : 'img'}
                  height="200"
                  image={item.posterUrl || item.secureUrl}
                  alt={item.originalFilename}
                  controls={item.resourceType === 'video'}
                  sx={{ objectFit: 'contain', bgcolor: '#f5f5f5' }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" noWrap title={item.originalFilename}>
                    {item.originalFilename}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" display="block">
                    {item.format.toUpperCase()} • {(item.bytes / 1024).toFixed(1)} KB
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      size="small"
                      label={`${item.referenceCount} refs`}
                      color={item.referenceCount > 0 ? 'primary' : 'default'}
                    />
                    <Chip size="small" label={item.folder.split('/').pop()} sx={{ ml: 1 }} />
                  </Box>
                </CardContent>
                <CardActions>
                  <IconButton
                    size="small"
                    onClick={() => copyToClipboard(item.secureUrl)}
                    title="Copy URL"
                  >
                    <FileCopy fontSize="small" />
                  </IconButton>

                  <Box sx={{ flexGrow: 1 }} />

                  {tab === 0 ? (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(item._id)}
                      title="Delete"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  ) : (
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => handleRestore(item._id)}
                      title="Restore"
                    >
                      <Restore fontSize="small" />
                    </IconButton>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}

          {items.length === 0 && (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', p: 5, color: 'text.secondary' }}>
                <Typography variant="h6">No assets found in this view.</Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Upload Media
          <IconButton
            onClick={() => setUploadOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <MediaUploader
              multiple
              onUploadSuccess={() => {
                setUploadOpen(false);
                loadItems();
                fetchStats();
              }}
            />
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MediaLibrary;
