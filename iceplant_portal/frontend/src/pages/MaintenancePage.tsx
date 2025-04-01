import { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Inventory as EquipmentIcon,
  ReceiptLong as RecordsIcon,
  Build as TemplatesIcon,
} from '@mui/icons-material';
import MaintenanceDashboard from '../components/maintenance/MaintenanceDashboard';
import EquipmentList from '../components/maintenance/EquipmentList';
import MaintenanceRecords from '../components/maintenance/MaintenanceRecords';

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
      id={`maintenance-tabpanel-${index}`}
      aria-labelledby={`maintenance-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `maintenance-tab-${index}`,
    'aria-controls': `maintenance-tabpanel-${index}`,
  };
}

export default function MaintenancePage() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Maintenance Management
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Manage your ice plant equipment maintenance schedule, track maintenance records, and monitor equipment health.
      </Typography>
      
      <Paper sx={{ mt: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab 
            icon={<DashboardIcon />} 
            label="Dashboard" 
            {...a11yProps(0)} 
            iconPosition="start"
          />
          <Tab 
            icon={<EquipmentIcon />} 
            label="Equipment" 
            {...a11yProps(1)} 
            iconPosition="start"
          />
          <Tab 
            icon={<RecordsIcon />} 
            label="Maintenance Records" 
            {...a11yProps(2)} 
            iconPosition="start"
          />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <MaintenanceDashboard />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <EquipmentList />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <MaintenanceRecords />
        </TabPanel>
      </Paper>
    </Container>
  );
} 