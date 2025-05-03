import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Divider,
  CircularProgress,
  Card,
  CardMedia,
  CardContent,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  Tabs,
  Tab
} from '@mui/material';
import { useSnackbar } from 'notistack';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SaveIcon from '@mui/icons-material/Save';
import apiService from '../services/api';
import { CompanySettings, defaultCompanySettings } from '../types/company';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const CompanySettingsPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { isAdmin, user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<CompanySettings>(defaultCompanySettings);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Load company settings on component mount
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getCompanySettings();
      setSettings(response);
      if (response.logo_url) {
        setLogoPreview(response.logo_url);
      }
    } catch (err) {
      console.error('Error fetching company settings:', err);
      setError('Failed to load company settings');
      // If settings don't exist yet, use defaults
      setSettings(defaultCompanySettings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Handle form input changes

  // Handle tax percentage change
  const handleTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setSettings((prev) => ({
      ...prev,
      tax_percentage: Number(value)
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle numeric input fields
  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Convert to number or use default if empty
    const numValue = value === '' ? 0 : Number(value);
    
    if (!isNaN(numValue)) {
      setSettings((prev) => ({
        ...prev,
        [name]: numValue
      }));
    }
  };

  // Handle logo file selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setLogoFile(file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle logo upload
  const handleLogoUpload = async () => {
    if (!logoFile) return;
    
    try {
      setSaving(true);
      const response = await apiService.uploadCompanyLogo(logoFile);
      
      if (response && response.logo_url) {
        setSettings((prev) => ({
          ...prev,
          logo_url: response.logo_url
        }));
        enqueueSnackbar('Logo uploaded successfully', { variant: 'success' });
      }
    } catch (err) {
      console.error('Error uploading logo:', err);
      enqueueSnackbar('Failed to upload logo', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      const response = await apiService.updateCompanySettings(settings);
      setSettings(response);
      enqueueSnackbar('Company settings saved successfully', { variant: 'success' });
    } catch (err) {
      console.error('Error saving company settings:', err);
      enqueueSnackbar('Failed to save company settings', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Check if user is a superuser for access
  if (!user?.isSuperuser) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">You need superuser privileges to access company settings.</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Company Settings
      </Typography>

      <Box sx={{
        borderBottom: 1,
        borderColor: 'divider',
        mb: 2,
        position: 'sticky',
        top: 0,
        zIndex: 20,
        backgroundColor: 'white',
        p: 1
      }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="company settings tabs"
        >
          <Tab label="Company Information" />
          <Tab label="Logo & Branding" />
          <Tab label="Business Details" />
          <Tab label="Ice Plant Specifics" />
        </Tabs>
      </Box>
      
      <Paper elevation={6} sx={{ p: 3, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        

        <form onSubmit={handleSubmit}>
          <TabPanel value={activeTab} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Company Information
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  name="company_name"
                  value={settings.company_name}
                  onChange={handleChange}
                  required
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Country"
                  name="company_country"
                  value={settings.company_country}
                  onChange={handleChange}
                  required
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address Line 1"
                  name="company_address_line1"
                  value={settings.company_address_line1 || ''}
                  onChange={handleChange}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address Line 2"
                  name="company_address_line2"
                  value={settings.company_address_line2 || ''}
                  onChange={handleChange}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="City"
                  name="company_city"
                  value={settings.company_city || ''}
                  onChange={handleChange}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="State/Province"
                  name="company_state"
                  value={settings.company_state || ''}
                  onChange={handleChange}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Postal Code"
                  name="company_postal_code"
                  value={settings.company_postal_code || ''}
                  onChange={handleChange}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone_number"
                  value={settings.phone_number || ''}
                  onChange={handleChange}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Alternate Phone"
                  name="alternate_phone"
                  value={settings.alternate_phone || ''}
                  onChange={handleChange}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  value={settings.email || ''}
                  onChange={handleChange}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Website"
                  name="website"
                  value={settings.website || ''}
                  onChange={handleChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tax Percentage (%)"
                  name="tax_percentage"
                  type="number"
                  value={settings.tax_percentage ?? 0}
                  onChange={handleTaxChange}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                  helperText="Default tax rate to apply on sales invoices"
                  margin="normal"
                />
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Logo & Branding
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card sx={{ maxWidth: 345, mb: 2 }}>
                  {logoPreview ? (
                    <>
                      {console.log("Logo Preview URL:", logoPreview)}
                      <CardMedia
                        component="img"
                        sx={{ 
                          height: 200, 
                          objectFit: 'contain',
                          bgcolor: '#f5f5f5',
                          border: '1px solid #eee'
                        }}
                        image={logoPreview}
                        alt="Company Logo"
                        onError={(e) => {
                          console.error("Error loading logo image in settings:", e);
                          e.currentTarget.src = '/placeholder-logo.png';
                        }}
                      />
                    </>
                  ) : (
                    <Box 
                      sx={{ 
                        height: 200, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        bgcolor: '#f5f5f5'
                      }}
                    >
                      <Typography color="text.secondary">
                        No logo uploaded
                      </Typography>
                    </Box>
                  )}
                  <CardContent>
                    <Typography gutterBottom variant="subtitle1">
                      Company Logo
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Upload your company logo to display on invoices and the portal header.
                      For best results, use a PNG or SVG file with a transparent background.
                    </Typography>
                  </CardContent>
                </Card>
                
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  sx={{ mr: 2 }}
                >
                  Select Logo
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleLogoChange}
                  />
                </Button>
                
                <Button 
                  variant="contained" 
                  onClick={handleLogoUpload}
                  disabled={!logoFile || saving}
                  startIcon={saving ? <CircularProgress size={20} /> : undefined}
                >
                  Upload Logo
                </Button>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Invoice Footer Text"
                  name="invoice_footer_text"
                  value={settings.invoice_footer_text || ''}
                  onChange={handleChange}
                  margin="normal"
                  multiline
                  rows={4}
                  helperText="This text will appear at the bottom of all printed invoices"
                />
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Business Details
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tax ID / VAT Number"
                  name="tax_id"
                  value={settings.tax_id || ''}
                  onChange={handleChange}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Business Registration Number"
                  name="business_registration"
                  value={settings.business_registration || ''}
                  onChange={handleChange}
                  margin="normal"
                />
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Ice Plant Specific Settings
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel htmlFor="ice-block-weight">Default Ice Block Weight</InputLabel>
                  <OutlinedInput
                    id="ice-block-weight"
                    name="ice_block_weight"
                    type="number"
                    value={settings.ice_block_weight || ''}
                    onChange={handleNumericChange}
                    endAdornment={<InputAdornment position="end">kg</InputAdornment>}
                    label="Default Ice Block Weight"
                  />
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel htmlFor="production-capacity">Production Capacity</InputLabel>
                  <OutlinedInput
                    id="production-capacity"
                    name="production_capacity"
                    type="number"
                    value={settings.production_capacity || ''}
                    onChange={handleNumericChange}
                    endAdornment={<InputAdornment position="end">blocks/day</InputAdornment>}
                    label="Production Capacity"
                  />
                </FormControl>
              </Grid>
            </Grid>
          </TabPanel>

          <Box sx={{ mt: 3, textAlign: 'right' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              disabled={saving}
            >
              Save Settings
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default CompanySettingsPage;