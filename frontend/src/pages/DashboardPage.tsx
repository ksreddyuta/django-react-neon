import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Download as DownloadIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { MapSection } from '../components/dashboard/MapSection';
import { ChartSection } from '../components/dashboard/ChartSection';
import { airQualityService } from '../services/api';
import type { ExportFile } from '../types/airQuality';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [exportFiles, setExportFiles] = useState<ExportFile[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [loadingExports, setLoadingExports] = useState(false);
  
  console.log('DashboardPage rendering, user:', user);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      fetchExportFiles();
    }
  }, [user]);

  const fetchExportFiles = async () => {
    try {
      setLoadingExports(true);
      const files = await airQualityService.getExportedFiles();
      setExportFiles(files);
      console.log('Export files:', files);
    } catch (error) {
      console.error('Failed to fetch export files:', error);
    } finally {
      setLoadingExports(false);
    }
  };

  const handleDownload = async (fileId: number, fileName: string) => {
    try {
      const blob = await airQualityService.downloadExport(fileId);
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Air Quality Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.email}! Monitor air quality across Texas in real-time.
        </Typography>
      </Box>

      {/* Admin Export Button */}
      {(user?.role === 'admin' || user?.role === 'superadmin') && (
        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={() => setExportDialogOpen(true)}
          >
            Manage Exports
          </Button>
        </Box>
      )}

      {/* Main Content Grid */}
      <Grid container spacing={4}>
        {/* Left Column - User Details */}
        <Grid size = {{xs:12, md:4, lg:3}}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20, height: 'fit-content' }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
              User Profile
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'primary.main',
                  mb: 2,
                  fontSize: '2rem',
                }}
              >
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <Typography variant="h6" align="center">
                {user?.email}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                {user?.username || 'Air Quality Analyst'}
              </Typography>
              <Chip 
                label={user?.role === 'superadmin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : 'Standard User'} 
                color={user?.role === 'superadmin' ? 'primary' : user?.role === 'admin' ? 'secondary' : 'default'} 
                size="small" 
                sx={{ mt: 1 }} 
              />
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <EmailIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Email" secondary={user?.email} />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <PersonIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Member Since" secondary="January 15, 2024" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Location" secondary="Corpus Christi, TX" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CalendarIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Last Login" secondary="Today, 10:30 AM" />
              </ListItem>
            </List>
            
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 500 }}>
                Dashboard Usage
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Data Points:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  12,456
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Stations Monitored:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  12
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Right Column - Map and Charts */}
        <Grid size = {{xs:12, md:8, lg:9}}>
          <Grid container spacing={4}>
            {/* Map Section */}
            <Grid size = {{xs:12}}>
              <MapSection 
                onDeviceSelect={setSelectedDevice} 
                selectedDevice={selectedDevice} 
              />
            </Grid>

            {/* Chart Section */}
            <Grid size = {{xs:12}}>
              <ChartSection deviceId={selectedDevice} />
            </Grid>

            {/* Quick Stats */}
            <Grid size = {{xs:12}}>
              <Grid container spacing={3}>
                <Grid size = {{xs:12, sm:6, md:3}}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                    <Typography variant="h4" component="div" gutterBottom>
                      45
                    </Typography>
                    <Typography variant="body2">
                      Good Air Quality Days
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size = {{xs:12, sm:6, md:3}}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                    <Typography variant="h4" component="div" gutterBottom>
                      12
                    </Typography>
                    <Typography variant="body2">
                      Moderate Air Quality Days
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size = {{xs:12, sm:6, md:3}}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
                    <Typography variant="h4" component="div" gutterBottom>
                      3
                    </Typography>
                    <Typography variant="body2">
                      Unhealthy Days
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size = {{xs:12, sm:6, md:3}}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'info.contrastText' }}>
                    <Typography variant="h4" component="div" gutterBottom>
                      24
                    </Typography>
                    <Typography variant="body2">
                      Monitoring Stations
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Export Files Dialog */}
      <Dialog 
        open={exportDialogOpen} 
        onClose={() => setExportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Exported Files</DialogTitle>
        <DialogContent>
          {loadingExports ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>File Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {exportFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>{file.filename}</TableCell>
                      <TableCell>{file.file_type}</TableCell>
                      <TableCell>{(file.size / 1024).toFixed(2)} KB</TableCell>
                      <TableCell>{new Date(file.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <IconButton 
                          onClick={() => handleDownload(file.id, file.filename)}
                          color="primary"
                        >
                          <DownloadIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {exportFiles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No exported files available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};