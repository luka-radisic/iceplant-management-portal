import { Container, Typography, Paper, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import MetaHead from '../components/MetaHead';

export default function Inventory() {
  const navigate = useNavigate();
  
  const goToInventoryExample = () => {
    navigate('/inventory-example');
  };
  
  return (
    <>
      <MetaHead 
        title="Inventory - Ice Plant Management Portal"
        description="Manage ice production inventory, stock levels, and product tracking."
        keywords={['ice plant', 'management', 'inventory', 'stock', 'products', 'levels']}
      />
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Inventory Management
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="50vh">
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Inventory Page (Coming Soon)
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={goToInventoryExample}
              sx={{ mt: 2 }}
            >
              View MCP Inventory Example
            </Button>
          </Box>
        </Paper>
      </Container>
    </>
  );
} 