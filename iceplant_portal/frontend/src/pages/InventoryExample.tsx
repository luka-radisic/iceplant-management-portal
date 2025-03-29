import { useEffect, useState } from 'react';
import { useInventoryStore } from '../mcp/providers/InventoryProvider';
import { 
  Box, 
  Button, 
  Card, 
  CircularProgress, 
  Container, 
  FormControl, 
  Grid, 
  InputLabel, 
  MenuItem, 
  Select, 
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';

export default function InventoryExample() {
  const { 
    items, 
    isLoading, 
    error, 
    categories,
    filterCategory,
    lowStockItems,
    isLoadingLowStock,
    fetchAll,
    fetchCategories,
    fetchLowStockItems,
    setFilterCategory,
    updateStockQuantity
  } = useInventoryStore();

  // Local state for quantity updates
  const [updating, setUpdating] = useState<Record<string | number, boolean>>({});

  useEffect(() => {
    // Load initial data
    fetchAll();
    fetchCategories();
    fetchLowStockItems();
  }, [fetchAll, fetchCategories, fetchLowStockItems]);

  // Handle category filter change
  const handleCategoryChange = (event: any) => {
    setFilterCategory(event.target.value);
  };

  // Handle stock quantity update
  const handleUpdateStock = async (id: string | number, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    setUpdating(prev => ({ ...prev, [id]: true }));
    try {
      await updateStockQuantity(id, newQuantity);
    } finally {
      setUpdating(prev => ({ ...prev, [id]: false }));
    }
  };

  // Filter items by category if filter is set
  const filteredItems = filterCategory 
    ? items.filter(item => item.category === filterCategory) 
    : items;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Inventory Management
      </Typography>

      {/* Category Filter */}
      <Box sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="category-filter-label">Filter by Category</InputLabel>
          <Select
            labelId="category-filter-label"
            value={filterCategory || ''}
            onChange={handleCategoryChange}
            label="Filter by Category"
          >
            <MenuItem value="">
              <em>All Categories</em>
            </MenuItem>
            {categories.map(category => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Main Inventory List */}
      <Typography variant="h5" gutterBottom>
        Inventory Items
      </Typography>
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ my: 2 }}>
          <Typography color="error">{error}</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => fetchAll()}
            sx={{ mt: 1 }}
          >
            Retry
          </Button>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Unit Price</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No inventory items found
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">${item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => handleUpdateStock(item.id, item.quantity + 1)}
                        disabled={updating[item.id]}
                      >
                        {updating[item.id] ? <CircularProgress size={24} /> : '+'}
                      </Button>
                      <Button
                        size="small"
                        onClick={() => handleUpdateStock(item.id, item.quantity - 1)}
                        disabled={updating[item.id] || item.quantity <= 0}
                      >
                        {updating[item.id] ? <CircularProgress size={24} /> : '-'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Low Stock Warning Section */}
      <Typography variant="h5" gutterBottom sx={{ color: 'error.main' }}>
        Low Stock Items
      </Typography>
      
      {isLoadingLowStock ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {lowStockItems.length === 0 ? (
            <Grid item xs={12}>
              <Typography>No low stock items at this time.</Typography>
            </Grid>
          ) : (
            lowStockItems.map(item => (
              <Grid item xs={12} md={6} lg={4} key={item.id}>
                <Card sx={{ p: 2, backgroundColor: 'error.light' }}>
                  <Typography variant="h6">{item.name}</Typography>
                  <Typography variant="body1">
                    Current Stock: {item.quantity}
                  </Typography>
                  <Typography variant="body2">
                    Minimum Level: {item.minStockLevel}
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    sx={{ mt: 1 }}
                    onClick={() => handleUpdateStock(item.id, item.quantity + 10)}
                    disabled={updating[item.id]}
                  >
                    {updating[item.id] ? <CircularProgress size={24} /> : 'Restock (+10)'}
                  </Button>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* Refresh Button */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => {
            fetchAll();
            fetchLowStockItems();
          }}
          disabled={isLoading || isLoadingLowStock}
        >
          {(isLoading || isLoadingLowStock) ? <CircularProgress size={24} /> : 'Refresh Data'}
        </Button>
      </Box>
    </Container>
  );
} 