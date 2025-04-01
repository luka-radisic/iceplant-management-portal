import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box, CircularProgress, Card, CardContent, Divider, useTheme, alpha, ToggleButton, ToggleButtonGroup } from '@mui/material';
import {
  BarChart,
  PieChart,
} from '@mui/x-charts';
import {
  People as PeopleIcon,
  ShoppingCart as SalesIcon,
  Inventory as InventoryIcon,
  Receipt as ExpensesIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import apiService, { endpoints } from '../services/api';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';

// Modern stat card with animations and better styling
const StatCard = ({ title, value, icon: Icon, color, subtitle = null, trend = null }: any) => {
  const theme = useTheme();
  
  return (
    <Card 
      sx={{ 
        height: '100%',
        transition: 'transform 0.3s, box-shadow 0.3s',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: theme.shadows[10],
        },
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 2,
      }}
      elevation={3}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 120,
          height: 120,
          borderRadius: '50%',
          backgroundColor: alpha(color, 0.15),
          zIndex: 0,
        }}
      />
      <CardContent sx={{ height: '100%', position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
          <Box sx={{ 
            p: 1, 
            borderRadius: '50%', 
            backgroundColor: alpha(color, 0.1),
            color: color,
            display: 'flex',
          }}>
            <Icon fontSize="small" />
          </Box>
        </Box>
        
        <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1 }}>
          {value}
        </Typography>
        
        {subtitle && (
          <Box display="flex" alignItems="center" mt={1}>
            {trend && (
              <TrendingUpIcon
                fontSize="small"
                sx={{
                  color: trend >= 0 ? 'success.main' : 'error.main',
                  mr: 0.5,
                  transform: trend >= 0 ? 'none' : 'rotate(180deg)',
                }}
              />
            )}
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Chart container component
const ChartContainer = ({ title, children, icon: Icon = null, color = 'primary.main' }) => {
  const theme = useTheme();
  
  return (
    <Card 
      elevation={3} 
      sx={{ 
        height: '100%',
        transition: 'transform 0.3s, box-shadow 0.3s',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: theme.shadows[10],
        },
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: alpha(theme.palette.primary.main, 0.05)
      }}>
        {Icon && (
          <Box 
            sx={{ 
              mr: 1.5, 
              display: 'flex', 
              p: 0.75, 
              borderRadius: 1, 
              backgroundColor: alpha(color, 0.1),
              color: color
            }}
          >
            <Icon fontSize="small" />
          </Box>
        )}
        <Typography variant="h6" fontWeight="medium">
          {title}
        </Typography>
      </Box>
      <CardContent sx={{ p: 2 }}>
        {children}
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState('this_month');
  
  const [dashboardData, setDashboardData] = useState({
    employeesPresent: 0,
    employeesTotal: 0,
    employeesTrend: 0,
    todaySales: 0,
    yesterdaySales: 0,
    salesTrend: 0,
    iceBlocksTotal: 0,
    iceBlocksLow: false,
    monthlyExpenses: 0,
    prevMonthExpenses: 0,
    expensesTrend: 0,
    salesData: [],
    inventoryData: [],
    lowStockItems: [],
  });

  // Fetch dashboard data based on selected time range
  useEffect(() => {
    const fetchDashboardData = async (range: string) => {
      setLoading(true);
      
      // Calculate date range based on selection
      const now = new Date();
      let startDate = '';
      let endDate = '';

      if (range === 'this_month') {
        startDate = format(startOfMonth(now), 'yyyy-MM-dd');
        endDate = format(endOfMonth(now), 'yyyy-MM-dd');
      } else if (range === 'last_month') {
        const lastMonth = subMonths(now, 1);
        startDate = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
        endDate = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
      } else if (range === 'this_year') {
        startDate = format(startOfYear(now), 'yyyy-MM-dd');
        endDate = format(endOfYear(now), 'yyyy-MM-dd');
      }

      // Construct query parameters for date range
      const dateParams = `?start_date=${startDate}&end_date=${endDate}`;

      try {
        const results = await Promise.allSettled([
          apiService.get(`${endpoints.attendanceSummary}${dateParams}`),
          apiService.get(`${endpoints.salesSummary}${dateParams}`),
          apiService.get(endpoints.inventory),
          apiService.get(endpoints.lowStock),
          apiService.get(`${endpoints.expensesTotal}${dateParams}`)
        ]);

        // Create a new dashboard data object to accumulate updates
        let newDashboardData = { ...dashboardData };

        // Process attendance data
        if (results[0].status === 'fulfilled') {
          const attendanceData = results[0].value;
          newDashboardData = {
            ...newDashboardData,
            employeesPresent: attendanceData.present_today || 0, // Assuming API response key
            employeesTotal: attendanceData.total_employees || 0,
            employeesTrend: attendanceData.attendance_trend || 0,
          };
        } else {
          console.log("Attendance summary endpoint not available, using default data");
          newDashboardData = {
            ...newDashboardData,
            employeesPresent: 0,
            employeesTotal: 0,
            employeesTrend: 0,
          };
        }

        // Process sales data
        if (results[1].status === 'fulfilled') {
          const salesSummary = results[1].value;
          const salesTrend = salesSummary.current_total - salesSummary.previous_total;
          const salesTrendPercent = salesSummary.previous_total !== 0 
            ? ((salesTrend / salesSummary.previous_total) * 100).toFixed(1) 
            : 0;
            
          const formattedSalesData = salesSummary.monthly_data ? salesSummary.monthly_data.map(item => ({
            month: item.month,
            amount: item.total,
            color: theme.palette.primary.main,
          })) : [];
          
          newDashboardData = {
            ...newDashboardData,
            todaySales: salesSummary.current_total || 0, // Renamed for clarity based on range
            yesterdaySales: salesSummary.previous_total || 0, // Renamed for clarity
            salesTrend: Number(salesTrendPercent),
            salesData: formattedSalesData,
          };
        }

        // Process inventory data
        if (results[2].status === 'fulfilled') {
          const inventoryData = results[2].value;
          // Extract data from paginated responses if needed
          const inventoryItems = inventoryData.results && Array.isArray(inventoryData.results) 
            ? inventoryData.results 
            : (Array.isArray(inventoryData) ? inventoryData : []);
            
          // Get ice blocks inventory
          const iceBlocksItem = inventoryItems.find(item => 
            (item.item_name.toLowerCase().includes('block') || item.unit.toLowerCase() === 'block')
          );
          
          // Transform inventory data for pie chart
          const topInventoryItems = inventoryItems
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5)
            .map(item => ({
              id: item.id,
              value: item.quantity,
              label: item.item_name,
              color: theme.palette.augmentColor({color: {main: `hsl(${(item.id * 37) % 360}, 80%, 60%)`}}).main,
            }));

          newDashboardData = {
            ...newDashboardData,
            iceBlocksTotal: iceBlocksItem ? iceBlocksItem.quantity : 0,
            iceBlocksLow: iceBlocksItem ? iceBlocksItem.is_low : false,
            inventoryData: topInventoryItems,
          };
        }

        // Process low stock data
        if (results[3].status === 'fulfilled') {
          const response = results[3].value;
          // Handle different response formats and ensure we always have an array
          const lowStockItems = response.results && Array.isArray(response.results) 
            ? response.results 
            : (Array.isArray(response) ? response : []);
          
          newDashboardData = {
            ...newDashboardData,
            lowStockItems: lowStockItems,
          };
        } else {
          // Ensure lowStockItems is always initialized as an array even on error
          newDashboardData = {
            ...newDashboardData,
            lowStockItems: [],
          };
        }

        // Process expenses data
        if (results[4].status === 'fulfilled') {
          const expensesSummary = results[4].value;
          const monthlyTotal = Number(expensesSummary.current_total) || 0; // Renamed for clarity
          const prevMonthTotal = Number(expensesSummary.previous_total) || 0; // Renamed for clarity
          
          const expensesTrend = monthlyTotal - prevMonthTotal;
          let expensesTrendPercent = 0;
          if (prevMonthTotal !== 0) {
            expensesTrendPercent = parseFloat(((expensesTrend / prevMonthTotal) * 100).toFixed(1));
            if (isNaN(expensesTrendPercent)) {
              expensesTrendPercent = 0;
            }
          }
          
          newDashboardData = {
            ...newDashboardData,
            monthlyExpenses: monthlyTotal,
            prevMonthExpenses: prevMonthTotal,
            expensesTrend: expensesTrendPercent,
          };
        }

        // Update state with the accumulated data
        setDashboardData(newDashboardData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        enqueueSnackbar('Error loading dashboard data', { variant: 'error' });
        setLoading(false);
      }
    };

    fetchDashboardData(timeRange); // Call fetch with the current timeRange
  }, [enqueueSnackbar, theme, timeRange]); // Add timeRange to dependency array

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Format numbers for display
  const formatCurrency = (amount) => {
    // Return 0 if amount is null, undefined, or NaN
    if (amount === null || amount === undefined || isNaN(Number(amount))) {
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(0);
    }
    
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Format percentage for display
  const formatTrend = (value) => {
    if (isNaN(value) || value === null || value === undefined) {
      return '0%';
    }
    return value > 0 ? `+${value}%` : `${value}%`;
  };

  // Handler for time range change
  const handleTimeRangeChange = (
    event: React.MouseEvent<HTMLElement>,
    newTimeRange: string | null,
  ) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Dashboard
        </Typography>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={handleTimeRangeChange}
          aria-label="time range"
        >
          <ToggleButton value="this_month" aria-label="this month">
            This Month
          </ToggleButton>
          <ToggleButton value="last_month" aria-label="last month">
            Last Month
          </ToggleButton>
          <ToggleButton value="this_year" aria-label="this year">
            This Year
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Employees Present"
            value={`${dashboardData.employeesPresent} of ${dashboardData.employeesTotal}`}
            trend={dashboardData.employeesTrend}
            trendLabel="vs yesterday"
            icon={PeopleIcon}
            color={theme.palette.info.main}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={timeRange === 'this_month' ? "Today's Sales" : "Period Sales"}
            value={formatCurrency(dashboardData.todaySales)}
            trend={dashboardData.salesTrend}
            trendLabel="vs previous period"
            icon={SalesIcon}
            color={theme.palette.success.main}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Ice Blocks"
            value={dashboardData.iceBlocksTotal}
            icon={InventoryIcon}
            color={dashboardData.iceBlocksLow ? theme.palette.warning.main : theme.palette.success.main}
            subtitle={dashboardData.iceBlocksLow ? "Low stock warning" : "Stock level good"}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={timeRange === 'this_month' ? "Monthly Expenses" : "Period Expenses"}
            value={formatCurrency(dashboardData.monthlyExpenses)}
            trend={dashboardData.expensesTrend}
            trendLabel="vs previous period"
            icon={ExpensesIcon}
            color={theme.palette.error.main}
          />
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={8}>
          <ChartContainer title="Monthly Sales" icon={CalendarIcon} color={theme.palette.info.main}>
            {Array.isArray(dashboardData.salesData) && dashboardData.salesData.length > 0 ? (
              <BarChart
                xAxis={[{ 
                  scaleType: 'band', 
                  data: dashboardData.salesData.map(d => d.month),
                  tickLabelStyle: {
                    fontSize: 12,
                  },
                }]}
                series={[{ 
                  data: dashboardData.salesData.map(d => d.amount),
                  color: theme.palette.primary.main,
                  label: 'Sales',
                }]}
                height={300}
                margin={{ top: 10, bottom: 30, left: 40, right: 10 }}
                slotProps={{
                  bar: {
                    style: { 
                      fill: theme.palette.primary.main,
                      strokeWidth: 1,
                      rx: 4, // Rounded corners
                    },
                  },
                }}
              />
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <Typography color="text.secondary">No sales data available</Typography>
              </Box>
            )}
          </ChartContainer>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <ChartContainer title="Inventory Distribution" icon={InventoryIcon} color={theme.palette.success.main}>
            {Array.isArray(dashboardData.inventoryData) && dashboardData.inventoryData.length > 0 ? (
              <PieChart
                series={[
                  {
                    data: dashboardData.inventoryData,
                    highlightScope: { faded: 'global', highlighted: 'item' },
                    innerRadius: 40,
                    paddingAngle: 2,
                    cornerRadius: 4,
                    startAngle: -90,
                    endAngle: 270,
                  },
                ]}
                height={300}
                tooltip={{ trigger: 'item' }}
                slotProps={{
                  legend: {
                    hidden: true, // Hide legend to save space
                  },
                }}
              />
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <Typography color="text.secondary">No inventory data available</Typography>
              </Box>
            )}
          </ChartContainer>
        </Grid>
        
        {/* Low Stock Items */}
        <Grid item xs={12}>
          <ChartContainer title="Low Stock Items" icon={WarningIcon} color={theme.palette.warning.main}>
            {Array.isArray(dashboardData.lowStockItems) && dashboardData.lowStockItems.length > 0 ? (
              <Grid container spacing={2}>
                {dashboardData.lowStockItems.map((item) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                    <Card sx={{ 
                      backgroundColor: alpha(theme.palette.warning.light, 0.1), 
                      border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                      height: '100%', 
                    }}>
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="medium" noWrap>
                          {item.item_name}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Current: {item.quantity} {item.unit}
                          </Typography>
                          <Typography variant="body2" color="warning.main">
                            Min: {item.minimum_level}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography color="success.main" sx={{ fontWeight: 'medium' }}>
                  All inventory items are above minimum levels
                </Typography>
              </Box>
            )}
          </ChartContainer>
        </Grid>
      </Grid>
    </Box>
  );
} 