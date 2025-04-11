import {
  Box,
  Tab,
  Tabs
} from '@mui/material';
import { useState } from 'react';
import AttendanceImport from '../components/AttendanceImport';
import AttendanceList from '../components/AttendanceList';

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
      id={`attendance-tabpanel-${index}`}
      aria-labelledby={`attendance-tab-${index}`}
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

function a11yProps(index: number) {
  return {
    id: `attendance-tab-${index}`,
    'aria-controls': `attendance-tabpanel-${index}`,
  };
}

export default function Attendance() {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', margin: '0 auto' }}>
      <Box sx={{
        borderBottom: 1,
        borderColor: 'divider',
        position: 'sticky',
        top: 0,
        zIndex: 1,
        backgroundColor: 'white'
      }}>
        <Tabs value={value} onChange={handleChange} aria-label="attendance tabs">
          <Tab label="Attendance Records" {...a11yProps(0)} />
          <Tab label="Import Attendance" {...a11yProps(1)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <AttendanceList />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <AttendanceImport />
      </TabPanel>
    </Box>
  );
} 