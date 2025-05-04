import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Container,
  Card,
  CardHeader,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Download as DownloadIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import apiService from '../../services/api';
import { endpoints } from '../../services/endpoints';

interface ModuleGroupMapping {
  [module: string]: string[];
}

const PermissionsOverviewPage: React.FC = () => {
  // No need for snackbar as we use Alert component for notifications
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [moduleMapping, setModuleMapping] = useState<ModuleGroupMapping>({});

  useEffect(() => {
    fetchModuleMapping();
  }, []);
  const fetchModuleMapping = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.get(endpoints.modulePermissions);
      setModuleMapping(response.data);
    } catch (err) {
      console.error('Error fetching module mapping:', err);
      setError('Failed to load permissions data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPermissionsAsJson = () => {
    const dataStr = JSON.stringify(moduleMapping, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'permissions-mapping.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  const downloadPermissionsAsCsv = () => {
    // Convert the module mapping to CSV format
    let csvContent = "Module,Groups\n";
    
    Object.entries(moduleMapping).forEach(([module, groups]) => {
      csvContent += `${module},"${groups.join(', ')}"\n`;
    });
    
    const dataUri = 'data:text/csv;charset=utf-8,'+ encodeURIComponent(csvContent);
    
    const exportFileDefaultName = 'permissions-mapping.csv';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1">
            <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Permissions Overview
          </Typography>
          <Box>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<DownloadIcon />}
              onClick={downloadPermissionsAsJson}
              sx={{ mr: 1 }}
            >
              Export as JSON
            </Button>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<DownloadIcon />}
              onClick={downloadPermissionsAsCsv}
            >
              Export as CSV
            </Button>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <InfoIcon sx={{ mr: 1 }} />
          This page provides an overview of which user groups have access to which modules in the system. 
          This mapping is defined in <code>iceplant_core/group_permissions.py</code>.
        </Alert>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom>
              Module Access by Group
            </Typography>
            
            {/* Module-Centric View */}
            {Object.entries(moduleMapping).map(([module, groups]) => (
              <Accordion key={module} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {module}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" paragraph>
                    The following groups have access to the <strong>{module}</strong> module:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {groups.map(group => (
                      <Chip
                        key={group}
                        label={group}
                        color="primary"
                      />
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}

            <Divider sx={{ my: 4 }} />

            <Typography variant="h6" gutterBottom>
              Group Access by Module
            </Typography>
            
            {/* Group-Centric View */}
            <Grid container spacing={2}>
              {/* Extract unique groups from all modules */}
              {Array.from(
                new Set(
                  Object.values(moduleMapping).flat()
                )
              ).map(group => (
                <Grid item xs={12} md={6} lg={4} key={group}>
                  <Card variant="outlined">
                    <CardHeader 
                      title={group} 
                      titleTypographyProps={{ variant: 'h6' }}
                    />
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Has access to these modules:
                      </Typography>
                      <List dense>
                        {Object.entries(moduleMapping)
                          .filter(([_, groups]) => groups.includes(group))
                          .map(([module]) => (
                            <ListItem key={module}>
                              <ListItemText primary={module} />
                            </ListItem>
                          ))
                        }
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default PermissionsOverviewPage;
