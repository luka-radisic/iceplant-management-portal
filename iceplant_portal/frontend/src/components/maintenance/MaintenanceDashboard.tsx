import { useState, useEffect } from 'react';
import {
  Grid, Paper, Typography, Box, Card, CardContent, 
  Divider, List, ListItem, ListItemText, Chip, 
  CircularProgress, Stack
} from '@mui/material';
import {
  BuildOutlined as MaintenanceIcon,
  CheckCircleOutline as OperationalIcon,
  WarningAmber as RequiresMaintenanceIcon,
  Engineering as UnderMaintenanceIcon,
  Cancel as NotOperationalIcon,
  CalendarMonth as ScheduledIcon,
  ErrorOutline as EmergencyIcon,
  ConstructionOutlined as PreventiveIcon,
  BuildCircle as CorrectiveIcon,
} from '@mui/icons-material';
import { apiService, endpoints } from '../../services/api';
import { MaintenanceItem, MaintenanceRecord } from '../../types/api';
import { formatCurrency } from '../../utils/formatters';
import { sampleMaintenanceDashboard } from '../../data/sampleMaintenanceData';

interface MaintenanceDashboardProps {
  // Add props if needed in the future
}

interface DashboardData {
  totalEquipment: number;
  equipmentByStatus: {
    operational: number;
    requires_maintenance: number;
    under_maintenance: number;
    not_operational: number;
  };
  upcomingMaintenance: MaintenanceItem[];
  recentMaintenance: MaintenanceRecord[];
  totalMaintenanceCost: number;
  averageMaintenanceDuration: number;
  maintenanceByType: {
    scheduled: number;
    emergency: number;
    preventive: number;
    corrective: number;
  };
}

const MaintenanceDashboard: React.FC<MaintenanceDashboardProps> = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // In a real implementation, we would fetch from the API
        // const data = await apiService.get(endpoints.maintenanceDashboard);
        
        // Using sample data for now
        // This would be replaced with actual API call when backend is ready
        setDashboardData(sampleMaintenanceDashboard as DashboardData);
      } catch (err) {
        console.error('Error fetching maintenance dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', m: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ m: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!dashboardData) {
    return (
      <Box sx={{ m: 3 }}>
        <Typography>No dashboard data available</Typography>
      </Box>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <OperationalIcon color="success" />;
      case 'requires_maintenance':
        return <RequiresMaintenanceIcon color="warning" />;
      case 'under_maintenance':
        return <UnderMaintenanceIcon color="info" />;
      case 'not_operational':
        return <NotOperationalIcon color="error" />;
      default:
        return <MaintenanceIcon />;
    }
  };

  const getMaintenanceTypeIcon = (type: string) => {
    switch (type) {
      case 'scheduled':
        return <ScheduledIcon color="primary" />;
      case 'emergency':
        return <EmergencyIcon color="error" />;
      case 'preventive':
        return <PreventiveIcon color="success" />;
      case 'corrective':
        return <CorrectiveIcon color="warning" />;
      default:
        return <MaintenanceIcon />;
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'requires_maintenance':
        return 'Requires Maintenance';
      case 'under_maintenance':
        return 'Under Maintenance';
      case 'not_operational':
        return 'Not Operational';
      default:
        return status;
    }
  };

  const getMaintenanceTypeText = (type: string): string => {
    switch (type) {
      case 'scheduled':
        return 'Scheduled';
      case 'emergency':
        return 'Emergency';
      case 'preventive':
        return 'Preventive';
      case 'corrective':
        return 'Corrective';
      default:
        return type;
    }
  };

  return (
    <Box sx={{ flexGrow: 1, mt: 2 }}>
      <Grid container spacing={2}>
        {/* Equipment Status Summary */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Equipment Status
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h4" align="center">
                      {dashboardData.totalEquipment}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Total Equipment
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h4" align="center">
                      {formatCurrency(dashboardData.totalMaintenanceCost)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Total Maintenance Cost
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <OperationalIcon color="success" />
                  <Typography variant="body2">
                    Operational: {dashboardData.equipmentByStatus.operational}
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={6}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <RequiresMaintenanceIcon color="warning" />
                  <Typography variant="body2">
                    Requires Maintenance: {dashboardData.equipmentByStatus.requires_maintenance}
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={6}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <UnderMaintenanceIcon color="info" />
                  <Typography variant="body2">
                    Under Maintenance: {dashboardData.equipmentByStatus.under_maintenance}
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={6}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <NotOperationalIcon color="error" />
                  <Typography variant="body2">
                    Not Operational: {dashboardData.equipmentByStatus.not_operational}
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Maintenance Type Summary */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Maintenance Type Summary
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h4" align="center">
                      {dashboardData.averageMaintenanceDuration.toFixed(1)}h
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Average Maintenance Duration
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h4" align="center">
                      {Object.values(dashboardData.maintenanceByType).reduce((a, b) => a + b, 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Total Maintenance Records
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <ScheduledIcon color="primary" />
                  <Typography variant="body2">
                    Scheduled: {dashboardData.maintenanceByType.scheduled}
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={6}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <EmergencyIcon color="error" />
                  <Typography variant="body2">
                    Emergency: {dashboardData.maintenanceByType.emergency}
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={6}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <PreventiveIcon color="success" />
                  <Typography variant="body2">
                    Preventive: {dashboardData.maintenanceByType.preventive}
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={6}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CorrectiveIcon color="warning" />
                  <Typography variant="body2">
                    Corrective: {dashboardData.maintenanceByType.corrective}
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Upcoming Maintenance */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Upcoming Maintenance
            </Typography>
            {dashboardData.upcomingMaintenance.length > 0 ? (
              <List>
                {dashboardData.upcomingMaintenance.map((item) => (
                  <ListItem key={item.id} divider>
                    <ListItemText
                      primary={item.equipment_name}
                      secondary={
                        <>
                          <Typography variant="body2" component="span">
                            {`Next Maintenance: ${new Date(item.next_maintenance_date).toLocaleDateString()}`}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            {getStatusIcon(item.status)}
                            <Chip 
                              size="small" 
                              label={getStatusText(item.status)} 
                              sx={{ ml: 1 }}
                            />
                          </Box>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" sx={{ mt: 2 }}>
                No upcoming maintenance scheduled
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Recent Maintenance */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Recent Maintenance
            </Typography>
            {dashboardData.recentMaintenance.length > 0 ? (
              <List>
                {dashboardData.recentMaintenance.map((record) => (
                  <ListItem key={record.id} divider>
                    <ListItemText
                      primary={record.equipment_name}
                      secondary={
                        <>
                          <Typography variant="body2" component="span">
                            {`Date: ${new Date(record.maintenance_date).toLocaleDateString()} - ${record.duration} hours`}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            {getMaintenanceTypeIcon(record.maintenance_type)}
                            <Chip 
                              size="small" 
                              label={getMaintenanceTypeText(record.maintenance_type)} 
                              sx={{ ml: 1 }}
                            />
                          </Box>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" sx={{ mt: 2 }}>
                No recent maintenance records
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MaintenanceDashboard; 