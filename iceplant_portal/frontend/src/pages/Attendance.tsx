import {
  Box,
  Tab,
  Tabs
} from '@mui/material';
import { useState } from 'react';
import AttendanceImport from '../components/AttendanceImport';
import AttendanceList from '../components/AttendanceList';
import DepartmentShiftSettings from '../components/DepartmentShiftSettings';

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
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="attendance tabs">
          <Tab label="Attendance Records" {...a11yProps(0)} />
          <Tab label="Import Attendance" {...a11yProps(1)} />
          <Tab label="Department Shifts" {...a11yProps(2)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <AttendanceList />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <AttendanceImport />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <DepartmentShiftSettings />
      </TabPanel>
    </Box>
  );
} 