import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box, CircularProgress } from '@mui/material';
import {
  BarChart,
  PieChart,
} from '@mui/x-charts';
import {
  People as PeopleIcon,
  ShoppingCart as SalesIcon,
  Inventory as InventoryIcon,
  Receipt as ExpensesIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import apiService, { endpoints } from '../services/api';

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <Paper
    sx={{
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      height: 140,
      bgcolor: color,
      color: 'white',
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography component="h2" variant="h6">
        {title}
      </Typography>
      <Icon />
    </Box>
    <Typography component="p" variant="h4" sx={{ mt: 2 }}>
      {value}
    </Typography>
  </Paper>
);

export default function Dashboard() {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    employeesPresent: 0,
    todaySales: 0,
    iceBlocks: 0,
    monthlyExpenses: 0,
    salesData: [],
    inventoryData: [],
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          attendanceData,
          salesSummary,
          inventoryStatusResponse,
          expensesSummary
        ] = await Promise.all([
          apiService.get(endpoints.attendance),
          apiService.get(endpoints.salesSummary),
          apiService.get(endpoints.lowStock),
          apiService.get(endpoints.expensesSummary),
        ]);

        // Extract inventory data from paginated response if needed
        const inventoryStatus = inventoryStatusResponse.results && Array.isArray(inventoryStatusResponse.results) 
          ? inventoryStatusResponse.results 
          : (Array.isArray(inventoryStatusResponse) ? inventoryStatusResponse : []);

        // Get ice blocks from inventory or default to 0
        const iceBlocksItem = inventoryStatus.find((item: any) => item.item_name === 'Ice Blocks');
        const iceBlocksQuantity = iceBlocksItem ? iceBlocksItem.quantity : 0;

        setDashboardData({
          employeesPresent: attendanceData.today_count || 0,
          todaySales: salesSummary.today_total || 0,
          iceBlocks: iceBlocksQuantity,
          monthlyExpenses: expensesSummary.monthly_total || 0,
          salesData: salesSummary.monthly_data || [],
          inventoryData: inventoryStatus.map((item: any) => ({
            id: item.id,
            value: item.quantity,
            label: item.item_name,
          })) || [],
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        enqueueSnackbar('Error loading dashboard data', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [enqueueSnackbar]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} md={3}>
          <StatCard
            title="Employees Present"
            value={dashboardData.employeesPresent}
            icon={PeopleIcon}
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Today's Sales"
            value={`₱${dashboardData.todaySales.toLocaleString()}`}
            icon={SalesIcon}
            color="#00acc1"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Ice Blocks"
            value={dashboardData.iceBlocks}
            icon={InventoryIcon}
            color="#43a047"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Monthly Expenses"
            value={`₱${dashboardData.monthlyExpenses.toLocaleString()}`}
            icon={ExpensesIcon}
            color="#e53935"
          />
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Monthly Sales
            </Typography>
            {dashboardData.salesData.length > 0 ? (
              <BarChart
                xAxis={[{ 
                  scaleType: 'band', 
                  data: dashboardData.salesData.map(d => d.month) 
                }]}
                series={[{ 
                  data: dashboardData.salesData.map(d => d.amount) 
                }]}
                height={300}
              />
            ) : (
              <Typography color="text.secondary">No sales data available</Typography>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Inventory Distribution
            </Typography>
            {dashboardData.inventoryData.length > 0 ? (
              <PieChart
                series={[
                  {
                    data: dashboardData.inventoryData,
                    highlightScope: { faded: 'global', highlighted: 'item' },
                  },
                ]}
                height={300}
              />
            ) : (
              <Typography color="text.secondary">No inventory data available</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
} 